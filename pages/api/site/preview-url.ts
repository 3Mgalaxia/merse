import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  const pid = Array.isArray(projectId) ? projectId[0] : projectId;

  if (!pid) return res.status(400).json({ error: "projectId é obrigatório" });

  const projectRef = adminDb.collection("site_projects").doc(pid as string);
  const snap = await projectRef.get();
  if (!snap.exists) return res.status(404).json({ error: "Projeto não encontrado" });

  const previewUrl = `/sandbox/preview?projectId=${pid}`;

  return res.status(200).json({ previewUrl });
}
