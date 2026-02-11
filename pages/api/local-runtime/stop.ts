import type { NextApiRequest, NextApiResponse } from "next";

import { stopRuntimeSession } from "@/lib/local-runtime/store";

type SuccessResponse = {
  ok: true;
  sessionId: string;
  stage: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId é obrigatório." });
  }

  const session = await stopRuntimeSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada." });
  }

  return res.status(200).json({
    ok: true,
    sessionId: session.id,
    stage: session.stage,
  });
}
