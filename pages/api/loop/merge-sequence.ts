import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type SuccessResponse = {
  mergedUrl: string;
};

type ErrorResponse = {
  error: string;
};

function toSlug(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "loop-sequencia"
  );
}

function normalizeToAbsoluteUrl(rawUrl: string, req: NextApiRequest) {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    const protocol =
      typeof req.headers["x-forwarded-proto"] === "string"
        ? req.headers["x-forwarded-proto"].split(",")[0].trim()
        : "http";
    const host = req.headers.host;
    if (!host) throw new Error("Host não disponível para resolver URL relativa.");
    return `${protocol}://${host}${trimmed}`;
  }
  throw new Error("URL de vídeo inválida.");
}

function isBlockedHost(hostname: string) {
  const value = hostname.toLowerCase();
  if (value === "localhost" || value === "127.0.0.1" || value === "::1") return true;
  if (/^10\./.test(value)) return true;
  if (/^192\.168\./.test(value)) return true;
  if (/^169\.254\./.test(value)) return true;
  const match172 = value.match(/^172\.(\d+)\./);
  if (match172) {
    const n = Number(match172[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

async function downloadToFile(url: string, destinationPath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar segmento (${response.status} ${response.statusText}).`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destinationPath, buffer);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const { videoUrls, sequenceName } = req.body as {
    videoUrls?: unknown;
    sequenceName?: unknown;
  };

  if (!Array.isArray(videoUrls) || !videoUrls.length) {
    return res.status(400).json({ error: "Forneça ao menos 1 vídeo para montar a sequência." });
  }

  const sanitizedUrls = videoUrls
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 40);

  if (!sanitizedUrls.length) {
    return res.status(400).json({ error: "Nenhuma URL de vídeo válida foi enviada." });
  }

  let absoluteUrls: string[] = [];
  try {
    absoluteUrls = sanitizedUrls.map((rawUrl) => normalizeToAbsoluteUrl(rawUrl, req));
    absoluteUrls.forEach((url) => {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Todas as URLs devem usar http/https.");
      }
      if (isBlockedHost(parsed.hostname)) {
        throw new Error("Uma ou mais URLs apontam para host não permitido.");
      }
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Uma ou mais URLs de vídeo são inválidas.",
    });
  }

  const mergeId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `mersee-loop-merge-${mergeId}`);
  const outputDir = path.join(process.cwd(), "public", "generated-loop");
  const baseName = typeof sequenceName === "string" && sequenceName.trim() ? sequenceName.trim() : "loop-sequencia";
  const outputName = `${toSlug(baseName)}-${Date.now()}-${mergeId.slice(0, 8)}.mp4`;
  const outputPath = path.join(outputDir, outputName);
  const listPath = path.join(tempDir, "segments.txt");

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    const localSegments: string[] = [];
    for (let index = 0; index < absoluteUrls.length; index += 1) {
      const segmentPath = path.join(tempDir, `segment-${index + 1}.mp4`);
      // eslint-disable-next-line no-await-in-loop
      await downloadToFile(absoluteUrls[index], segmentPath);
      localSegments.push(segmentPath);
    }

    if (localSegments.length === 1) {
      await fs.copyFile(localSegments[0], outputPath);
      return res.status(200).json({ mergedUrl: `/generated-loop/${outputName}` });
    }

    const listContent = localSegments.map((segment) => `file '${segment.replace(/'/g, "'\\''")}'`).join("\n");
    await fs.writeFile(listPath, `${listContent}\n`, "utf-8");

    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c",
        "copy",
        outputPath,
      ]);
    } catch {
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputPath,
      ]);
    }

    return res.status(200).json({ mergedUrl: `/generated-loop/${outputName}` });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o vídeo final da sequência.";
    return res.status(500).json({ error: message });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => void 0);
  }
}
