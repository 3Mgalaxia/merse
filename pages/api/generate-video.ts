import type { NextApiRequest, NextApiResponse } from "next";

type Provider = "veo" | "sora" | "merse";

type SuccessResponse = {
  videoUrl: string;
  cover?: string;
  duration?: number;
  provider: Provider;
};

type ErrorResponse = {
  error: string;
};

type GenerationParams = {
  prompt: string;
  provider: Provider;
  aspectRatio?: string;
  duration?: number;
  referenceImage?: string;
};

type ProviderSettings = {
  model: string;
  version?: string | null;
  pollInterval: number;
  maxAttempts: number;
  defaultAspect: string;
  aspectWhitelist: string[];
  durationRange: { min: number; max: number; step: number; fallback: number };
  allowedDurations?: number[];
  buildInput: (params: Required<Omit<GenerationParams, "provider">>) => Record<string, unknown>;
};

const REPLICATE_API_URL = "https://api.replicate.com/v1";

const cachedVersions: Record<string, string> = {};

const PROVIDER_SETTINGS: Record<Provider, ProviderSettings> = {
  veo: {
    model: process.env.REPLICATE_VEO_MODEL ?? "google/veo-3",
    version: process.env.REPLICATE_VEO_MODEL_VERSION,
    pollInterval: 2500,
    maxAttempts: 40,
    defaultAspect: "16:9",
    aspectWhitelist: ["16:9", "9:16"],
    durationRange: { min: 4, max: 8, step: 2, fallback: 6 },
    allowedDurations: [4, 6, 8],
    buildInput: ({ prompt, aspectRatio, duration, referenceImage }) => {
      const resolution = aspectRatio === "9:16" ? "720x1280" : "1080p";
      return {
        prompt: `${prompt} | Cinemática realista, grãos orgânicos e estética Merse.`,
        aspect_ratio: aspectRatio,
        duration,
        video_length: duration,
        resolution,
        image: referenceImage || undefined,
      };
    },
  },
  sora: {
    model: process.env.REPLICATE_SORA_MODEL ?? "openai/sora",
    version: process.env.REPLICATE_SORA_MODEL_VERSION,
    pollInterval: 3000,
    maxAttempts: 45,
    defaultAspect: "16:9",
    aspectWhitelist: ["16:9", "9:16"],
    durationRange: { min: 6, max: 20, step: 2, fallback: 12 },
    buildInput: ({ prompt, aspectRatio, duration, referenceImage }) => ({
      prompt: `${prompt} | Física coerente, iluminação cine Merse.`,
      aspect_ratio: aspectRatio,
      duration,
      image: referenceImage || undefined,
    }),
  },
  merse: {
    model:
      process.env.REPLICATE_MERSE_VIDEO_MODEL ??
      process.env.REPLICATE_MERSE_MODEL ??
      "mersee/merse-ai-1-0",
    version: process.env.REPLICATE_MERSE_VIDEO_MODEL_VERSION ?? process.env.REPLICATE_MERSE_MODEL_VERSION,
    pollInterval: 2500,
    maxAttempts: 35,
    defaultAspect: "16:9",
    aspectWhitelist: ["16:9", "9:16"],
    durationRange: { min: 4, max: 20, step: 2, fallback: 12 },
    buildInput: ({ prompt, aspectRatio, duration, referenceImage }) => ({
      prompt: `${prompt} | Identidade Merse oficial, partículas cósmicas, brilho neon.`,
      aspect_ratio: aspectRatio,
      duration,
      image: referenceImage || undefined,
    }),
  },
};

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
        ? `${apiMessage}. Configure a versão específica do modelo no .env.local para acelerar futuras chamadas.`
        : "Não foi possível descobrir a versão padrão do modelo na Replicate. Informe manualmente a versão no .env.local.",
    );
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Resposta da Replicate não trouxe a versão mais recente do modelo.");
  }

  return version;
}

