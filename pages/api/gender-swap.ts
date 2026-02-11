import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

type SuccessResponse = {
  imageUrl: string;
  provider: "openai" | "replicate";
};

type ErrorResponse = {
  error: string;
  details?: string[];
};

type TargetGender = "masculino" | "feminino";
type ProviderHint = "auto" | "openai" | "replicate";

type PredictionStatus = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: { message?: string; details?: string };
};

const REPLICATE_BASE_URL = "https://api.replicate.com/v1";
const versionCache = new Map<string, string>();

const TARGET_REFERENCES: Record<
  TargetGender,
  { targetImage: string; prompt: string; userGender: string; userBGender: string }
> = {
  masculino: {
    targetImage:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1024",
    prompt:
      "Transformar para um homem realista com traços marcantes, barba discreta e cabelo curto moderno. Preservar expressão e iluminação originais.",
    userGender: "a man",
    userBGender: "a man",
  },
  feminino: {
    targetImage:
      "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=1024",
    prompt:
      "Transformar para uma mulher realista com traços suaves, cabelo médio ondulado e maquiagem leve. Preservar expressão e iluminação originais.",
    userGender: "a woman",
    userBGender: "a woman",
  },
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeImageInput(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "";
}

function normalizeIntensity(value: unknown) {
  const fallback = 65;
  const raw = typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

function normalizeTargetGender(value: unknown): TargetGender {
  if (typeof value === "string" && value.trim().toLowerCase() === "feminino") {
    return "feminino";
  }
  return "masculino";
}

function normalizeProviderHint(value: unknown): ProviderHint {
  if (typeof value !== "string") return "auto";
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "openai") return "openai";
  if (trimmed === "replicate") return "replicate";
  return "auto";
}

function extractBase64Payload(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (match) {
    return { mime: match[1], base64: match[2] };
  }
  return { mime: "image/png", base64: dataUrl };
}

function buildOpenAIPrompt({
  targetGender,
  intensity,
  userPrompt,
}: {
  targetGender: TargetGender;
  intensity: number;
  userPrompt: string;
}) {
  const genderInstruction =
    targetGender === "feminino"
      ? "Transform the subject into a feminine identity while keeping the same person recognizable."
      : "Transform the subject into a masculine identity while keeping the same person recognizable.";

  const intensityInstruction =
    intensity >= 75
      ? "Strong transformation of hairstyle, facial geometry, and styling while preserving core identity."
      : intensity <= 35
      ? "Very subtle transformation with minimal structural changes."
      : "Balanced transformation with natural facial adaptation and realistic styling.";

  const poseInstruction =
    "Keep pose, camera angle, framing, and background consistent with the original image unless explicitly requested.";

  const qualityInstruction =
    "Photorealistic portrait, natural skin texture, coherent lighting, no artifacts, no distortions.";

  return [genderInstruction, intensityInstruction, poseInstruction, qualityInstruction, userPrompt]
    .filter(Boolean)
    .join(" ");
}

async function generateWithOpenAI({
  image,
  targetGender,
  intensity,
  userPrompt,
}: {
  image: string;
  targetGender: TargetGender;
  intensity: number;
  userPrompt: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ausente.");
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const requestPayload: OpenAI.ImageGenerateParams = {
    model: (process.env.OPENAI_GENDER_SWAP_MODEL ?? "gpt-image-1").trim(),
    prompt: buildOpenAIPrompt({ targetGender, intensity, userPrompt }),
    n: 1,
    size: "auto",
    quality: "high",
    ...(image ? { image } : {}),
  };

  const response = await openai.images.generate(requestPayload);

  const first = response.data?.[0];
  if (first?.url && !first.url.toLowerCase().startsWith("data:")) {
    return first.url;
  }
  if (first?.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  throw new Error("OpenAI não retornou imagem válida.");
}

async function resolveReplicateModelVersion(token: string, model: string) {
  const response = await fetch(`${REPLICATE_BASE_URL}/models/${model}`, {
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
        : "Não foi possível descobrir a versão do modelo na Replicate.";
    throw new Error(message);
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error(`Modelo ${model} sem latest_version.`);
  }

  return version.trim();
}

async function ensureReplicateVersion(token: string, model: string, envVersion?: string | null) {
  if (typeof envVersion === "string" && envVersion.trim()) {
    const trimmed = envVersion.trim();
    versionCache.set(model, trimmed);
    return trimmed;
  }

  const cached = versionCache.get(model);
  if (cached) return cached;

  const resolved = await resolveReplicateModelVersion(token, model);
  versionCache.set(model, resolved);
  return resolved;
}

async function createPrediction(token: string, payload: Record<string, unknown>) {
  const response = await fetch(`${REPLICATE_BASE_URL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as PredictionStatus | null;
  if (!response.ok || !json) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : `Falha ao iniciar geração na Replicate (status ${response.status}).`;
    const details = typeof json?.error?.details === "string" ? ` ${json.error.details}` : "";
    throw new Error(`${message}${details}`);
  }

  if (typeof json.id !== "string" || !json.id.trim()) {
    throw new Error("Replicate não retornou id da predição.");
  }

  return { id: json.id, status: json.status ?? "starting" };
}

async function awaitPrediction(token: string, id: string) {
  const maxAttempts = 40;
  const delayMs = 2500;
  let latest: PredictionStatus = {};

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`${REPLICATE_BASE_URL}/predictions/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    latest = (await response.json().catch(() => ({}))) as PredictionStatus;

    if (!response.ok) {
      const message =
        typeof latest?.error?.message === "string"
          ? latest.error.message
          : "Falha ao consultar status na Replicate.";
      throw new Error(message);
    }

    if (latest.status === "succeeded") {
      return latest;
    }

    if (latest.status === "failed" || latest.status === "canceled") {
      const message =
        typeof latest?.error?.message === "string"
          ? latest.error.message
          : "A geração na Replicate falhou ou foi cancelada.";
      const details = typeof latest?.error?.details === "string" ? ` ${latest.error.details}` : "";
      throw new Error(`${message}${details}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Tempo esgotado aguardando a Replicate finalizar.");
}

function collectImage(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string") {
    if (payload.startsWith("http://") || payload.startsWith("https://") || payload.startsWith("data:image/")) {
      return payload;
    }
    return null;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = collectImage(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload === "object") {
    for (const value of Object.values(payload as Record<string, unknown>)) {
      const found = collectImage(value);
      if (found) return found;
    }
  }
  return null;
}

async function generateWithReplicate({
  image,
  targetGender,
  intensity,
  userPrompt,
}: {
  image: string;
  targetGender: TargetGender;
  intensity: number;
  userPrompt: string;
}) {
  const token =
    process.env.REPLICATE_GENDER_SWAP_API_TOKEN ??
    process.env.REPLICATE_MERSE_API_TOKEN ??
    process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN ausente.");
  }

  const model = process.env.REPLICATE_GENDER_SWAP_MODEL?.trim() || "easel/advanced-face-swap";
  const version = await ensureReplicateVersion(token, model, process.env.REPLICATE_GENDER_SWAP_MODEL_VERSION);

  const ref = TARGET_REFERENCES[targetGender];
  const intensityNote =
    intensity >= 75
      ? "Adapte com força cabelo, traços e estilo visual para o novo gênero."
      : intensity <= 35
      ? "Mantenha quase todas as características originais, alterando apenas o necessário."
      : "Ajuste de forma equilibrada traços e estilo, preservando identidade reconhecível.";

  const stylePrompt = [ref.prompt, intensityNote, userPrompt].filter(Boolean).join(" ");

  const swapImage = image.startsWith("data:image/")
    ? (() => {
        const { base64, mime } = extractBase64Payload(image);
        return `data:${mime};base64,${base64}`;
      })()
    : image;

  const input: Record<string, unknown> = {
    swap_image: swapImage,
    target_image: ref.targetImage,
    user_gender: ref.userGender,
    user_b_gender: ref.userBGender,
    hair_source: intensity >= 60 ? "target" : "swap",
    upscale: intensity >= 55,
    detailer: intensity >= 45,
    prompt: stylePrompt,
  };

  let prediction;
  try {
    prediction = await createPrediction(token, { version, input });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("prompt")) {
      delete input.prompt;
      prediction = await createPrediction(token, { version, input });
    } else {
      throw error;
    }
  }

  const finalStatus = await awaitPrediction(token, prediction.id);
  const imageUrl = collectImage(finalStatus.output);
  if (!imageUrl) {
    throw new Error("Replicate não retornou a imagem transformada.");
  }
  return imageUrl;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const body = (req.body ?? {}) as {
    image?: unknown;
    targetGender?: unknown;
    intensity?: unknown;
    prompt?: unknown;
    provider?: unknown;
  };

  const image = normalizeImageInput(body.image);
  const targetGender = normalizeTargetGender(body.targetGender);
  const intensity = normalizeIntensity(body.intensity);
  const userPrompt = sanitizeText(body.prompt, 900);
  const providerHint = normalizeProviderHint(body.provider);

  if (!image) {
    return res.status(400).json({ error: "Envie uma foto válida para realizar a transformação." });
  }

  const failures: string[] = [];

  try {
    if (providerHint !== "replicate") {
      try {
        const imageUrl = await generateWithOpenAI({
          image,
          targetGender,
          intensity,
          userPrompt,
        });
        return res.status(200).json({ imageUrl, provider: "openai" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "falha desconhecida";
        failures.push(`OpenAI: ${message}`);
      }
    }

    if (providerHint !== "openai") {
      const imageUrl = await generateWithReplicate({
        image,
        targetGender,
        intensity,
        userPrompt,
      });
      return res.status(200).json({ imageUrl, provider: "replicate" });
    }

    throw new Error("Nenhum provedor disponível para este request.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao transformar imagem.";
    if (failures.length > 0) {
      return res.status(500).json({
        error: `${message} | fallback: ${failures.join(" | ")}`,
      });
    }
    return res.status(500).json({ error: message });
  }
}
