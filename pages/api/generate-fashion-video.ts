import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { isR2Enabled, uploadBufferToR2 } from "@/server/storage/r2";

type SuccessResponse = {
  videoUrl: string;
  cover?: string;
  duration: number;
  fabric?: string;
  provider: string;
  storyboard?: string;
  referenceImage?: string;
  referenceProvider?: string;
};

type ErrorResponse = {
  error: string;
};

type GenerationPayload = {
  prompt?: unknown;
  modelPreset?: unknown;
  cameraAngle?: unknown;
  fabric?: unknown;
  duration?: unknown;
  referenceImage?: unknown;
};

type ModelPreset = {
  label: string;
  description: string;
};

type PredictionStatus = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: { message?: string; details?: string };
};

type ProviderConfig = {
  key: string;
  label: string;
  model?: string;
  version?: string;
  token?: string;
  pollInterval: number;
  maxAttempts: number;
  buildInput: (payload: {
    prompt: string;
    duration: number;
    referenceImage?: string;
    referenceVideo?: string;
  }) => Record<string, unknown>;
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
const DEFAULT_NANO_NEGATIVE =
  "person, human, mannequin, model, body, background, wall, floor, studio scene, shadow on ground, reflection surface, watermark, logo, text, blur, low poly, flat texture, 2D illustration, cartoon, sketch, painting";

type PromptBundle = {
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
  provider: "openai" | "fallback";
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "24mb",
    },
  },
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

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

function normalizeReferenceMedia(value: unknown): { image?: string; video?: string } {
  if (typeof value !== "string") return {};
  const trimmed = value.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith("data:image/")) return { image: trimmed };
  if (trimmed.startsWith("data:video/")) return { video: trimmed };

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (/\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(trimmed)) return { video: trimmed };
    return { image: trimmed };
  }

  return {};
}

function buildFashionPrompt({
  prompt,
  modelPreset,
  cameraAngle,
  fabric,
}: {
  prompt: string;
  modelPreset: string;
  cameraAngle: string;
  fabric: string;
}) {
  const preset = MODEL_PRESETS[modelPreset];
  const camera = CAMERA_ANGLES[cameraAngle];

  const segments = [
    "Runway Wear Labs.",
    prompt,
    preset?.label ? `Modelo: ${preset.label}.` : null,
    preset?.description ?? null,
    camera ? `Câmera: ${camera}.` : null,
    fabric ? `Tecido destaque: ${fabric}.` : null,
    "Motion-capture fashion futurista, simulação física de tecido em 3D, microdetalhes realistas.",
    "Iluminação cinematográfica, cortes elegantes, estética Merse premium.",
  ];

  return segments.filter((item) => item && String(item).trim()).join(" ");
}

