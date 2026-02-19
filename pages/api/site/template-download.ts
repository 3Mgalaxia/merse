import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs";
import path from "node:path";

const TEMPLATE_ZIP_ROOT = path.join("/tmp", "merse-site-ia-template-zips");
const RUN_ID_PATTERN = /^[0-9a-f-]{16,64}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const runId = typeof req.query.runId === "string" ? req.query.runId.trim() : "";
  if (!runId || !RUN_ID_PATTERN.test(runId)) {
    return res.status(400).json({ error: "runId inválido." });
  }

  const zipPath = path.join(TEMPLATE_ZIP_ROOT, `${runId}.zip`);
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: "Arquivo do projeto não encontrado." });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="merse-template-${runId}.zip"`);
  const stream = fs.createReadStream(zipPath);
  stream.pipe(res);
}
