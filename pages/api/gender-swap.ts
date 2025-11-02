import type { NextApiRequest, NextApiResponse } from "next";

type SuccessResponse = {
  imageUrl: string;
  provider: "replicate";
};

type ErrorResponse = {
  error: string;
};

const REPLICATE_BASE_URL = "https://api.replicate.com/v1";

let cachedVersion: { model: string; version: string } | null = null;

const TARGET_REFERENCES: Record<
  "masculino" | "feminino",
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

function extractBase64Payload(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (match) {
    return { mime: match[1], base64: match[2] };
  }
  return { mime: "image/png", base64: dataUrl };
}

async function resolveModelVersion(token: string, model: string) {
  const response = await fetch(`${REPLICATE_BASE_URL}/models/${model}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = typeof json?.error?.message === "string" ? json.error.message : null;
    throw new Error(
      apiMessage ??
        "Não foi possível descobrir a versão do modelo na Replicate. Defina REPLICATE_MERSE_MODEL_VERSION no .env.local.",
    );
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Resposta da Replicate não retornou a versão mais recente do modelo.");
  }

  cachedVersion = { model, version };
  return version;
}

async function ensureVersion(token: string, model: string, versionFromEnv?: string | null) {
  if (typeof versionFromEnv === "string" && versionFromEnv.trim().length > 0) {
    cachedVersion = { model, version: versionFromEnv.trim() };
    return versionFromEnv.trim();
  }

  if (cachedVersion && cachedVersion.model === model) {
    return cachedVersion.version;
  }

  return resolveModelVersion(token, model);
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

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok || !json) {
    console.error("Falha ao iniciar previsão na Replicate:", json);
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : "Falha ao iniciar geração na Replicate.";
    const details =
      typeof json?.error?.details === "string" ? ` ${json.error.details}` : "";
    throw new Error(`${message}${details}`);
  }

  if (typeof json.id !== "string" || json.id.length === 0) {
    throw new Error("A Replicate não retornou um identificador de predição.");
  }

  return json as { id: string; status: string };
}

async function awaitPrediction(token: string, id: string) {
  const maxAttempts = 40;
  const delay = 2500;
  let lastPayload: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`${REPLICATE_BASE_URL}/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const json = await response.json().catch(() => ({}));
    lastPayload = json;

    if (!response.ok) {
      const message =
        typeof json?.error?.message === "string"
          ? json.error.message
          : "Erro ao consultar status na Replicate.";
      throw new Error(message);
    }

    const status = json?.status;
    if (status === "succeeded") {
      return json;
    }

    if (status === "failed" || status === "canceled") {
      const message =
        typeof json?.error?.message === "string"
          ? json.error.message
          : "A geração na Replicate falhou ou foi cancelada.";
      const details =
        typeof json?.error?.details === "string" ? ` ${json.error.details}` : "";
      throw new Error(`${message}${details}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  console.error("Tempo esgotado aguardando a Replicate:", lastPayload);
  throw new Error("Tempo esgotado aguardando a Replicate finalizar a transformação.");
}

function collectImage(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string") {
    return payload.startsWith("http") || payload.startsWith("data:") ? payload : null;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = collectImage(item);
      if (found) return found;
    }
  }
  if (typeof payload === "object") {
    for (const value of Object.values(payload as Record<string, unknown>)) {
      const found = collectImage(value);
      if (found) return found;
    }
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res
      .status(500)
      .json({ error: "Configure REPLICATE_API_TOKEN no .env.local para usar esta função." });
  }

  const model = process.env.REPLICATE_GENDER_SWAP_MODEL?.trim() || "easel/advanced-face-swap";
  const versionFromEnv = process.env.REPLICATE_GENDER_SWAP_MODEL_VERSION;

  const { image, targetGender, intensity, prompt } = req.body as {
    image?: string;
    targetGender?: string;
    intensity?: number;
    prompt?: string;
  };

  if (typeof image !== "string" || image.trim().length === 0) {
    return res.status(400).json({ error: "Envie uma foto válida para realizar a transformação." });
  }

  const genderKey = typeof targetGender === "string" ? targetGender.toLowerCase() : "";
  const targetKey: "masculino" | "feminino" = genderKey === "feminino" ? "feminino" : "masculino";
  const targetReference = TARGET_REFERENCES[targetKey];

  const normalizedIntensity =
    typeof intensity === "number" && Number.isFinite(intensity) ? Math.min(100, Math.max(0, intensity)) : 65;
  const intensityNote =
    normalizedIntensity >= 75
      ? "Adapte cabelo e estética para combinar com o novo gênero."
      : normalizedIntensity <= 35
      ? "Mantenha quase todas as características originais, alterando apenas detalhes necessários."
      : "Ajuste equilibradamente traços faciais e cabelo, mantendo identidade evidente.";

  const userPrompt = typeof prompt === "string" && prompt.trim().length > 0 ? prompt.trim() : "";

  try {
    const resolvedVersion = await ensureVersion(token, model, versionFromEnv);

    const { base64, mime } = extractBase64Payload(image);

    const stylePrompt = [targetReference.prompt, intensityNote, userPrompt].filter(Boolean).join(" ");

    const input: Record<string, unknown> = {
      swap_image: `data:${mime};base64,${base64}`,
      target_image: targetReference.targetImage,
      user_gender: targetReference.userGender,
      user_b_gender: targetReference.userBGender,
      hair_source: normalizedIntensity >= 60 ? "target" : "swap",
      upscale: normalizedIntensity >= 55,
      detailer: normalizedIntensity >= 45,
    };
    if (stylePrompt.length > 0) {
      input.prompt = stylePrompt;
    }

    const payload = {
      version: resolvedVersion,
      input,
    };

    let creation;
    try {
      creation = await createPrediction(token, payload);
    } catch (predictionError) {
      const errorMessage =
        predictionError instanceof Error ? predictionError.message.toLowerCase() : "";
      if (input.prompt && errorMessage.includes("prompt")) {
        delete input.prompt;
        creation = await createPrediction(token, { version: resolvedVersion, input });
      } else {
        throw predictionError;
      }
    }
    const finalStatus = await awaitPrediction(token, creation.id);
    const outputImage = collectImage(finalStatus?.output);

    if (!outputImage) {
      throw new Error("A Replicate não retornou a imagem transformada.");
    }

    return res.status(200).json({ imageUrl: outputImage, provider: "replicate" });
  } catch (error) {
    console.error("Erro ao transformar gênero via Replicate:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a transformação agora. Tente novamente em instantes.";
    return res.status(500).json({ error: message });
  }
}