function extractMessageText(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const chunk of content) {
    if (typeof chunk === "string") {
      parts.push(chunk);
      continue;
    }
    if (chunk && typeof chunk === "object" && "text" in chunk) {
      const text = (chunk as { text?: unknown }).text;
      if (typeof text === "string") {
        parts.push(text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function generateStoryboard({
  fashionPrompt,
  duration,
}: {
  fashionPrompt: string;
  duration: number;
}) {
  const fallback = [
    `Cena 1 (0-${Math.max(1, Math.round(duration * 0.25))}s): reveal do look com luz lateral e textura de tecido.`,
    "Cena 2: caminhada principal em passarela com movimento fluido de tecido.",
    "Cena 3: close macro de fibras, costuras e acabamento.",
    "Cena 4: giro final 360 com assinatura visual Merse.",
  ].join("\n");

  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const completion = await openai.chat.completions.create({
      model: (process.env.OPENAI_RUNWAY_STORYBOARD_MODEL ?? "gpt-4o-mini").trim(),
      temperature: 0.7,
      max_tokens: 280,
      messages: [
        {
          role: "system",
          content:
            "Você é diretor de fashion film. Responda em pt-BR com 4 cenas curtas, foco em motion capture e tecido 3D. Sem markdown.",
        },
        {
          role: "user",
          content: `Prompt fashion: ${fashionPrompt}\nDuração: ${duration}s`,
        },
      ],
    });

    const text = extractMessageText(completion.choices?.[0]?.message?.content);
    return text || fallback;
  } catch (error) {
    console.error("[generate-fashion-video] storyboard fallback:", error);
    return fallback;
  }
}

function fallbackImagePrompt({
  lookDescription,
  fabric,
}: {
  lookDescription: string;
  fabric: string;
}) {
  return [
    "Ultra realistic 3D clothing render.",
    `High fashion outfit: ${lookDescription}.`,
    "Fully volumetric garment with physically accurate cloth simulation.",
    "Detailed folds, tension points, seams, layering, and garment thickness visible on edges.",
    `Premium materials and micro fabric texture visible (focus on ${fabric}).`,
    "Cinematic studio lighting, ray tracing, global illumination, soft shadow depth (no ground shadow).",
    "Floating clothing only, no mannequin, no human, hollow interior slightly visible.",
    "Centered composition, isolated object, transparent background, PNG alpha channel, clean cut edges.",
    "Octane render style, Blender Cycles quality, 8K.",
  ].join(" ");
}

function fallbackVideoPrompt({
  lookDescription,
  modelPreset,
  cameraAngle,
  fabric,
  duration,
}: {
  lookDescription: string;
  modelPreset: string;
  cameraAngle: string;
  fabric: string;
  duration: number;
}) {
  const preset = MODEL_PRESETS[modelPreset];
  const camera = CAMERA_ANGLES[cameraAngle];

  const presetHint =
    modelPreset === "hologram"
      ? "Holographic volumetric garment presentation (no human)."
      : modelPreset === "metahuman"
      ? "Hyper-realistic MetaHuman model wearing the garment from the reference image."
      : "Editorial runway film with a model wearing the garment from the reference image.";

  const cameraHint =
    cameraAngle === "orbit"
      ? "Slow 360 orbit camera, smooth parallax, centered framing."
      : cameraAngle === "detail"
      ? "Macro close-ups of stitching, fibers, and folds; shallow depth of field."
      : "Front-facing cinematic shot with gentle dolly-in and stable framing.";

  return [
    "Create a premium fashion video using the garment design from the reference image.",
    `Look: ${lookDescription}.`,
    presetHint,
    preset?.label ? `Preset: ${preset.label}.` : null,
    preset?.description ?? null,
    camera ? `Camera: ${camera}.` : null,
    cameraHint,
    `Fabric highlight: ${fabric}.`,
    `Duration: about ${duration}s.`,
    "Cinematic studio/runway lighting, clean background, no watermarks, no text.",
    "Merse premium aesthetic, smooth motion, high detail, realistic cloth dynamics.",
  ]
    .filter((item) => item && String(item).trim())
    .join(" ");
}

async function generatePromptBundle({
  lookDescription,
  modelPreset,
  cameraAngle,
  fabric,
  duration,
}: {
  lookDescription: string;
  modelPreset: string;
  cameraAngle: string;
  fabric: string;
  duration: number;
}): Promise<PromptBundle> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      imagePrompt: fallbackImagePrompt({ lookDescription, fabric }),
      videoPrompt: fallbackVideoPrompt({
        lookDescription,
        modelPreset,
        cameraAngle,
        fabric,
        duration,
      }),
      negativePrompt: DEFAULT_NANO_NEGATIVE,
      provider: "fallback",
    };
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const completion = await openai.chat.completions.create({
      model: (process.env.OPENAI_RUNWAY_PROMPT_MODEL ?? "gpt-4o-mini").trim(),
      temperature: 0.65,
      max_tokens: 520,
      messages: [
        {
          role: "system",
          content: [
            "You are a prompt engineer for text-to-image and image-conditioned text-to-video.",
            "Return ONLY valid JSON with keys: image_prompt, video_prompt, negative_prompt.",
            "Write prompts in English. Keep them specific but not overly long.",
            "image_prompt must describe a floating garment-only 3D render with transparent background (PNG alpha).",
            "video_prompt must describe a cinematic fashion video that uses the garment design from the reference image.",
            "negative_prompt must be a comma-separated list of things to avoid.",
            "No markdown.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Look description: ${lookDescription}`,
            `Model preset: ${MODEL_PRESETS[modelPreset]?.label ?? modelPreset} (${MODEL_PRESETS[modelPreset]?.description ?? "n/a"})`,
            `Camera angle: ${CAMERA_ANGLES[cameraAngle] ?? cameraAngle}`,
            `Fabric highlight: ${fabric}`,
            `Duration: ${duration}s`,
            "",
            "Constraints for image_prompt: isolated object, centered, no mannequin/human, no background, clean cut edges, realistic cloth physics, premium materials, studio lighting, 8K.",
          ].join("\n"),
        },
      ],
    });

    const raw = extractMessageText(completion.choices?.[0]?.message?.content);
    const parsed = JSON.parse(raw) as {
      image_prompt?: unknown;
      video_prompt?: unknown;
      negative_prompt?: unknown;
    };

    const imagePrompt =
      typeof parsed.image_prompt === "string" && parsed.image_prompt.trim()
        ? parsed.image_prompt.trim()
        : fallbackImagePrompt({ lookDescription, fabric });
    const videoPrompt =
      typeof parsed.video_prompt === "string" && parsed.video_prompt.trim()
        ? parsed.video_prompt.trim()
        : fallbackVideoPrompt({ lookDescription, modelPreset, cameraAngle, fabric, duration });
    const negativePrompt =
      typeof parsed.negative_prompt === "string" && parsed.negative_prompt.trim()
        ? parsed.negative_prompt.trim()
        : DEFAULT_NANO_NEGATIVE;

    return {
      imagePrompt,
      videoPrompt,
      negativePrompt,
      provider: "openai",
    };
  } catch (error) {
    console.error("[generate-fashion-video] prompt bundle fallback:", error);
    return {
      imagePrompt: fallbackImagePrompt({ lookDescription, fabric }),
      videoPrompt: fallbackVideoPrompt({ lookDescription, modelPreset, cameraAngle, fabric, duration }),
      negativePrompt: DEFAULT_NANO_NEGATIVE,
      provider: "fallback",
    };
  }
}

