import type { NextApiRequest, NextApiResponse } from "next";
import { orionLoop } from "@/lib/orion/loop";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.MERSE_ADMIN_KEY) {
    return res.status(500).json({ error: "MERSE_ADMIN_KEY não configurada." });
  }

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.MERSE_ADMIN_KEY}`) {
    return res.status(401).json({ error: "Admin key inválida ou ausente." });
  }

  const { projectId } = req.query;
  const pid = typeof projectId === "string" ? projectId : req.body?.projectId;
  if (!pid || typeof pid !== "string") {
    return res.status(400).json({ error: "projectId é obrigatório." });
  }

  try {
    const result = await orionLoop(pid);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[orion/start] erro:", error);
    const message = error instanceof Error ? error.message : "Falha ao iniciar Orion.";
    return res.status(500).json({ error: message });
  }
}
