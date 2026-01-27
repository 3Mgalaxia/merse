import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { isR2Enabled, uploadBufferToR2 } from "@/server/storage/r2";

type SuccessResponse = {
  videoUrl: string;
  cover?: string;
  duration?: number;
  provider: "veo";
};

type ErrorResponse = {
  error: string;
};

type GenerationPayload = {
  prompt?: string;
  modelPreset?: string;
  cameraAngle?: string;
  fabric?: string;
  duration?: number;
  referenceImage?: string;
};

type ModelPreset = {
  label: string;
  description: string;
};

const MODEL_PRESETS: Record<string, ModelPreset> = {
  metahuman: {
    label: "MetaHuman",
    description: "Modelo hiper-realista com animação suave.",
  },
  "fashion-runway": {
    label: "Runway Fashion",
    description: "Passarela 3D com luz neon.",
  },
  hologram: {
    label: "Holograma 360°",
    description: "Render volumétrico com partículas.",
  },
};

const CAMERA_ANGLES: Record<string, string> = {
  orbit: "Órbita 360°",
  front: "Front cinematic",
  detail: "Macro tecidos",
};

const REPLICATE_API_URL = "https://api.replicate.com/v1";
const cachedVersions = new Map<string, string>();

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16mb",
    },
  },
};

function normalizeDuration(value: unknown) {
  const min = 4;
  const max = 16;
  const step = 2;
  const fallback = 8;
  const numeric =
    typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  const base = Number.isFinite(numeric) ? numeric : fallback;
  const clamped = Math.min(Math.max(base, min), max);
  const steps = Math.round((clamped - min) / step);
  return min + steps * step;
}

function normalizeReferenceImage(referenceImage?: string) {
  if (!referenceImage) return undefined;
  const trimmed = referenceImage.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("http")) {
    return trimmed;
  }
  return undefined;
}

function buildFashionPrompt({
  prompt,
  modelPreset,
  cameraAngle,
  fabric,
}: {
  prompt: string;
  modelPreset?: string;
  cameraAngle?: string;
  fabric?: string;
}) {
  const preset = modelPreset ? MODEL_PRESETS[modelPreset] : undefined;
  const camera = cameraAngle ? CAMERA_ANGLES[cameraAngle] : undefined;

  const segments = [
    "Runway Wear Labs.",
    prompt,
    preset?.label ? `Modelo: ${preset.label}.` : null,
    preset?.description ?? null,
    camera ? `Câmera: ${camera}.` : null,
    fabric ? `Tecido destaque: ${fabric}.` : null,
    "Editorial fashion futurista, iluminação cinematográfica, textura do tecido em evidência.",
  ];

  return segments.filter((item) => item && String(item).trim()).join(" ");
}

async function generateOpenAIImage({
  prompt,
  referenceImage,
}: {
  prompt: string;
  referenceImage?: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada no servidor.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const requestPayload: OpenAI.ImageGenerateParams = {
    model: "gpt-image-1",
    prompt,
    size: "auto",
    quality: "high",
    n: 1,
    ...(referenceImage ? { image: referenceImage } : {}),
  };

  const result = await openai.images.generate(requestPayload);
  const item = result.data?.[0];

  if (item?.url && !item.url.toLowerCase().startsWith("data:")) {
    return item.url;
  }

  if (item?.b64_json) {
    const buffer = Buffer.from(item.b64_json, "base64");
    if (isR2Enabled()) {
      const uploaded = await uploadBufferToR2({
        buffer,
        contentType: "image/png",
        key: `generated/${randomUUID()}/runway-wear.png`,
      });
      if (uploaded) {
        return uploaded;
      }
    }
    return `data:image/png;base64,${item.b64_json}`;
  }

  throw new Error("A OpenAI não retornou uma imagem válida para continuar a geração.");
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
    const apiMessage = typeof json?.error?.message === "string" ? json.error.message : null;
    throw new Error(
      apiMessage
        ? `${apiMessage}. Configure a versão do modelo no .env.local.`
        : "Não foi possível descobrir a versão do modelo na Replicate.",
    );
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Resposta da Replicate sem versão do modelo.");
  }

  return version.trim();
}

async function ensureReplicateVersion(token: string, model: string, version?: string | null) {
  if (typeof version === "string" && version.trim()) {
    cachedVersions.set(model, version.trim());
    return version.trim();
  }

  const cached = cachedVersions.get(model);
  if (cached) {
    return cached;
  }

  const resolved = await resolveReplicateVersion(token, model);
  cachedVersions.set(model, resolved);
  return resolved;
}

type PredictionStatus = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: { message?: string; details?: string };
};

