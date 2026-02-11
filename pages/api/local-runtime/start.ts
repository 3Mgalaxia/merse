import type { NextApiRequest, NextApiResponse } from "next";

import {
  createRuntimeSession,
  sanitizeRelativePath,
  type RuntimeFilePayload,
} from "@/lib/local-runtime/store";

type SuccessResponse = {
  sessionId: string;
  stage: string;
  url: string;
  port: number;
};

type ErrorResponse = {
  error: string;
};

const MAX_FILES = 2500;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "120mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const projectName =
    typeof req.body?.projectName === "string" && req.body.projectName.trim()
      ? req.body.projectName.trim()
      : "Projeto Local";

  const payloadFiles = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!payloadFiles.length) {
    return res.status(400).json({ error: "Nenhum arquivo enviado para iniciar o runtime." });
  }

  if (payloadFiles.length > MAX_FILES) {
    return res.status(400).json({
      error: `Projeto muito grande para upload único (máximo ${MAX_FILES} arquivos).`,
    });
  }

  const files: RuntimeFilePayload[] = [];

  for (const item of payloadFiles) {
    if (!item || typeof item !== "object") continue;

    const rawPath = typeof (item as { path?: unknown }).path === "string" ? (item as { path: string }).path : "";
    const contentBase64 =
      typeof (item as { contentBase64?: unknown }).contentBase64 === "string"
        ? (item as { contentBase64: string }).contentBase64
        : "";

    if (!rawPath || !contentBase64) continue;

    const safePath = sanitizeRelativePath(rawPath);
    if (!safePath) continue;

    files.push({ path: safePath, contentBase64 });
  }

  if (!files.length) {
    return res.status(400).json({ error: "Arquivos inválidos após sanitização." });
  }

  try {
    const session = await createRuntimeSession(projectName, files);
    return res.status(202).json({
      sessionId: session.id,
      stage: session.stage,
      url: session.url,
      port: session.port,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao iniciar runtime local.";
    return res.status(500).json({ error: message });
  }
}
