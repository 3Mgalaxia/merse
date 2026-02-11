import { randomUUID } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import { logApiAction } from "@/lib/logger";
import { applyRateLimit } from "@/lib/rateLimit";
import { isR2Enabled, uploadBufferToR2 } from "@/server/storage/r2";

type RequestBody = {
  script?: unknown;
  voicePreset?: unknown;
  speed?: unknown;
  autoSync?: unknown;
  referenceVideo?: unknown;
};

type CuePoint = {
  startSec: number;
  endSec: number;
  text: string;
};

type SuccessResponse = {
  script: string;
  audioUrl: string;
  durationSec: number;
  provider: "openai-tts";
  voiceUsed: string;
  cues: CuePoint[];
  sync: {
    attempted: boolean;
    success: boolean;
    provider?: "replicate-lipsync";
    videoUrl?: string;
    message?: string;
  };
  warnings: string[];
  generatedAt: string;
  latencyMs: number;
};

type ErrorResponse = {
  error: string;
  details?: string[];
};

type PredictionStatus = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: { message?: string; details?: string };
};

type SyncResult = {
  url: string;
  inputVariant: number;
};

const REPLICATE_API_URL = "https://api.replicate.com/v1";
const replicateVersionCache = new Map<string, string>();

const VOICE_MAP: Record<string, string> = {
  nova: "nova",
  orion: "onyx",
  lumen: "shimmer",
  atlas: "echo",
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "32mb",
    },
  },
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeScript(value: unknown) {
  return sanitizeText(value, 3500);
}

function normalizeSpeed(value: unknown) {
  const fallback = 1;
  const raw = typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0.7, Math.min(1.35, Number(raw.toFixed(2))));
}

function normalizeAutoSync(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "false" || normalized === "0" || normalized === "off") return false;
  }
  return true;
}

function normalizeVoicePreset(value: unknown) {
  const key = sanitizeText(value, 32).toLowerCase();
  if (key && VOICE_MAP[key]) return key;
  return "nova";
}

function normalizeReferenceVideo(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:video/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "";
}

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function estimateDurationSeconds(text: string, speed: number) {
  const words = Math.max(1, countWords(text));
  const wordsPerSecond = 2.5 * Math.max(0.7, speed);
  return Number(Math.max(1, words / wordsPerSecond).toFixed(2));
}

function splitScriptIntoCues(script: string, durationSec: number): CuePoint[] {
  const chunks = script
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((chunk) => chunk.trim())
    .filter(Boolean) ?? [script.trim()];

  const weighted = chunks.map((text) => ({ text, words: Math.max(1, countWords(text)) }));
  const totalWords = weighted.reduce((sum, item) => sum + item.words, 0) || 1;

  let cursor = 0;

  return weighted.map((item, index) => {
    const isLast = index === weighted.length - 1;
    const duration = isLast
      ? Math.max(0, durationSec - cursor)
      : Math.max(0.35, Number(((durationSec * item.words) / totalWords).toFixed(2)));
    const startSec = Number(cursor.toFixed(2));
    const endSec = Number((cursor + duration).toFixed(2));
    cursor = endSec;

    return {
      startSec,
      endSec: isLast ? Number(durationSec.toFixed(2)) : endSec,
      text: item.text,
    };
  });
}

function extractDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] || "application/octet-stream";
  const base64 = match[2];
  try {
    const buffer = Buffer.from(base64, "base64");
    return { mime, buffer };
  } catch {
    return null;
  }
}

function extensionFromMime(mime: string) {
  const lowered = mime.toLowerCase();
  if (lowered.includes("mpeg") || lowered.includes("mp3")) return "mp3";
  if (lowered.includes("wav")) return "wav";
  if (lowered.includes("ogg")) return "ogg";
  if (lowered.includes("webm")) return "webm";
  if (lowered.includes("mp4")) return "mp4";
  if (lowered.includes("quicktime") || lowered.includes("mov")) return "mov";
  if (lowered.includes("m4v")) return "m4v";
  return "bin";
}

async function resolvePublicVideoReference(reference: string, warnings: string[]) {
  if (!reference) {
    return { raw: "", publicUrl: "" };
  }

  if (reference.startsWith("http://") || reference.startsWith("https://")) {
    return { raw: reference, publicUrl: reference };
  }

  if (!reference.startsWith("data:video/")) {
    warnings.push("Referência de vídeo inválida. O sync automático foi ignorado.");
    return { raw: "", publicUrl: "" };
  }

  if (!isR2Enabled()) {
    warnings.push("R2 não configurado. Tentando sincronizar com o vídeo local inline.");
    return { raw: reference, publicUrl: "" };
  }

  const parsed = extractDataUrl(reference);
  if (!parsed) {
    warnings.push("Não foi possível decodificar o vídeo enviado para sync.");
    return { raw: reference, publicUrl: "" };
  }

  const key = `generated/${randomUUID()}/voz-sync-input.${extensionFromMime(parsed.mime)}`;

  try {
    const uploaded = await uploadBufferToR2({
      buffer: parsed.buffer,
      contentType: parsed.mime,
      key,
    });

    if (uploaded) {
      return { raw: reference, publicUrl: uploaded };
    }
  } catch (error) {
    console.error("[voz-ia] falha ao publicar vídeo de referência no R2:", error);
  }

  warnings.push("Não foi possível publicar o vídeo no R2. Tentando sync com mídia local inline.");
  return { raw: reference, publicUrl: "" };
}

