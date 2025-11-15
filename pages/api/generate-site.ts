import type { NextApiRequest, NextApiResponse } from "next";

const REPLICATE_BASE = "https://api.replicate.com/v1";

type SuccessResponse = {
  id: string;
  status: string;
  output?: unknown;
  metrics?: unknown;
  logs?: string;
};

type ErrorResponse = { error: string };

async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  let parsed: any = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      typeof parsed?.error?.message === "string"
        ? parsed.error.message
        : `Falha ao acessar ${url}: ${response.status}`;
    throw new Error(message);
  }
  return parsed;
}

async function resolveVersion(token: string, modelSlug: string, version?: string | null) {
  if (version && version.trim()) return version.trim();
  const model = await fetchJson(`${REPLICATE_BASE}/models/${modelSlug}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const latest = model?.latest_version?.id;
  if (typeof latest !== "string" || !latest) {
    throw new Error(
      "Não foi possível descobrir a versão padrão do modelo. Informe REPLICATE_MERSE_MODEL_VERSION no .env.local.",
    );
  }
  return latest;
}

async function pollPrediction(token: string, predictionId: string) {
  const maxAttempts = 60;
  const delay = 2000;
  let statusPayload: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    statusPayload = await fetchJson(`${REPLICATE_BASE}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!["starting", "processing"].includes(statusPayload?.status)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  if (statusPayload?.status !== "succeeded") {
    const message =
      typeof statusPayload?.error === "string"
        ? statusPayload.error
        : typeof statusPayload?.error?.message === "string"
        ? statusPayload.error.message
        : "A geração não pôde ser finalizada. Tente novamente.";
    throw new Error(message);
  }

  return statusPayload;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const { prompt, extras } = req.body ?? {};

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Forneça um prompt válido para gerar o site." });
  }

  const modelSlug = process.env.REPLICATE_MERSE_MODEL || "3mgalaxia/merse-gerador-de-site";
  const versionId =
    typeof process.env.REPLICATE_MERSE_MODEL_VERSION === "string"
      ? process.env.REPLICATE_MERSE_MODEL_VERSION
      : undefined;
  const token =
    process.env.REPLICATE_MERSE_SITE_TOKEN ??
    process.env.REPLICATE_MERSE_API_TOKEN ??
    process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return res
      .status(500)
      .json({ error: "Configure REPLICATE_MERSE_API_TOKEN ou REPLICATE_API_TOKEN para gerar sites." });
  }

  try {
    const version = await resolveVersion(token, modelSlug, versionId);
    const creation = await fetchJson(`${REPLICATE_BASE}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        version,
        input: {
          prompt: prompt.trim(),
          ...(extras && typeof extras === "object" ? extras : {}),
        },
      }),
    });

    const prediction = await pollPrediction(token, creation?.id as string);

    return res.status(200).json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      metrics: prediction.metrics,
      logs: prediction.logs,
    });
  } catch (error) {
    console.error("Erro ao gerar site:", error);
    const message =
      error instanceof Error ? error.message : "Não foi possível gerar o site no momento.";
    return res.status(500).json({ error: message });
  }
}