async function runReplicatePrediction({
  token,
  version,
  input,
  pollInterval,
  maxAttempts,
}: {
  token: string;
  version: string;
  input: Record<string, unknown>;
  pollInterval: number;
  maxAttempts: number;
}) {
  const creationResponse = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ version, input }),
  });

  let creationJson: PredictionStatus | null = null;
  try {
    creationJson = (await creationResponse.json()) as PredictionStatus;
  } catch {
    creationJson = null;
  }

  if (!creationResponse.ok || !creationJson) {
    const baseMessage =
      typeof creationJson?.error?.message === "string"
        ? creationJson.error.message
        : "Falha ao iniciar a geração na Replicate.";
    throw new Error(baseMessage);
  }

  const predictionId = creationJson.id;
  if (!predictionId) {
    throw new Error("A Replicate não retornou um identificador de predição.");
  }

  let currentStatus: PredictionStatus = creationJson;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!["starting", "processing", "pending"].includes(currentStatus.status ?? "")) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const statusResponse = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    currentStatus = (await statusResponse.json().catch(() => ({}))) as PredictionStatus;

    if (!statusResponse.ok) {
      const message =
        typeof currentStatus?.error?.message === "string"
          ? currentStatus.error.message
          : "Falha ao consultar o status da Replicate.";
      throw new Error(message);
    }

    if (currentStatus.status === "failed" || currentStatus.status === "canceled") {
      const message =
        typeof currentStatus?.error?.message === "string"
          ? currentStatus.error.message
          : "A geração de vídeo falhou na Replicate.";
      throw new Error(message);
    }

    if (currentStatus.status === "succeeded") {
      break;
    }
  }

  if (currentStatus.status !== "succeeded") {
    throw new Error("Tempo esgotado aguardando a Replicate finalizar a geração de vídeo.");
  }

  return currentStatus;
}

function walkPayload(
  payload: unknown,
  visitor: (value: unknown, key?: string) => void,
  seen: Set<unknown>,
  key?: string,
) {
  if (payload === null || payload === undefined) return;
  if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
    visitor(payload, key);
    return;
  }
  if (typeof payload !== "object") return;
  if (seen.has(payload)) return;
  seen.add(payload);

  if (Array.isArray(payload)) {
    payload.forEach((item) => walkPayload(item, visitor, seen, key));
    return;
  }

  for (const [childKey, childValue] of Object.entries(payload)) {
    walkPayload(childValue, visitor, seen, childKey);
  }
}

function collectMedia(payload: unknown) {
  const videos: string[] = [];
  const covers: string[] = [];
  let duration: number | undefined;

  walkPayload(
    payload,
    (value, key) => {
      if (typeof value === "string") {
        if (value.startsWith("http")) {
          const loweredKey = key?.toLowerCase() ?? "";
          if (/\.(mp4|mov|webm|gif)$/i.test(value) || loweredKey.includes("video")) {
            videos.push(value);
          } else if (
            loweredKey.includes("cover") ||
            loweredKey.includes("thumb") ||
            loweredKey.includes("poster")
          ) {
            covers.push(value);
          }
        } else if (value.startsWith("data:") && value.includes("video")) {
          videos.push(value);
        }
      } else if (typeof value === "number" && Number.isFinite(value)) {
        const loweredKey = key?.toLowerCase() ?? "";
        if (
          ["duration", "video_duration", "length", "seconds"].includes(loweredKey) &&
          duration === undefined
        ) {
          duration = value;
        }
      }
    },
    new Set(),
  );

  return { videos, covers, duration };
}

async function generateVideoWithReplicate({
  prompt,
  duration,
  referenceImage,
}: {
  prompt: string;
  duration: number;
  referenceImage: string;
}) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("Defina REPLICATE_API_TOKEN no .env.local para gerar vídeos.");
  }

  const model = process.env.REPLICATE_VEO_MODEL ?? "openai/sora-2";
  const version = process.env.REPLICATE_VEO_MODEL_VERSION ?? null;
  if (!model) {
    throw new Error("REPLICATE_VEO_MODEL não configurado.");
  }

  const resolvedVersion = await ensureReplicateVersion(token, model, version);
  const input: Record<string, unknown> = {
    prompt,
    duration,
    aspect_ratio: "16:9",
    image: referenceImage,
  };

  const prediction = await runReplicatePrediction({
    token,
    version: resolvedVersion,
    input,
    pollInterval: 3000,
    maxAttempts: 45,
  });

  const { videos, covers, duration: reportedDuration } = collectMedia(prediction.output);
  if (!videos.length) {
    throw new Error("A Replicate não retornou URL de vídeo. Tente novamente.");
  }

  return {
    videoUrl: videos[0],
    cover: covers[0],
    duration: reportedDuration ?? duration,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const {
    prompt,
    modelPreset,
    cameraAngle,
    fabric,
    duration,
    referenceImage,
  } = req.body as GenerationPayload;

  const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  const hasReference =
    typeof referenceImage === "string" && Boolean(referenceImage.trim());
  const normalizedReference = normalizeReferenceImage(referenceImage);

  if (!trimmedPrompt && !hasReference) {
    return res
      .status(400)
      .json({ error: "Envie um prompt ou uma referência para gerar o vídeo fashion." });
  }

  try {
    const basePrompt = trimmedPrompt || "Look fashion inspirado na referência enviada.";
    const fashionPrompt = buildFashionPrompt({
      prompt: basePrompt,
      modelPreset,
      cameraAngle,
      fabric,
    });

    const imagePrompt = `${fashionPrompt} Foto editorial em alta resolução, corpo inteiro, fundo limpo.`;
    const videoPrompt = `${fashionPrompt} Movimento suave de passarela, tecidos fluidos, câmera cinematográfica.`;

    const baseImageUrl = await generateOpenAIImage({
      prompt: imagePrompt,
      referenceImage: normalizedReference,
    });

    const normalizedDuration = normalizeDuration(duration);
    const videoResult = await generateVideoWithReplicate({
      prompt: videoPrompt,
      duration: normalizedDuration,
      referenceImage: baseImageUrl,
    });

    return res.status(200).json({ ...videoResult, provider: "veo" });
  } catch (error) {
    console.error("Erro ao gerar vídeo fashion:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o vídeo fashion agora. Tente novamente.";
    return res.status(500).json({ error: message });
  }
}
