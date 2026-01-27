import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : null;
  if (!projectId) return res.status(400).json({ error: "projectId é obrigatório" });

  const zipPath = path.join("/tmp", "merse-projects", `${projectId}.zip`);
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: "Arquivo não encontrado." });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${projectId}.zip"`);
  const stream = fs.createReadStream(zipPath);
  stream.pipe(res);
}
