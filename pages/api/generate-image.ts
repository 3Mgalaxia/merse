import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { isR2Enabled, uploadBufferToR2 } from "@/server/storage/r2";

const replicateVersionCache = new Map<string, string>();

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

export type SuccessResponse = {
  imageUrl: string;
  images: string[];
  seeds: Array<string | number>;
  provider: Provider;
  id: string;
  status: "completed";
  creditsUsed: number;
};

type ErrorResponse = {
  error: string;
};

type Provider = "openai" | "flux" | "merse" | "nano-banana" | "runway-gen4";

type ReplicateProviderKey = Exclude<Provider, "openai">;

type ReplicateProviderConfig = {
  token?: string;
  fallbackToken?: string;
  model?: string;
  defaultModel: string;
  version?: string;
  promptSuffix: string;
  tokenEnvLabel: string;
  modelEnvLabel: string;
};

const replicateProviderConfig: Record<ReplicateProviderKey, ReplicateProviderConfig> = {
  flux: {
    token: process.env.REPLICATE_FLUX_API_TOKEN,
    fallbackToken: process.env.REPLICATE_API_TOKEN,
    model: process.env.REPLICATE_FLUX_MODEL,
    defaultModel: "3mgalaxia/merse-image-v1",
    version: process.env.REPLICATE_FLUX_MODEL_VERSION,
    promptSuffix: "Flux Studio - imagens rápidas com estética Merse econômica.",
    tokenEnvLabel: "REPLICATE_FLUX_API_TOKEN",
    modelEnvLabel: "REPLICATE_FLUX_MODEL",
  },
  merse: {
    token: process.env.REPLICATE_MERSE_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
    fallbackToken: process.env.REPLICATE_API_TOKEN,
    model: process.env.REPLICATE_MERSE_MODEL,
    defaultModel: "3mgalaxia/merse-image-v1",
    version: process.env.REPLICATE_MERSE_MODEL_VERSION,
    promptSuffix: "Identidade Merse AI 1.0, brilho cósmico premium e partículas orbitais.",
    tokenEnvLabel: "REPLICATE_MERSE_API_TOKEN",
    modelEnvLabel: "REPLICATE_MERSE_MODEL",
  },
  "nano-banana": {
    token: process.env.REPLICATE_NANO_BANANA_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
    fallbackToken: process.env.REPLICATE_API_TOKEN,
    model: process.env.REPLICATE_NANO_BANANA_MODEL,
    defaultModel: "",
    version: process.env.REPLICATE_NANO_BANANA_MODEL_VERSION,
    promptSuffix: "Nano Banana draft, rápido e econômico.",
    tokenEnvLabel: "REPLICATE_NANO_BANANA_API_TOKEN",
    modelEnvLabel: "REPLICATE_NANO_BANANA_MODEL",
  },
  "runway-gen4": {
    token: process.env.REPLICATE_RUNWAY_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
    fallbackToken: process.env.REPLICATE_API_TOKEN,
    model: process.env.REPLICATE_RUNWAY_GEN4_MODEL,
    defaultModel: "runwayml/gen4-image",
    version: process.env.REPLICATE_RUNWAY_GEN4_MODEL_VERSION,
    promptSuffix: "Runway Gen-4 imagem cinematográfica.",
    tokenEnvLabel: "REPLICATE_RUNWAY_API_TOKEN",
    modelEnvLabel: "REPLICATE_RUNWAY_GEN4_MODEL",
  },
};

type GenerationRequest = {
  prompt: string;
  provider: Provider;
  aspectRatio?: string;
  stylization?: number;
  count: number;
  referenceImage?: string;
  jobId?: string;
};

