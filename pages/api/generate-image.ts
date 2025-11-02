import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

let cachedReplicateVersion: string | null = null;
let cachedReplicateModel: string | null = null;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

type SuccessResponse = {
  imageUrl: string;
  images: string[];
  seeds: Array<string | number>;
};

type ErrorResponse = {
  error: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID,
  organization: process.env.OPENAI_ORG_ID,
  baseURL: process.env.OPENAI_BASE_URL,
});

type Provider = "openai" | "flux" | "merse";

type GenerationRequest = {
  prompt: string;
  provider: Provider;
  aspectRatio?: string;
  stylization?: number;
  count: number;
  referenceImage?: string;
};

async function generateWithOpenAI({
  prompt,
  provider,
  aspectRatio,
  stylization,
  count,
  referenceImage,
}: GenerationRequest) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada no servidor.");
  }

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
  const size = aspectSizeMap[normalizedAspect] ?? "1024x1024";
  const quality = provider === "openai" ? "high" : "medium";
  const cappedCount = Math.max(1, Math.min(Number.isFinite(count) ? Number(count) : 1, 4));

  const stylizationNote =
    typeof stylization === "number"
      ? ` | Intensidade criativa: ${Math.round(Math.max(0, Math.min(stylization, 100)))}%.`
      : "";

  const promptSuffix =
    provider === "flux"
      ? " | Estilo Flux experimental, mistura de texturas orgânicas e luz teatral difusa."
      : " | Estilo Merse premium, microdetalhes nítidos e luz volumétrica.";

  const requestPayload: OpenAI.ImageGenerateParams = {
    model: "gpt-image-1",
    prompt: `${prompt.trim()}${promptSuffix}${stylizationNote}`.trim(),
    size,
    quality,
    n: cappedCount,
    ...(referenceImage ? { image: referenceImage } : {}),
  };

  const result = await openai.images.generate(requestPayload);

  const imageUrls =
    result.data
      ?.map((item) => item.url ?? (item.b64_json ? `data:image/png;base64,${item.b64_json}` : null))
      .filter((url): url is string => typeof url === "string" && url.length > 0) ?? [];

  if (!imageUrls.length) {
    throw new Error("Resposta sem URL de imagem.");
  }

  const seeds =
    result.data?.map((item, index) => (item.seed as string | number | undefined) ?? index + 1) ??
    imageUrls.map((_, index) => index + 1);

  return {
    imageUrl: imageUrls[0],
    images: imageUrls,
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
      "Informe as variáveis REPLICATE_MERSE_MODEL e REPLICATE_MERSE_MODEL_VERSION no .env.local com o slug e a versão exata do modelo disponibilizado na Replicate.";
    throw new Error(
      apiMessage
        ? `${apiMessage}. ${guidance}`
        : `Não foi possível obter a versão padrão do modelo Merse na Replicate. ${guidance}`,
    );
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Não foi possível descobrir a versão mais recente do modelo Merse na Replicate.");
  }

  return version;
}

async function generateWithReplicate({
  prompt,
  aspectRatio,
  stylization,
  count,
  referenceImage,
}: GenerationRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  const modelId = process.env.REPLICATE_MERSE_MODEL ?? "mersee/merse-ai-1-0";
  let version = process.env.REPLICATE_MERSE_MODEL_VERSION;

  if (!token) {
    throw new Error("Defina REPLICATE_API_TOKEN no .env.local para usar o motor Merse AI 1.0.");
  }

  if (cachedReplicateVersion && cachedReplicateModel === modelId) {
    version = cachedReplicateVersion;
  } else if (!version || !version.trim()) {
    version = await resolveReplicateVersion(token, modelId);
    cachedReplicateVersion = version;
    cachedReplicateModel = modelId;
  } else {
    cachedReplicateVersion = version;
    cachedReplicateModel = modelId;
  }

  const normalizedAspect = typeof aspectRatio === "string" ? aspectRatio.trim() : "1:1";
  const cappedCount = Math.max(1, Math.min(Number.isFinite(count) ? Number(count) : 1, 4));
  const guidance = typeof stylization === "number" ? Math.max(1, Math.min(15, stylization / 10 + 1)) : 1.5;

  const payload: Record<string, unknown> = {
    version,
    input: {
      prompt: `${prompt.trim()} | Identidade Merse AI 1.0, brilho cósmico e partículas orbitais.`,
      num_outputs: cappedCount,
      aspect_ratio: normalizedAspect || "1:1",
      guidance,
    },
  };

  if (referenceImage) {
    (payload.input as Record<string, unknown>).image = referenceImage;
  }

  const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
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
      composed || "Falha ao iniciar a geração na Replicate. Verifique se o modelo aceita prompts de texto.",
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
    providerKey === "merse" ? "merse" : providerKey === "flux" ? "flux" : "openai";

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

    const response =
      provider === "merse"
        ? await generateWithReplicate(commonPayload)
        : await generateWithOpenAI(commonPayload);

    return res.status(200).json({ ...response, provider });
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a imagem agora. Tente novamente.";
    return res.status(500).json({ error: message });
  }
}
