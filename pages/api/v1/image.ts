import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireApiKey } from "@/server/auth/requireApiKey";
import { enforceRateLimit } from "@/server/rateLimit/enforceRateLimit";
import { generateImageFromPayload } from "../generate-image";
import { consumeCredits } from "@/server/credits/consumeCredits";
import { assignRequestId } from "@/server/logging/requestId";
import { logStructured } from "@/server/logging/logStructured";

const MAX_PROMPT_LENGTH = 1200;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requestId = assignRequestId(res);
  const startedAt = Date.now();

  const caller = await requireApiKey(req, res);
  if (!caller) return;

  const limited = await enforceRateLimit({ req, res, caller, resource: "image" });
  if (limited) return;

  if (!req.headers["content-type"]?.toString().includes("application/json")) {
    return res.status(415).json({ error: "Content-Type deve ser application/json." });
  }

  const { prompt, provider = "openai", aspectRatio, stylization, count = 1, referenceImage } = req.body ?? {};

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Forneça uma descrição válida para gerar a imagem." });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(413).json({ error: "Prompt muito grande. Limite de 1200 caracteres." });
  }

  const providerKey = typeof provider === "string" ? provider.trim().toLowerCase() : "openai";
  const normalizedProvider =
    providerKey === "merse" ? "merse" : providerKey === "flux" ? "flux" : "openai";

  const jobRef = adminDb.collection("jobs").doc();
  const baseJob = {
    type: "image" as const,
    status: "queued" as const,
    userId: caller.userId ?? null,
    keyId: caller.keyId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    creditsUsed: null,
    result: null,
    error: null,
    requestId,
  };

  await jobRef.set(baseJob);

  // tenta debitar créditos antes de gerar
  try {
    await consumeCredits({
      userId: caller.userId ?? null,
      product: "image",
      amount: 1,
      metadata: {
        keyId: caller.keyId,
        apiKeyMask: caller.apiKeyMask,
        requestId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Saldo insuficiente.";
    await jobRef.set(
      { status: "failed", error: message, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    logStructured({
      level: "warn",
      event: "credits.denied",
      requestId,
      jobId: jobRef.id,
      userId: caller.userId ?? null,
      keyId: caller.keyId,
      apiKeyMask: caller.apiKeyMask,
      message,
    });
    return res.status(402).json({ error: message, requestId, jobId: jobRef.id });
  }

  // responde rápido
  res.status(202).json({ jobId: jobRef.id, status: "queued", requestId });

  // processa em background (best effort)
  void (async () => {
    try {
      await jobRef.set(
        {
          status: "processing",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const result = await generateImageFromPayload({
        prompt,
        provider: normalizedProvider,
        aspectRatio,
        stylization,
        count,
        referenceImage,
      });

      await jobRef.set(
        {
          status: "completed",
          updatedAt: FieldValue.serverTimestamp(),
          result: { imageUrl: result.imageUrl, images: result.images, seeds: result.seeds },
          creditsUsed: result.creditsUsed ?? 1,
          requestId,
        },
        { merge: true },
      );
      logStructured({
        level: "info",
        event: "image.completed",
        requestId,
        jobId: jobRef.id,
        userId: caller.userId ?? null,
        keyId: caller.keyId,
        apiKeyMask: caller.apiKeyMask,
        durationMs: Date.now() - startedAt,
        provider: normalizedProvider,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gerar a imagem.";
      await jobRef.set(
        { status: "failed", updatedAt: FieldValue.serverTimestamp(), error: message, requestId },
        { merge: true },
      );
      logStructured({
        level: "error",
        event: "image.failed",
        requestId,
        jobId: jobRef.id,
        userId: caller.userId ?? null,
        keyId: caller.keyId,
        apiKeyMask: caller.apiKeyMask,
        durationMs: Date.now() - startedAt,
        error: message,
      });
    }
  })();
}