async function generateWithOpenAI({
  prompt,
  provider,
  aspectRatio,
  stylization,
  count,
  referenceImage,
  jobId,
}: GenerationRequest) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada no servidor.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const aspectSizeMap: Record<string, string> = {
    "16:9": "auto",
    "9:16": "1024x1536",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
    "4:5": "1024x1536",
    "5:4": "1536x1024",
    "1:1": "1024x1024",
  };

  const normalizedAspect = typeof aspectRatio === "string" ? aspectRatio.trim() : "";
  const size = (aspectSizeMap[normalizedAspect] ?? "1024x1024") as OpenAI.ImageGenerateParams["size"];
  const quality = (provider === "openai" ? "high" : "medium") as OpenAI.ImageGenerateParams["quality"];
  const cappedCount = Math.max(1, Math.min(Number.isFinite(count) ? Number(count) : 1, 4));

  const stylizationNote =
    typeof stylization === "number"
      ? ` | Intensidade criativa: ${Math.round(Math.max(0, Math.min(stylization, 100)))}%.`
      : "";

  const promptSuffix =
    " | Estética OpenAI Vision, nitidez fotográfica, gradientes suaves e contraste equilibrado.";

  const requestPayload: OpenAI.ImageGenerateParams = {
    model: "gpt-image-1",
    prompt: `${prompt.trim()}${promptSuffix}${stylizationNote}`.trim(),
    size,
    quality,
    n: cappedCount,
    ...(referenceImage ? { image: referenceImage } : {}),
  };

  const result = await openai.images.generate(requestPayload);

  const images: string[] = [];

  for (let idx = 0; idx < (result.data?.length ?? 0); idx += 1) {
    const item = result.data?.[idx];
    if (!item) continue;

    if (item.url && !item.url.toLowerCase().startsWith("data:")) {
      images.push(item.url);
      continue;
    }

    if (item.b64_json) {
      const buffer = Buffer.from(item.b64_json, "base64");
      if (isR2Enabled()) {
        const uploaded = await uploadBufferToR2({
          buffer,
          contentType: "image/png",
          key: `generated/${jobId ?? randomUUID()}/openai-${idx}.png`,
        });
        if (uploaded) {
          images.push(uploaded);
          continue;
        }
      }
      images.push(`data:image/png;base64,${item.b64_json}`);
    }
  }

  if (!images.length) {
    throw new Error("Resposta sem URL de imagem. Verifique suas credenciais ou o modelo configurado.");
  }

  const seeds = images.map((_, index) => index + 1);

  return {
    imageUrl: images[0],
    images,
    seeds,
  };
}

async function resolveReplicateVersion(token: string, model: string) {
  const response = await fetch(`https://api.replicate.com/v1/models/${model}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = typeof json?.error?.message === "string" ? json.error.message : null;
    const guidance =
      "Confirme o slug do modelo na Replicate e preencha as variáveis correspondentes no .env.local.";
    throw new Error(
      apiMessage
        ? `${apiMessage}. ${guidance}`
        : `Não foi possível obter a versão padrão do modelo informado na Replicate. ${guidance}`,
    );
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Não foi possível descobrir a versão mais recente do modelo Merse na Replicate.");
  }

  return version;
}

async function generateWithReplicateProvider(
  request: GenerationRequest,
  providerKey: ReplicateProviderKey,
) {
  const config = replicateProviderConfig[providerKey];
  const token = (config.token ?? config.fallbackToken)?.trim();
  if (!token) {
    throw new Error(
      `Defina ${config.tokenEnvLabel} (ou REPLICATE_API_TOKEN) no .env.local para usar o provedor ${providerKey}.`,
    );
  }

  const modelId = (config.model ?? config.defaultModel)?.trim();
  if (!modelId) {
    throw new Error(
      `Configure ${config.modelEnvLabel} no .env.local para apontar para o modelo da Replicate do provedor ${providerKey}.`,
    );
  }

  let version = config.version?.trim();
  const cacheKey = `${providerKey}:${modelId}`;

  if (!version) {
    version = replicateVersionCache.get(cacheKey);
    if (!version) {
      version = await resolveReplicateVersion(token, modelId);
      replicateVersionCache.set(cacheKey, version);
    }
  } else {
    replicateVersionCache.set(cacheKey, version);
  }

  const normalizedAspect = typeof request.aspectRatio === "string" ? request.aspectRatio.trim() : "1:1";
  const cappedCount = Math.max(1, Math.min(Number.isFinite(request.count) ? Number(request.count) : 1, 4));
  const guidance =
    typeof request.stylization === "number" ? Math.max(1, Math.min(15, request.stylization / 10 + 1)) : 1.5;

  const payload: Record<string, unknown> = {
    version,
    input: {
      prompt: `${request.prompt.trim()} | ${config.promptSuffix}`,
      num_outputs: cappedCount,
      aspect_ratio: normalizedAspect || "1:1",
      guidance,
    },
  };

  if (request.referenceImage) {
    (payload.input as Record<string, unknown>).image = request.referenceImage;
  }

  const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  let creationJson: any = null;
  try {
    creationJson = await predictionResponse.json();
  } catch {
    creationJson = null;
  }

  if (!predictionResponse.ok) {
    const apiMessage =
      typeof creationJson?.error?.message === "string" ? creationJson.error.message : null;
    const details =
      typeof creationJson?.error?.details === "string" ? creationJson.error.details : null;
    const composed = [apiMessage, details].filter(Boolean).join(" ");
    throw new Error(
      composed ||
        `Falha ao iniciar a geração na Replicate (status ${predictionResponse.status}). Confirme token e modelo ${modelId}.`,
    );
  }

  const predictionId = creationJson.id as string | undefined;
  if (!predictionId) {
    throw new Error("A Replicate não retornou um identificador de predição.");
  }

  const maxAttempts = 30;
  const delay = 2000;
  let finalStatus = creationJson;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!["starting", "processing"].includes(finalStatus.status)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    finalStatus = await statusResponse.json().catch(() => ({}));

    if (!statusResponse.ok) {
      const message =
        typeof finalStatus?.error?.message === "string"
          ? finalStatus.error.message
          : "Falha ao consultar o status da Replicate.";
      throw new Error(message);
    }

    if (finalStatus.status === "failed" || finalStatus.status === "canceled") {
      const message =
        typeof finalStatus?.error?.message === "string"
          ? finalStatus.error.message
          : "A geração da Replicate foi cancelada ou falhou.";
      throw new Error(message);
    }

    if (finalStatus.status === "succeeded") {
      break;
    }
  }

  if (finalStatus.status !== "succeeded") {
    throw new Error("Tempo esgotado aguardando a Replicate finalizar a geração.");
  }

  const collectImageUrls = (payload: unknown): string[] => {
    if (!payload) return [];

    if (typeof payload === "string") {
      return payload.startsWith("http") ? [payload] : [];
    }

    if (Array.isArray(payload)) {
      return payload.flatMap((entry) => collectImageUrls(entry));
    }

    if (typeof payload === "object") {
      const imagesField = (payload as { images?: unknown }).images;
      const imageField = (payload as { image?: unknown }).image;
      const urlField = (payload as { url?: unknown }).url;
      const outputField = (payload as { output?: unknown }).output;

      return [
        ...collectImageUrls(imagesField),
        ...collectImageUrls(imageField),
        ...collectImageUrls(urlField),
        ...collectImageUrls(outputField),
      ];
    }

    return [];
  };

  const imageUrls = collectImageUrls(finalStatus.output);

  if (!imageUrls.length) {
    throw new Error(
      "A Replicate não retornou imagens geradas. Verifique se o modelo fornece URLs diretamente na resposta.",
    );
  }

  return {
    imageUrl: imageUrls[0],
    images: imageUrls,
    seeds: imageUrls.map((_, index) => index + 1),
  };
}

async function uploadImagesToR2(imageUrls: string[], keyPrefix: string) {
  if (!isR2Enabled()) return null;
  const uploaded: string[] = [];

  for (let idx = 0; idx < imageUrls.length; idx += 1) {
    const url = imageUrls[idx];
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Falha ao baixar imagem (${response.status})`);
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") ?? "image/png";
      const key = `${keyPrefix.replace(/\/+$/, "")}/${idx}.png`;
      const uploadedUrl = await uploadBufferToR2({
        buffer: Buffer.from(arrayBuffer),
        contentType,
        key,
      });
      if (uploadedUrl) {
        uploaded.push(uploadedUrl);
      }
    } catch (error) {
      console.warn("uploadImagesToR2 error", error);
    }
  }

  return uploaded.length ? uploaded : null;
}