async function resolveReplicateVersion(token: string, model: string) {
  const response = await fetch(`${REPLICATE_API_URL}/models/${model}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : "Não foi possível descobrir a versão do modelo de lipsync.";
    throw new Error(message);
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Modelo de lipsync sem latest_version disponível.");
  }

  return version.trim();
}

async function ensureReplicateVersion(token: string, model: string, preferredVersion?: string | null) {
  if (typeof preferredVersion === "string" && preferredVersion.trim()) {
    const normalized = preferredVersion.trim();
    replicateVersionCache.set(model, normalized);
    return normalized;
  }

  const cached = replicateVersionCache.get(model);
  if (cached) return cached;

  const resolved = await resolveReplicateVersion(token, model);
  replicateVersionCache.set(model, resolved);
  return resolved;
}

async function createPrediction(token: string, version: string, input: Record<string, unknown>) {
  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ version, input }),
  });

  const json = (await response.json().catch(() => null)) as PredictionStatus | null;
  if (!response.ok || !json) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : `Falha ao iniciar lipsync (status ${response.status}).`;
    throw new Error(message);
  }

  if (!json.id) {
    throw new Error("A Replicate não retornou ID da predição de lipsync.");
  }

  return json;
}

async function waitForPrediction({
  token,
  predictionId,
  pollInterval,
  maxAttempts,
}: {
  token: string;
  predictionId: string;
  pollInterval: number;
  maxAttempts: number;
}) {
  let payload: PredictionStatus = { id: predictionId, status: "starting" };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    payload = (await response.json().catch(() => ({}))) as PredictionStatus;

    if (!response.ok) {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : "Falha ao consultar o status do lipsync.";
      throw new Error(message);
    }

    const status = (payload.status ?? "").toLowerCase();

    if (status === "failed" || status === "canceled" || status === "cancelled") {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : "A sincronização de lipsync falhou.";
      throw new Error(message);
    }

    if (status === "succeeded") {
      return payload;
    }
  }

  throw new Error("Tempo esgotado aguardando a sincronização de lipsync.");
}

function extractMediaUrl(output: unknown): string {
  if (typeof output === "string" && output.trim()) return output.trim();

  if (Array.isArray(output)) {
    const found = output.find((item) => typeof item === "string" && item.trim()) as string | undefined;
    if (found) return found.trim();
  }

  const record = output && typeof output === "object" ? (output as Record<string, unknown>) : null;
  if (!record) return "";

  const candidates = [
    record.video,
    record.video_url,
    record.output_video,
    record.output,
    record.url,
    record.result,
    record.mp4,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (Array.isArray(candidate)) {
      const first = candidate.find((item) => typeof item === "string" && item.trim()) as string | undefined;
      if (first) return first.trim();
    }
  }

  return "";
}

async function runLipsync(params: {
  token: string;
  version: string;
  videoInput: string;
  audioInput: string;
}): Promise<SyncResult> {
  const inputVariants: Array<Record<string, unknown>> = [
    {
      input_video: params.videoInput,
      input_audio: params.audioInput,
    },
    {
      video: params.videoInput,
      audio: params.audioInput,
    },
    {
      video_url: params.videoInput,
      audio_url: params.audioInput,
    },
    {
      source_video: params.videoInput,
      source_audio: params.audioInput,
    },
  ];

  const failures: string[] = [];

  for (let index = 0; index < inputVariants.length; index += 1) {
    const input = inputVariants[index]!;

    try {
      const prediction = await createPrediction(params.token, params.version, input);
      const done = await waitForPrediction({
        token: params.token,
        predictionId: prediction.id!,
        pollInterval: 2500,
        maxAttempts: 40,
      });

      const url = extractMediaUrl(done.output);
      if (!url) {
        throw new Error("Predição concluída sem URL de vídeo.");
      }

      return { url, inputVariant: index + 1 };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Tentativa ${index + 1}: ${message}`);
    }
  }

  throw new Error(failures.join(" | "));
}

