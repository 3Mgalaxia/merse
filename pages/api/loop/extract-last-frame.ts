import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type SuccessResponse = {
  frameUrl: string;
};

type ErrorResponse = {
  error: string;
};

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
    if (!host) {
      throw new Error("Host não disponível para resolver URL relativa do vídeo.");
    }
    return `${protocol}://${host}${trimmed}`;
  }

  throw new Error("URL de vídeo inválida para extrair frame de continuidade.");
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
    throw new Error(`Falha ao baixar vídeo (${response.status} ${response.statusText}).`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destinationPath, buffer);
}

async function readDurationInSeconds(inputPath: string) {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nokey=1:noprint_wrappers=1",
      inputPath,
    ]);
    const parsed = Number.parseFloat(String(stdout).trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const { videoUrl } = req.body as { videoUrl?: unknown };
  if (typeof videoUrl !== "string" || !videoUrl.trim()) {
    return res.status(400).json({ error: "videoUrl é obrigatório." });
  }

  let absoluteVideoUrl: string;
  try {
    absoluteVideoUrl = normalizeToAbsoluteUrl(videoUrl, req);
    const parsed = new URL(absoluteVideoUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("A URL do vídeo deve usar http/https.");
    }
    if (isBlockedHost(parsed.hostname)) {
      throw new Error("Host de vídeo não permitido.");
    }
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "URL de vídeo inválida.",
    });
  }

  const extractionId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `mersee-loop-frame-${extractionId}`);
  const inputPath = path.join(tempDir, "source.mp4");
  const outputDir = path.join(process.cwd(), "public", "generated-loop", "frames");
  const outputName = `frame-${Date.now()}-${extractionId.slice(0, 8)}.jpg`;
  const outputPath = path.join(outputDir, outputName);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    await downloadToFile(absoluteVideoUrl, inputPath);

    const duration = await readDurationInSeconds(inputPath);
    const finalSecond = duration ? Math.max(duration - 0.08, 0) : 0;

    try {
      const args = [
        "-y",
        ...(finalSecond > 0 ? ["-ss", finalSecond.toFixed(3)] : []),
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        outputPath,
      ];
      await execFileAsync("ffmpeg", args);
    } catch {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        outputPath,
      ]);
    }

    return res.status(200).json({
      frameUrl: `/generated-loop/frames/${outputName}`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível extrair o frame de continuidade agora.";
    return res.status(500).json({ error: message });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => void 0);
  }
}