export async function generateImageFromPayload(commonPayload: GenerationRequest) {
  const id = commonPayload.jobId ?? (typeof randomUUID === "function" ? randomUUID() : `img_${Date.now()}`);

  const response =
    commonPayload.provider === "openai"
      ? await generateWithOpenAI({ ...commonPayload, jobId: id })
      : await generateWithReplicateProvider(commonPayload, commonPayload.provider as ReplicateProviderKey);

  let finalImages = response.images;

  if (isR2Enabled() && commonPayload.provider !== "openai") {
    const uploaded = await uploadImagesToR2(response.images, `generated/${id}`);
    if (uploaded) {
      finalImages = uploaded;
    }
  }

  const creditsUsed = Math.max(1, Math.min(finalImages.length || commonPayload.count || 1, 4));

  return {
    ...response,
    imageUrl: finalImages[0],
    images: finalImages,
    provider: commonPayload.provider,
    creditsUsed,
    id,
    status: "completed" as const,
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
    provider: requestedProvider = "openai",
    aspectRatio,
    stylization,
    count = 1,
    referenceImage,
  } = req.body as {
    prompt?: unknown;
    provider?: string;
    aspectRatio?: string;
    stylization?: number;
    count?: number;
    referenceImage?: string;
  };

  const providerKey =
    typeof requestedProvider === "string" ? requestedProvider.trim().toLowerCase() : "";
  const provider: Provider =
    providerKey === "merse"
      ? "merse"
      : providerKey === "flux"
      ? "flux"
      : providerKey === "nano-banana"
      ? "nano-banana"
      : providerKey === "runway-gen4"
      ? "runway-gen4"
      : "openai";

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Forneça uma descrição válida para gerar a imagem." });
  }

  try {
    const commonPayload: GenerationRequest = {
      prompt,
      provider,
      aspectRatio,
      stylization,
      count,
      referenceImage,
    };

    const response = await generateImageFromPayload(commonPayload);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a imagem agora. Tente novamente.";
    return res.status(500).json({ error: message });
  }
}