async function ensureVersion(token: string, model: string, version?: string | null) {
  if (typeof version === "string" && version.trim()) {
    cachedVersions[model] = version.trim();
    return version.trim();
  }

  if (cachedVersions[model]) {
    return cachedVersions[model];
  }

  const discovered = await resolveReplicateVersion(token, model);
  cachedVersions[model] = discovered;
  return discovered;
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
        : typeof (creationJson as any)?.detail === "string"
        ? (creationJson as any).detail
        : "Falha ao iniciar a geração na Replicate.";
    const details =
      typeof creationJson?.error?.details === "string"
        ? ` ${creationJson.error.details}`
        : typeof (creationJson as any)?.error === "object"
        ? ` ${JSON.stringify((creationJson as any).error)}`
        : !creationResponse.ok
        ? ` (status ${creationResponse.status} ${creationResponse.statusText})`
        : "";
    console.error("Replicate prediction creation failed:", creationJson);
    throw new Error(`${baseMessage}${details}`);
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
      const details =
        typeof currentStatus?.error?.details === "string"
          ? ` ${currentStatus.error.details}`
          : "";
      throw new Error(`${message}${details}`);
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

function normalizeAspectForProvider(aspectRatio: unknown, provider: ProviderSettings) {
  if (typeof aspectRatio === "string") {
    const trimmed = aspectRatio.trim();
    if (provider.aspectWhitelist.includes(trimmed)) {
      return trimmed;
    }
    if (/^\d+:\d+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return provider.defaultAspect;
}

function clampDuration(
  value: unknown,
  { min, max, step, fallback }: ProviderSettings["durationRange"],
  allowed?: number[],
) {
  const numeric =
    typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  const base = Number.isFinite(numeric) ? numeric : fallback;

  if (Array.isArray(allowed) && allowed.length > 0) {
    const normalized = Array.from(
      new Set(allowed.filter((entry) => typeof entry === "number" && Number.isFinite(entry))),
    ).sort((a, b) => a - b);

    if (normalized.length > 0) {
      const target = normalized.reduce((closest, current) => {
        return Math.abs(current - base) < Math.abs(closest - base) ? current : closest;
      }, normalized[0]);
      return target;
    }
  }

  const clamped = Math.min(Math.max(base, min), max);
  const steps = Math.round((clamped - min) / step);
  return min + steps * step;
}

function walkPayload(
  payload: unknown,
  visitor: (value: unknown, key?: string) => void,
  seen: Set<unknown>,
  key?: string,
) {
  if (payload === null || payload === undefined) {
    return;
  }

  if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
    visitor(payload, key);
    return;
  }

  if (typeof payload !== "object") {
    return;
  }

  if (seen.has(payload)) {
    return;
  }

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

async function generateWithProvider(params: GenerationParams) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("Defina REPLICATE_API_TOKEN no .env.local para gerar vídeos com a Replicate.");
  }

  const settings = PROVIDER_SETTINGS[params.provider];
  if (!settings || !settings.model) {
    throw new Error("Configuração de provedor inválida ou incompleta.");
  }

  const aspect = normalizeAspectForProvider(params.aspectRatio, settings);
  const duration = clampDuration(params.duration, settings.durationRange, settings.allowedDurations);

  const resolvedVersion = await ensureVersion(token, settings.model, settings.version);

  const input = settings.buildInput({
    prompt: params.prompt.trim(),
    aspectRatio: aspect,
    duration,
    referenceImage: params.referenceImage ?? "",
  });

  const prediction = await runReplicatePrediction({
    token,
    version: resolvedVersion,
    input,
    pollInterval: settings.pollInterval,
    maxAttempts: settings.maxAttempts,
  });

  const { videos, covers, duration: reportedDuration } = collectMedia(prediction.output);

  if (!videos.length) {
    throw new Error("A Replicate não retornou URL de vídeo. Tente novamente em instantes.");
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
    provider: requestedProvider = "veo",
    aspectRatio,
    duration,
    referenceImage,
  } = req.body as {
    prompt?: unknown;
    provider?: string;
    aspectRatio?: string;
    duration?: number;
    referenceImage?: string;
  };

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Forneça uma descrição válida para gerar o vídeo." });
  }

  const providerKey = typeof requestedProvider === "string" ? requestedProvider.trim().toLowerCase() : "";
  const provider: Provider =
    providerKey === "sora" ? "sora" : providerKey === "merse" ? "merse" : "veo";

  try {
    const result = await generateWithProvider({
      prompt,
      provider,
      aspectRatio,
      duration,
      referenceImage,
    });

    return res.status(200).json({ ...result, provider });
  } catch (error) {
    console.error("Erro ao gerar vídeo:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o vídeo agora. Tente novamente mais tarde.";
    return res.status(500).json({ error: message });
  }
}