async function generateSpeechBuffer(params: {
  openai: OpenAI;
  model: string;
  script: string;
  speed: number;
  preferredVoice: string;
}) {
  const voices = [params.preferredVoice, "alloy"].filter(Boolean);
  const tried: string[] = [];

  for (const voice of voices) {
    if (tried.includes(voice)) continue;
    tried.push(voice);

    try {
      const response = await params.openai.audio.speech.create({
        model: params.model,
        voice: voice as any,
        input: params.script,
        speed: params.speed,
        format: "mp3",
      } as any);

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      if (!audioBuffer.length) {
        throw new Error("A geração de voz retornou áudio vazio.");
      }

      return { audioBuffer, voiceUsed: voice };
    } catch (error) {
      if (voice === voices[voices.length - 1]) {
        throw error;
      }
    }
  }

  throw new Error("Não foi possível gerar a narração com as vozes disponíveis.");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  const startedAt = Date.now();
  const userIdHeader = Array.isArray(req.headers["x-merse-uid"])
    ? req.headers["x-merse-uid"][0]
    : req.headers["x-merse-uid"];
  const userId = typeof userIdHeader === "string" && userIdHeader.length > 0 ? userIdHeader : undefined;
  const clientIp =
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]) ||
    req.socket.remoteAddress ||
    "unknown";

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rate = applyRateLimit(`voz-ia:${userId ?? clientIp}`, 10, 60_000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: "Muitas narrações em sequência. Aguarde alguns segundos e tente novamente.",
      details: [`retryAfterMs=${rate.retryAfter}`],
    });
  }

  const body = (req.body ?? {}) as RequestBody;
  const script = normalizeScript(body.script);
  const voicePreset = normalizeVoicePreset(body.voicePreset);
  const speed = normalizeSpeed(body.speed);
  const autoSync = normalizeAutoSync(body.autoSync);
  const referenceVideo = normalizeReferenceVideo(body.referenceVideo);

  if (!script) {
    return res.status(400).json({ error: "Envie um roteiro para gerar a narração." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada para narração neural." });
  }

  const warnings: string[] = [];

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const ttsModel = (process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts").trim();
    const preferredVoice = VOICE_MAP[voicePreset] ?? "nova";

    const { audioBuffer, voiceUsed } = await generateSpeechBuffer({
      openai,
      model: ttsModel,
      script,
      speed,
      preferredVoice,
    });

    const audioDataUrl = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;
    let audioUrl = audioDataUrl;
    let audioPublicUrl = "";

    if (isR2Enabled()) {
      try {
        const uploadedAudio = await uploadBufferToR2({
          buffer: audioBuffer,
          contentType: "audio/mpeg",
          key: `generated/${randomUUID()}/voice-immersive.mp3`,
        });

        if (uploadedAudio) {
          audioUrl = uploadedAudio;
          audioPublicUrl = uploadedAudio;
        }
      } catch (error) {
        console.error("[voz-ia] falha ao publicar áudio no R2:", error);
        warnings.push("Áudio gerado, mas sem upload público. Usando URL local inline.");
      }
    } else {
      warnings.push("R2 não configurado. O áudio será retornado inline para preview imediato.");
    }

    const durationSec = estimateDurationSeconds(script, speed);
    const cues = splitScriptIntoCues(script, durationSec);

    const sync: SuccessResponse["sync"] = {
      attempted: false,
      success: false,
    };

    if (autoSync && referenceVideo) {
      sync.attempted = true;

      const token =
        process.env.REPLICATE_LIPSYNC_API_TOKEN ??
        process.env.REPLICATE_SYNC_API_TOKEN ??
        process.env.REPLICATE_API_TOKEN;
      const model =
        process.env.REPLICATE_LIPSYNC_MODEL ??
        process.env.REPLICATE_SYNC_MODEL ??
        "sync/lipsync-2-pro";
      const preferredVersion =
        process.env.REPLICATE_LIPSYNC_MODEL_VERSION ??
        process.env.REPLICATE_SYNC_MODEL_VERSION;

      if (!token) {
        sync.message = "Sync automático indisponível: token da Replicate ausente.";
        warnings.push(sync.message);
      } else {
        const resolvedVideo = await resolvePublicVideoReference(referenceVideo, warnings);
        const videoInput = resolvedVideo.publicUrl || resolvedVideo.raw;
        const audioInput = audioPublicUrl || audioDataUrl;

        if (!videoInput) {
          sync.message = "Sync automático ignorado por falta de vídeo válido.";
          warnings.push(sync.message);
        } else {
          try {
            const version = await ensureReplicateVersion(token, model, preferredVersion);
            const synced = await runLipsync({
              token,
              version,
              videoInput,
              audioInput,
            });

            sync.success = true;
            sync.provider = "replicate-lipsync";
            sync.videoUrl = synced.url;
            sync.message = `Sync automático aplicado (variante ${synced.inputVariant}).`;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Não foi possível aplicar sync automático ao vídeo.";
            sync.success = false;
            sync.provider = "replicate-lipsync";
            sync.message = message;
            warnings.push(`Sync automático falhou: ${message}`);
          }
        }
      }
    }

    const payload: SuccessResponse = {
      script,
      audioUrl,
      durationSec,
      provider: "openai-tts",
      voiceUsed,
      cues,
      sync,
      warnings,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    };

    void logApiAction({
      action: "voz-ia-generate",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: {
        scriptChars: script.length,
        speed,
        voicePreset,
        voiceUsed,
        autoSync,
        hasReferenceVideo: Boolean(referenceVideo),
        syncSuccess: sync.success,
        warningsCount: warnings.length,
      },
    });

    return res.status(200).json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível gerar a narração neural agora.";

    console.error("[voz-ia/generate] error:", error);

    void logApiAction({
      action: "voz-ia-generate",
      userId,
      status: 500,
      durationMs: Date.now() - startedAt,
      metadata: {
        error: message,
      },
    });

    return res.status(500).json({ error: message });
  }
}
