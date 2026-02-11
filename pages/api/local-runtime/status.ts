import type { NextApiRequest, NextApiResponse } from "next";

import { getRuntimeSession } from "@/lib/local-runtime/store";

type SuccessResponse = {
  sessionId: string;
  projectName: string;
  stage: string;
  url: string;
  port: number;
  fileCount: number;
  logs: string[];
  error: string | null;
  startedAt: number;
  updatedAt: number;
};

type ErrorResponse = {
  error: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : "";
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId é obrigatório." });
  }

  const session = getRuntimeSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada." });
  }

  return res.status(200).json({
    sessionId: session.id,
    projectName: session.projectName,
    stage: session.stage,
    url: session.url,
    port: session.port,
    fileCount: session.fileCount,
    logs: session.logs.slice(-180),
    error: session.error,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
  });
}
