import type { NextApiRequest, NextApiResponse } from "next";

import { applyRateLimit } from "@/lib/rateLimit";
import { logApiAction } from "@/lib/logger";

type SuccessResponse = {
  taskId: string;
  message?: string;
  raw?: unknown;
};

type ErrorResponse = {
  error: string;
  details?: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  const startedAt = Date.now();
  const userIdHeader = Array.isArray(req.headers["x-merse-uid"])
    ? req.headers["x-merse-uid"][0]
    : req.headers["x-merse-uid"];
  const userId = typeof userIdHeader === "string" && userIdHeader.length > 0 ? userIdHeader : undefined;
  const clientIp =
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]) ||
    req.socket.remoteAddress ||
    "unknown";

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const rateResult = applyRateLimit(`meshy-create:${userId ?? clientIp}`, 6, 60_000);
  if (!rateResult.allowed) {
    await logApiAction({
      action: "meshy-create",
      userId,
      status: 429,
      durationMs: Date.now() - startedAt,
      metadata: { reason: "rate_limited" },
    });
    return res.status(429).json({
      error: "Muitas requisições para o 3D. Aguarde alguns instantes.",
      details: { retryAfter: rateResult.retryAfter },
    });
  }

  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Configure MESHY_API_KEY no ambiente." });
  }

  const { prompt, artStyle = "realistic", negativePrompt = "" } = req.body ?? {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Envie um prompt textual para gerar o modelo 3D." });
  }

  try {
    const response = await fetch("https://api.meshy.ai/v2/text-to-3d", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        mode: "text-to-3d",
        prompt,
        negative_prompt: negativePrompt,
        art_style: artStyle,
        topology: "mid",
        texture_limit: 2048,
        output_format: "glb",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.message ?? "Falha ao solicitar modelo 3D na Meshy.",
        details: data,
      });
    }

    const taskId = data?.task_id ?? data?.taskId ?? data?.id;
    if (!taskId) {
      return res.status(500).json({
        error: "Resposta da Meshy não contém task_id.",
        details: data,
      });
    }

    const payload = {
      taskId,
      message: "Modelo 3D em processamento.",
      raw: data,
    };

    await logApiAction({
      action: "meshy-create",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: { taskId },
    });

    return res.status(200).json(payload);
  } catch (error) {
    await logApiAction({
      action: "meshy-create",
      userId,
      status: 500,
      durationMs: Date.now() - startedAt,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
    return res.status(500).json({
      error: "Erro inesperado ao conversar com a Meshy.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
