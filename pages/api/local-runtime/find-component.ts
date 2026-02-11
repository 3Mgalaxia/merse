import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs/promises";
import path from "node:path";

import { getRuntimeSession, setRuntimeComponentHint } from "@/lib/local-runtime/store";

type SuccessResponse = {
  componentName: string;
  files: string[];
};

type ErrorResponse = {
  error: string;
};

const IGNORED_DIRS = new Set(["node_modules", ".next", ".git", ".turbo", "dist", "build"]);
const ALLOWED_EXT = new Set([".tsx", ".jsx", ".ts", ".js"]);
const MAX_FILES_TO_SCAN = 1200;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function walkCodeFiles(rootDir: string, currentRelative = ""): Promise<string[]> {
  const absoluteDir = path.join(rootDir, currentRelative);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const collected: string[] = [];

  for (const entry of entries) {
    if (collected.length >= MAX_FILES_TO_SCAN) break;

    const relPath = path.posix.join(currentRelative, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const nested = await walkCodeFiles(rootDir, relPath);
      collected.push(...nested);
      if (collected.length >= MAX_FILES_TO_SCAN) break;
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;
    collected.push(relPath);
  }

  return collected;
}

function scoreFile(componentName: string, filePath: string, source: string) {
  const normalizedName = componentName.toLowerCase();
  const normalizedPath = filePath.toLowerCase();
  const normalizedSource = source.toLowerCase();
  const safeName = escapeRegExp(componentName);

  let score = 0;

  if (normalizedPath.endsWith(`/${normalizedName}.tsx`) || normalizedPath.endsWith(`/${normalizedName}.jsx`)) {
    score += 220;
  }

  if (normalizedPath.includes(normalizedName)) {
    score += 70;
  }

  if (new RegExp(`\\bfunction\\s+${safeName}\\b`).test(source)) {
    score += 160;
  }

  if (new RegExp(`\\bconst\\s+${safeName}\\b`).test(source)) {
    score += 120;
  }

  if (new RegExp(`<${safeName}[\\s>]`).test(source)) {
    score += 90;
  }

  if (normalizedSource.includes(normalizedName)) {
    score += 30;
  }

  return score;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
  const componentName = typeof req.body?.componentName === "string" ? req.body.componentName.trim() : "";

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId é obrigatório." });
  }

  if (!componentName) {
    return res.status(400).json({ error: "componentName é obrigatório." });
  }

  const session = getRuntimeSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada." });
  }

  try {
    const files = await walkCodeFiles(session.rootDir);
    const scored: Array<{ filePath: string; score: number }> = [];

    for (const filePath of files) {
      const absolutePath = path.join(session.rootDir, filePath);
      const source = await fs.readFile(absolutePath, "utf-8").catch(() => "");
      if (!source) continue;
      const score = scoreFile(componentName, filePath, source.slice(0, 36000));
      if (score <= 0) continue;
      scored.push({ filePath, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const topFiles = scored.slice(0, 12).map((entry) => entry.filePath);

    if (topFiles[0]) {
      setRuntimeComponentHint(sessionId, componentName, topFiles[0]);
    }

    console.log(`[local-runtime] componente selecionado: ${componentName}`);
    if (topFiles.length) {
      console.log(`[local-runtime] candidatos: ${topFiles.join(", ")}`);
    } else {
      console.log("[local-runtime] nenhum arquivo candidato encontrado para o componente.");
    }

    return res.status(200).json({
      componentName,
      files: topFiles,
    });
  } catch (error) {
    console.error("[local-runtime/find-component] erro:", error);
    const message = error instanceof Error ? error.message : "Falha ao localizar componente.";
    return res.status(500).json({ error: message });
  }
}
