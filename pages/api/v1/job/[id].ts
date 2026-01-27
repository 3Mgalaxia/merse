import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireApiKey } from "@/server/auth/requireApiKey";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const caller = await requireApiKey(req, res);
  if (!caller) return;

  const jobId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (typeof jobId !== "string" || !jobId.trim()) {
    return res.status(400).json({ error: "Job id inválido." });
  }

  const snap = await adminDb.collection("jobs").doc(jobId).get();
  if (!snap.exists) {
    return res.status(404).json({ error: "Job não encontrado." });
  }

  const data = snap.data() ?? {};

  // autorização básica por keyId
  if (data.keyId && data.keyId !== caller.keyId) {
    return res.status(403).json({ error: "Acesso negado para este job." });
  }

  const toIso = (value: any) => {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return null;
  };

  return res.status(200).json({
    id: jobId,
    type: data.type ?? null,
    status: data.status ?? null,
    result: data.result ?? null,
    error: data.error ?? null,
    creditsUsed: data.creditsUsed ?? null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  });
}