function resolveNanoBananaModelSlug() {
  const raw = (
    process.env.REPLICATE_NANO_BANANA_PRO_MODEL ??
    process.env.REPLICATE_NANO_BANANA_MODEL ??
    "google/nano-banana-pro"
  )
    .trim()
    .toLowerCase();

  // Force the "pro" variant when the base slug is configured.
  if (raw === "google/nano-banana") return "google/nano-banana-pro";
  return raw || "google/nano-banana-pro";
}

function collectImageUrls(payload: unknown) {
  const urls: string[] = [];
  const imageExt = /\.(png|jpe?g|webp)(\?.*)?$/i;

  walkPayload(
    payload,
    (value, key) => {
      if (typeof value !== "string") return;
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("data:image/")) {
        urls.push(trimmed);
        return;
      }
      if (!trimmed.startsWith("http")) return;

      const loweredKey = key?.toLowerCase() ?? "";
      const looksLikeImage =
        imageExt.test(trimmed) ||
        loweredKey.includes("image") ||
        loweredKey.includes("png") ||
        loweredKey.includes("jpg") ||
        loweredKey.includes("jpeg") ||
        loweredKey.includes("webp") ||
        loweredKey.includes("url");

      // Avoid picking video links.
      if (/\.(mp4|mov|webm|gif)(\?.*)?$/i.test(trimmed)) return;
      if (looksLikeImage) urls.push(trimmed);
    },
    new Set(),
  );

  // De-dup while preserving order.
  return urls.filter((url, idx) => urls.indexOf(url) === idx);
}

async function generateNanoBananaImage({
  prompt,
  negativePrompt,
  referenceImage,
}: {
  prompt: string;
  negativePrompt: string;
  referenceImage?: string;
}) {
  const token = (process.env.REPLICATE_NANO_BANANA_API_TOKEN ?? process.env.REPLICATE_API_TOKEN)?.trim();
  if (!token) {
    throw new Error("Defina REPLICATE_NANO_BANANA_API_TOKEN (ou REPLICATE_API_TOKEN) no .env.local.");
  }

  const model = resolveNanoBananaModelSlug();
  const version = await ensureReplicateVersion(token, model, undefined);

  // Keep inputs conservative to maximize compatibility across model variants.
  const combinedPrompt = `${prompt.trim()}\n\nNegative: ${negativePrompt}`.trim();
  const input: Record<string, unknown> = {
    prompt: combinedPrompt,
    num_outputs: 1,
    aspect_ratio: "1:1",
    guidance: 2,
  };
  if (referenceImage) {
    input.image = referenceImage;
  }

  const prediction = await runReplicatePrediction({
    token,
    version,
    input,
    pollInterval: 2500,
    maxAttempts: 30,
  });

  const urls = collectImageUrls(prediction.output);
  if (!urls.length) {
    throw new Error("Nano Banana não retornou uma imagem válida.");
  }

  return { imageUrl: urls[0]!, model };
}

