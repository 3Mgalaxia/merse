import type { NextApiRequest, NextApiResponse } from "next";

type MeshyResponse = {
  renders: Array<{ url: string; format?: string; angle?: string }>;
  downloads?: Array<{ type: string; url: string }>;
};

type ErrorResponse = {
  error: string;
};

const MESHY_TEXT_TO_3D_URL = "https://api.meshy.ai/v2/text-to-3d";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MeshyResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Chave da Meshy não configurada. Defina MESHY_API_KEY no .env.local." });
  }

  const { prompt, material, lighting, detail, references } = req.body as {
    prompt?: string;
    material?: string;
    lighting?: string;
    detail?: number;
    references?: { product?: string | null; brand?: string | null };
  };

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Forneça um prompt válido para gerar o objeto." });
  }

  const composedPrompt = [
    prompt.trim(),
    material ? `Material preferido: ${material}.` : null,
    lighting ? `Iluminação sugerida: ${lighting}.` : null,
    typeof detail === "number" ? `Nível de detalhes: ${detail}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const payload: Record<string, unknown> = {
    mode: "preview",
    prompt: composedPrompt,
    negative_prompt: "low quality, blurry, artifacts, distorted geometry, clipping, broken topology",
  };

  const isHttpUrl = (value: string | null): value is string =>
    !!value && /^https?:\/\//i.test(value);

  if (isHttpUrl(references?.product ?? null)) {
    payload.reference_image_url = references?.product;
  }
  if (isHttpUrl(references?.brand ?? null)) {
    payload.logo_image_url = references?.brand;
  }

  try {
    const initialResponse = await fetch(MESHY_TEXT_TO_3D_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const initialJson = await initialResponse.json().catch(() => ({}));

    if (!initialResponse.ok) {
      const message =
        typeof initialJson?.message === "string"
          ? initialJson.message
          : "Falha ao iniciar geração na Meshy.";
      throw new Error(message);
    }

    const taskId: string | undefined =
      initialJson.result?.task_id || initialJson.task_id || initialJson.id || initialJson.taskId;

    const collectPreviewUrls = (payload: any): string[] => {
      if (!payload) return [];
      if (Array.isArray(payload.preview_urls)) {
        return payload.preview_urls.filter((url: unknown) => typeof url === "string");
      }
      if (Array.isArray(payload.preview_images)) {
        return payload.preview_images.filter((url: unknown) => typeof url === "string");
      }
      if (typeof payload.preview_url === "string") {
        return [payload.preview_url];
      }
      if (typeof payload.thumbnail_url === "string") {
        return [payload.thumbnail_url];
      }
      if (typeof payload.image === "string") {
        return [payload.image];
      }
      return [];
    };

    let previewUrls: string[] = collectPreviewUrls(initialJson.result);
    let downloadUrls: Array<{ type: string; url: string }> = [];
    if (initialJson?.result?.model_urls) {
      downloadUrls = Object.entries(initialJson.result.model_urls)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([type, url]) => ({ type, url }));
    }

    if (!previewUrls.length && taskId) {
      const maxAttempts = 15;
      const delay = 2000;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        const statusResponse = await fetch(`${MESHY_TEXT_TO_3D_URL}/${taskId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        const statusJson = await statusResponse.json().catch(() => ({}));

        if (!statusResponse.ok) {
          const message =
            typeof statusJson?.message === "string"
              ? statusJson.message
              : "Falha ao consultar status da Meshy.";
          throw new Error(message);
        }

        const taskStatus = statusJson.status || statusJson.state;
        if (taskStatus === "FAILED") {
          throw new Error(statusJson.error || "Tarefa da Meshy falhou.");
        }

        if (taskStatus === "SUCCEEDED" || taskStatus === "COMPLETED") {
          previewUrls = collectPreviewUrls(statusJson.result);
          if (statusJson?.result?.model_urls) {
            downloadUrls = Object.entries(statusJson.result.model_urls)
              .filter((entry): entry is [string, string] => typeof entry[1] === "string")
              .map(([type, url]) => ({ type, url }));
          }
          break;
        }
      }
    }

    if (!previewUrls.length && !downloadUrls.length) {
      throw new Error("A Meshy não retornou pré-visualizações do objeto.");
    }

    return res.status(200).json({
      renders: previewUrls.map((url) => ({ url })),
      downloads: downloadUrls,
    });
  } catch (error) {
    console.error("Erro ao gerar objeto com Meshy:", error);
    const message =
      error instanceof Error
        ? /NoMatchingRoute/i.test(error.message)
          ? "Endpoint da Meshy não disponível. Confirme se sua chave possui acesso ao recurso Text-to-3D."
          : error.message
        : "Não foi possível gerar o objeto agora. Tente novamente em instantes.";
    return res.status(500).json({ error: message });
  }
}