async function removeBackgroundIfPossible(imageUrl: string) {
  const token = (process.env.REPLICATE_API_TOKEN ?? "").trim();
  if (!token) return { imageUrl, provider: "none" as const };

  const model = (process.env.REPLICATE_REMBG_MODEL ?? "cjwbw/rembg").trim();
  if (!model) return { imageUrl, provider: "none" as const };

  try {
    const version = await ensureReplicateVersion(token, model, undefined);
    const prediction = await runReplicatePrediction({
      token,
      version,
      input: { image: imageUrl },
      pollInterval: 2000,
      maxAttempts: 20,
    });

    const urls = collectImageUrls(prediction.output);
    if (!urls.length) return { imageUrl, provider: "none" as const };
    return { imageUrl: urls[0]!, provider: "rembg" as const };
  } catch (error) {
    console.warn("[generate-fashion-video] rembg fallback:", error);
    return { imageUrl, provider: "none" as const };
  }
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
    model: (process.env.OPENAI_RUNWAY_IMAGE_MODEL ?? "gpt-image-1").trim(),
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

function buildProviders(): ProviderConfig[] {
  return [
    {
      key: "minimax",
      label: "MiniMax",
      model: process.env.REPLICATE_MINIMAX_MODEL,
      version: process.env.REPLICATE_MINIMAX_MODEL_VERSION,
      token: process.env.REPLICATE_MINIMAX_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 3000,
      maxAttempts: 45,
      buildInput: ({ prompt, duration, referenceImage, referenceVideo }) => ({
        prompt: `${prompt} Motion-capture runway with precise cloth dynamics.`,
        duration,
        aspect_ratio: "16:9",
        image: referenceImage || undefined,
        video: referenceVideo || undefined,
      }),
    },
    {
      key: "veo",
      label: "Veo",
      // Avoid accidental env overrides (ex.: REPLICATE_VEO_MODEL set to sora).
      model: (process.env.REPLICATE_VEO_MODEL ?? "").toLowerCase().includes("veo")
        ? process.env.REPLICATE_VEO_MODEL
        : "google/veo-3",
      // Resolve at runtime to avoid version/model mismatches.
      version: undefined,
      token: process.env.REPLICATE_VEO_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 3000,
      maxAttempts: 45,
      buildInput: ({ prompt, duration, referenceImage, referenceVideo }) => ({
        prompt: `${prompt} High-fashion cinematic grade and realistic physics.`,
        duration,
        video_length: duration,
        aspect_ratio: "16:9",
        resolution: "1080p",
        image: referenceImage || undefined,
        video: referenceVideo || undefined,
      }),
    },
    {
      key: "kling",
      label: "Kling",
      model: process.env.REPLICATE_KLING_MODEL ?? "kwaivgi/kling-v2.5-turbo-pro",
      version: process.env.REPLICATE_KLING_MODEL_VERSION,
      token: process.env.REPLICATE_KLING_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 2500,
      maxAttempts: 40,
      buildInput: ({ prompt, duration, referenceImage, referenceVideo }) => ({
        prompt: `${prompt} Smooth movement and detailed textile highlights.`,
        duration,
        aspect_ratio: "16:9",
        image: referenceImage || undefined,
        video: referenceVideo || undefined,
      }),
    },
    {
      key: "wan",
      label: "Wan",
      model: process.env.REPLICATE_WAN_VIDEO_MODEL ?? "wan-video/wan-2.6-t2v",
      version: process.env.REPLICATE_WAN_VIDEO_MODEL_VERSION,
      token: process.env.REPLICATE_WAN_VIDEO_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 2500,
      maxAttempts: 40,
      buildInput: ({ prompt, duration, referenceImage, referenceVideo }) => ({
        prompt: `${prompt} Clean fashion pacing and premium editorial flow.`,
        duration,
        aspect_ratio: "16:9",
        image: referenceImage || undefined,
        video: referenceVideo || undefined,
      }),
    },
    {
      key: "merse",
      label: "Merse",
      model: process.env.REPLICATE_MERSE_VIDEO_MODEL ?? process.env.REPLICATE_MERSE_MODEL,
      version:
        process.env.REPLICATE_MERSE_VIDEO_MODEL_VERSION ??
        process.env.REPLICATE_MERSE_MODEL_VERSION,
      token: process.env.REPLICATE_MERSE_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 2500,
      maxAttempts: 40,
      buildInput: ({ prompt, duration, referenceImage, referenceVideo }) => ({
        prompt: `${prompt} Merse identity, neon trims and futuristic runway ambiance.`,
        duration,
        aspect_ratio: "16:9",
        image: referenceImage || undefined,
        video: referenceVideo || undefined,
      }),
    },
    {
      key: "sora",
      label: "Sora",
      model: process.env.REPLICATE_SORA_MODEL ?? "openai/sora",
      version: process.env.REPLICATE_SORA_MODEL_VERSION,
      token: process.env.REPLICATE_API_TOKEN,
      pollInterval: 3000,
      maxAttempts: 45,
      buildInput: ({ prompt, duration, referenceImage, referenceVideo }) => ({
        prompt: `${prompt} Coherent narrative rhythm and photoreal cloth motion.`,
        duration,
        aspect_ratio: "16:9",
        image: referenceImage || undefined,
        video: referenceVideo || undefined,
      }),
    },
  ];
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

async function ensureReplicateVersion(token: string, model: string, version?: string) {
  if (typeof version === "string" && version.trim()) {
    const trimmed = version.trim();
    cachedVersions.set(model, trimmed);
    return trimmed;
  }

  const cached = cachedVersions.get(model);
  if (cached) return cached;

  const resolved = await resolveReplicateVersion(token, model);
  cachedVersions.set(model, resolved);
  return resolved;
}

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

  const creationJson = (await creationResponse.json().catch(() => null)) as PredictionStatus | null;

  if (!creationResponse.ok || !creationJson) {
    const baseMessage =
      typeof creationJson?.error?.message === "string"
        ? creationJson.error.message
        : "Falha ao iniciar a geração na Replicate.";
    const details =
      typeof creationJson?.error?.details === "string" ? ` ${creationJson.error.details}` : "";
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
        typeof currentStatus?.error?.details === "string" ? ` ${currentStatus.error.details}` : "";
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

async function generateVideoWithFallback({
  prompt,
  duration,
  referenceImage,
  referenceVideo,
}: {
  prompt: string;
  duration: number;
  referenceImage?: string;
  referenceVideo?: string;
}) {
  const providers = buildProviders();
  const failures: string[] = [];

  for (const provider of providers) {
    const model = provider.model?.trim();
    const token = provider.token?.trim();
    if (!model || !token) continue;

    try {
      const version = await ensureReplicateVersion(token, model, provider.version);
      const baseInput = provider.buildInput({
        prompt,
        duration,
        referenceImage,
        referenceVideo,
      });

      try {
        const prediction = await runReplicatePrediction({
          token,
          version,
          input: baseInput,
          pollInterval: provider.pollInterval,
          maxAttempts: provider.maxAttempts,
        });
        const { videos, covers, duration: reportedDuration } = collectMedia(prediction.output);
        if (!videos.length) throw new Error("sem URL de vídeo no output");
        return {
          videoUrl: videos[0],
          cover: covers[0],
          duration: reportedDuration ?? duration,
          provider: provider.key,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "erro desconhecido";
        const hasReferenceFields =
          Object.prototype.hasOwnProperty.call(baseInput, "image") ||
          Object.prototype.hasOwnProperty.call(baseInput, "video");
        if (!hasReferenceFields || !/(image|video|input)/i.test(message)) {
          throw error;
        }

        const fallbackInput = { ...baseInput };
        delete (fallbackInput as Record<string, unknown>).image;
        delete (fallbackInput as Record<string, unknown>).video;

        const prediction = await runReplicatePrediction({
          token,
          version,
          input: fallbackInput,
          pollInterval: provider.pollInterval,
          maxAttempts: provider.maxAttempts,
        });
        const { videos, covers, duration: reportedDuration } = collectMedia(prediction.output);
        if (!videos.length) throw new Error("sem URL de vídeo no output");
        return {
          videoUrl: videos[0],
          cover: covers[0],
          duration: reportedDuration ?? duration,
          provider: provider.key,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      failures.push(`${provider.label}: ${message}`);
      console.error(`[generate-fashion-video] provider ${provider.label} falhou:`, error);
    }
  }

  const details = failures.slice(0, 6).join(" | ");
  throw new Error(
    details
      ? `Nenhum provedor conseguiu gerar o vídeo fashion. ${details}`
      : "Nenhum provedor conseguiu gerar o vídeo fashion.",
  );
}

async function generateVideoWithVeoOnly({
  prompt,
  duration,
  referenceImage,
  referenceVideo,
}: {
  prompt: string;
  duration: number;
  referenceImage?: string;
  referenceVideo?: string;
}) {
  const veo = buildProviders().find((p) => p.key === "veo");
  const model = veo?.model?.trim();
  const token = veo?.token?.trim();
  if (!veo || !model || !token) {
    throw new Error("Veo não está configurado. Defina REPLICATE_VEO_API_TOKEN e REPLICATE_VEO_MODEL.");
  }

  const version = await ensureReplicateVersion(token, model, undefined);
  const input = veo.buildInput({
    prompt,
    duration,
    referenceImage,
    referenceVideo,
  });

  const prediction = await runReplicatePrediction({
    token,
    version,
    input,
    pollInterval: veo.pollInterval,
    maxAttempts: veo.maxAttempts,
  });

  const { videos, covers, duration: reportedDuration } = collectMedia(prediction.output);
  if (!videos.length) {
    throw new Error("Veo não retornou URL de vídeo.");
  }

  return {
    videoUrl: videos[0],
    cover: covers[0],
    duration: reportedDuration ?? duration,
    provider: "veo",
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

  const body = (req.body ?? {}) as GenerationPayload;
  const prompt = sanitizeText(body.prompt, 1200);
  const modelPreset = sanitizeText(body.modelPreset, 60) || "metahuman";
  const cameraAngle = sanitizeText(body.cameraAngle, 60) || "orbit";
  const fabric = sanitizeText(body.fabric, 120) || "Tecno holográfico";
  const normalizedDuration = normalizeDuration(body.duration);
  const referenceMedia = normalizeReferenceMedia(body.referenceImage);

  if (!prompt && !referenceMedia.image && !referenceMedia.video) {
    return res
      .status(400)
      .json({ error: "Envie um prompt ou uma referência para gerar o vídeo fashion." });
  }

  try {
    const basePrompt = prompt || "Look fashion inspirado na referência enviada.";
    const fashionPrompt = buildFashionPrompt({
      prompt: basePrompt,
      modelPreset,
      cameraAngle,
      fabric,
    });

    const storyboard = await generateStoryboard({
      fashionPrompt,
      duration: normalizedDuration,
    });

    const promptBundle = await generatePromptBundle({
      lookDescription: basePrompt,
      modelPreset,
      cameraAngle,
      fabric,
      duration: normalizedDuration,
    });

    const imagePrompt = promptBundle.imagePrompt;
    const videoPrompt = promptBundle.videoPrompt;

    const nano = await generateNanoBananaImage({
      prompt: imagePrompt,
      negativePrompt: promptBundle.negativePrompt,
      referenceImage: referenceMedia.image,
    });

    const cutout = await removeBackgroundIfPossible(nano.imageUrl);

    const videoResult = await generateVideoWithVeoOnly({
      prompt: videoPrompt,
      duration: normalizedDuration,
      referenceImage: cutout.imageUrl,
      referenceVideo: referenceMedia.video,
    });

    return res.status(200).json({
      ...videoResult,
      duration: videoResult.duration ?? normalizedDuration,
      fabric,
      storyboard,
      referenceImage: cutout.imageUrl,
      referenceProvider: nano.model,
    });
  } catch (error) {
    console.error("Erro ao gerar vídeo fashion:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o vídeo fashion agora. Tente novamente.";
    return res.status(500).json({ error: message });
  }
}
