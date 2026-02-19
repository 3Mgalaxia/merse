import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { isR2Enabled, uploadBufferToR2 } from "@/server/storage/r2";

type RenderItem = {
  url: string;
  format?: string;
  angle?: string;
  provider?: string;
};

type DownloadItem = {
  type: string;
  url: string;
  provider?: string;
};

type SuccessResponse = {
  renders: RenderItem[];
  downloads?: DownloadItem[];
  provider: string;
  providersTried: string[];
  notes?: string[];
};

type ErrorResponse = {
  error: string;
  details?: string[];
};

type ObjectRequestBody = {
  prompt?: unknown;
  material?: unknown;
  lighting?: unknown;
  detail?: unknown;
  references?: {
    product?: unknown;
    brand?: unknown;
  };
};

type ProviderResult = {
  provider: string;
  renders: RenderItem[];
  downloads: DownloadItem[];
  notes?: string[];
};

type PredictionStatus = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: { message?: string; details?: string };
};

const MESHY_TEXT_TO_3D_URL = "https://api.meshy.ai/v2/text-to-3d";
const REPLICATE_API_URL = "https://api.replicate.com/v1";
const replicateVersionCache = new Map<string, string>();

const MATERIAL_HINTS: Record<string, string> = {
  metallic: "acabamento metálico cromado com reflexos frios",
  matte: "acabamento matte premium com contraste limpo",
  holographic: "acabamento holográfico prismático com refração",
  organic: "acabamento orgânico com textura natural detalhada",
};

const LIGHTING_HINTS: Record<string, string> = {
  studio: "luz de estúdio com key frontal e rim sutil",
  cyberpunk: "backlight magenta e preenchimento ciano em clima cyberpunk",
  galaxy: "luz volumétrica com névoa galáctica e partículas",
  daylight: "luz difusa natural com sombras suaves",
};

const MODEL_URL_EXTENSIONS =
  /\.(glb|gltf|obj|fbx|usdz|usd|stl|ply|3mf|blend|zip|rar)(\?.*)?$/i;
const IMAGE_URL_EXTENSIONS = /\.(png|jpe?g|webp|avif|gif|bmp|svg)(\?.*)?$/i;

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

function normalizeDetail(value: unknown) {
  const fallback = 70;
  const raw = typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(20, Math.min(100, Math.round(raw)));
}

function normalizeReferenceInput(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return undefined;
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
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("avif")) return "avif";
  return "bin";
}

async function resolvePublicReference(reference: string | undefined, keyPrefix: string) {
  if (!reference) return { raw: undefined as string | undefined, publicUrl: undefined as string | undefined, note: undefined as string | undefined };
  if (reference.startsWith("http://") || reference.startsWith("https://")) {
    return { raw: reference, publicUrl: reference, note: undefined };
  }

  if (!reference.startsWith("data:image/")) {
    return { raw: undefined, publicUrl: undefined, note: "Referência ignorada por formato inválido." };
  }

  if (!isR2Enabled()) {
    return {
      raw: reference,
      publicUrl: undefined,
      note: "Referência local detectada, mas o upload público (R2) não está configurado.",
    };
  }

  const parsed = extractDataUrl(reference);
  if (!parsed) {
    return { raw: reference, publicUrl: undefined, note: "Não foi possível decodificar a referência enviada." };
  }

  const ext = extensionFromMime(parsed.mime);
  const key = `generated/${randomUUID()}/${keyPrefix}.${ext}`;
  try {
    const uploaded = await uploadBufferToR2({
      buffer: parsed.buffer,
      contentType: parsed.mime,
      key,
    });
    if (uploaded) {
      return { raw: reference, publicUrl: uploaded, note: undefined };
    }
  } catch (error) {
    console.error("[generate-object] falha no upload de referência para R2:", error);
  }

  return {
    raw: reference,
    publicUrl: undefined,
    note: "Não foi possível publicar a referência; alguns provedores podem ignorá-la.",
  };
}

function buildObjectPrompt(params: {
  prompt: string;
  material: string;
  lighting: string;
  detail: number;
}) {
  const materialHint = MATERIAL_HINTS[params.material] ?? params.material;
  const lightingHint = LIGHTING_HINTS[params.lighting] ?? params.lighting;

  return [
    params.prompt,
    `Material principal: ${materialHint}.`,
    `Iluminação: ${lightingHint}.`,
    `Detalhe visual: ${params.detail}/100.`,
    "Produto premium com estética holográfica, composição publicitária e acabamento cinematográfico.",
    "Gerar variações orbitais de câmera em fundo limpo para campanhas digitais.",
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeStatus(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isProcessingStatus(status: string) {
  return ["starting", "processing", "pending", "queued", "running", "in_progress"].includes(status);
}

function isSuccessStatus(status: string) {
  return ["succeeded", "success", "completed", "complete", "done", "finished"].includes(status);
}

function isFailureStatus(status: string) {
  return ["failed", "error", "canceled", "cancelled"].includes(status);
}

function extractTaskId(payload: any): string | undefined {
  const id =
    payload?.result?.task_id ??
    payload?.task_id ??
    payload?.taskId ??
    payload?.id ??
    payload?.result?.id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}

function walkPayload(
  payload: unknown,
  visitor: (value: unknown, key?: string) => void,
  seen = new Set<unknown>(),
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
    for (const item of payload) {
      walkPayload(item, visitor, seen, key);
    }
    return;
  }

  for (const [childKey, childValue] of Object.entries(payload as Record<string, unknown>)) {
    walkPayload(childValue, visitor, seen, childKey);
  }
}

function collectImageUrls(payload: unknown) {
  const urls: string[] = [];
  walkPayload(payload, (value, key) => {
    if (typeof value !== "string") return;
    const loweredKey = (key ?? "").toLowerCase();
    const looksLikeHttp = value.startsWith("http://") || value.startsWith("https://");
    const looksLikeDataImage = value.startsWith("data:image/");
    if (!looksLikeHttp && !looksLikeDataImage) return;

    if (looksLikeHttp && MODEL_URL_EXTENSIONS.test(value)) return;

    const keyHintsImage =
      loweredKey.includes("image") ||
      loweredKey.includes("preview") ||
      loweredKey.includes("thumb") ||
      loweredKey.includes("render") ||
      loweredKey.includes("cover") ||
      loweredKey.includes("poster");
    const extensionSuggestsImage = IMAGE_URL_EXTENSIONS.test(value);

    if (looksLikeDataImage || extensionSuggestsImage || keyHintsImage) {
      urls.push(value);
    }
  });

  return Array.from(new Set(urls));
}

function normalizeDownloadType(url: string, fallbackKey?: string) {
  const key = (fallbackKey ?? "").toLowerCase();
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".glb") || key.includes("glb")) return "glb";
  if (clean.endsWith(".gltf") || key.includes("gltf")) return "gltf";
  if (clean.endsWith(".obj") || key.includes("obj")) return "obj";
  if (clean.endsWith(".usdz") || key.includes("usdz")) return "usdz";
  if (clean.endsWith(".fbx") || key.includes("fbx")) return "fbx";
  if (clean.endsWith(".stl") || key.includes("stl")) return "stl";
  if (clean.endsWith(".zip") || key.includes("zip")) return "zip";
  return "model";
}

function collectDownloadUrls(payload: unknown) {
  const items: DownloadItem[] = [];

  const looksLikeModelKey = (key?: string) => {
    const lowered = (key ?? "").toLowerCase();
    return (
      lowered.includes("model") ||
      lowered.includes("mesh") ||
      lowered.includes("geometry") ||
      lowered.includes("glb") ||
      lowered.includes("gltf") ||
      lowered.includes("obj") ||
      lowered.includes("usdz") ||
      lowered.includes("fbx") ||
      lowered.includes("stl")
    );
  };

  const append = (url: string, key?: string) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) return;
    if (!MODEL_URL_EXTENSIONS.test(url) && !looksLikeModelKey(key)) return;
    items.push({ type: normalizeDownloadType(url, key), url });
  };

  if (payload && typeof payload === "object") {
    const candidate = payload as any;
    const directModelUrls = candidate.model_urls ?? candidate.modelUrls ?? candidate.downloads ?? candidate.files;

    if (Array.isArray(directModelUrls)) {
      for (const value of directModelUrls) {
        if (typeof value === "string") append(value, "model_urls");
        if (value && typeof value === "object" && typeof (value as any).url === "string") {
          append((value as any).url, "model_urls");
        }
      }
    } else if (directModelUrls && typeof directModelUrls === "object") {
      for (const [k, value] of Object.entries(directModelUrls as Record<string, unknown>)) {
        if (typeof value === "string") append(value, k);
        if (value && typeof value === "object" && typeof (value as any).url === "string") {
          append((value as any).url, k);
        }
      }
    }

    const directKeys = [
      "model_mesh",
      "modelMesh",
      "mesh",
      "mesh_url",
      "meshUrl",
      "model",
      "model_url",
      "modelUrl",
      "glb",
      "gltf",
      "obj",
      "usdz",
      "fbx",
      "stl",
      "geometry",
      "geometry_url",
      "geometryUrl",
    ];
    for (const key of directKeys) {
      const value = candidate[key];
      if (typeof value === "string") append(value, key);
      if (value && typeof value === "object" && typeof (value as any).url === "string") {
        append((value as any).url, key);
      }
    }
  }

  walkPayload(payload, (value, key) => {
    if (typeof value !== "string") return;
    append(value, key);
  });

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function collectMeshyPreviewUrls(payload: any): string[] {
  if (!payload || typeof payload !== "object") return [];
  const candidate = payload as Record<string, unknown>;
  const urls: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))) {
      if (!MODEL_URL_EXTENSIONS.test(value)) {
        urls.push(value);
      }
    }
  };

  if (Array.isArray(candidate.preview_urls)) {
    for (const item of candidate.preview_urls) push(item);
  }
  if (Array.isArray(candidate.preview_images)) {
    for (const item of candidate.preview_images) push(item);
  }
  push(candidate.preview_url);
  push(candidate.thumbnail_url);
  push(candidate.image);
  push(candidate.render_url);
  if (candidate.images && Array.isArray(candidate.images)) {
    for (const item of candidate.images) push(item);
  }

  return Array.from(new Set(urls));
}

function collectMeshyDownloads(payload: any): DownloadItem[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = payload as Record<string, unknown>;
  const modelUrls = raw.model_urls ?? raw.modelUrls;
  if (!modelUrls || typeof modelUrls !== "object") return [];

  return Object.entries(modelUrls as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([type, url]) => ({ type: normalizeDownloadType(url, type), url }));
}

function mergeDownloads(...groups: DownloadItem[][]) {
  const map = new Map<string, DownloadItem>();
  for (const group of groups) {
    for (const item of group) {
      if (!item?.url) continue;
      if (!map.has(item.url)) {
        map.set(item.url, item);
      }
    }
  }
  return Array.from(map.values());
}

async function runMeshyProvider(params: {
  prompt: string;
  productReferenceUrl?: string;
  brandReferenceUrl?: string;
}): Promise<ProviderResult> {
  const apiKey = (process.env.MESHY_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("MESHY_API_KEY não configurada.");
  }

  const payload: Record<string, unknown> = {
    mode: "preview",
    prompt: params.prompt,
    negative_prompt:
      "low quality, blurry, noisy texture, broken topology, distorted geometry, clipping, watermark",
  };

  if (params.productReferenceUrl) {
    payload.reference_image_url = params.productReferenceUrl;
  }
  if (params.brandReferenceUrl) {
    payload.logo_image_url = params.brandReferenceUrl;
  }

  const creationResponse = await fetch(MESHY_TEXT_TO_3D_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const creationJson = await creationResponse.json().catch(() => ({}));
  if (!creationResponse.ok) {
    const message =
      typeof (creationJson as any)?.message === "string"
        ? (creationJson as any).message
        : "Falha ao iniciar geração 3D na Meshy.";
    throw new Error(message);
  }

  let latestPayload: any = (creationJson as any)?.result ?? creationJson;
  let renders = collectMeshyPreviewUrls(latestPayload).map((url) => ({ url, provider: "meshy" }));
  let downloads = collectMeshyDownloads(latestPayload).map((item) => ({ ...item, provider: "meshy" }));
  const taskId = extractTaskId(creationJson);
  let taskStatus = normalizeStatus(
    (creationJson as any)?.status ?? (creationJson as any)?.state ?? (creationJson as any)?.result?.status,
  );

  if ((isProcessingStatus(taskStatus) || (!renders.length && taskId)) && taskId) {
    const maxAttempts = 25;
    const delayMs = 2500;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await sleep(delayMs);
      const statusResponse = await fetch(`${MESHY_TEXT_TO_3D_URL}/${taskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });
      const statusJson = await statusResponse.json().catch(() => ({}));

      if (!statusResponse.ok) {
        const message =
          typeof (statusJson as any)?.message === "string"
            ? (statusJson as any).message
            : "Falha ao consultar status na Meshy.";
        throw new Error(message);
      }

      latestPayload = (statusJson as any)?.result ?? statusJson;
      taskStatus = normalizeStatus((statusJson as any)?.status ?? (statusJson as any)?.state);
      renders = collectMeshyPreviewUrls(latestPayload).map((url) => ({ url, provider: "meshy" }));
      downloads = collectMeshyDownloads(latestPayload).map((item) => ({ ...item, provider: "meshy" }));

      if (isFailureStatus(taskStatus)) {
        const reason =
          typeof (statusJson as any)?.error === "string"
            ? (statusJson as any).error
            : typeof (statusJson as any)?.message === "string"
            ? (statusJson as any).message
            : "A tarefa 3D falhou na Meshy.";
        throw new Error(reason);
      }

      if (isSuccessStatus(taskStatus) || renders.length > 0 || downloads.length > 0) {
        break;
      }
    }
  }

  return {
    provider: "meshy",
    renders,
    downloads,
  };
}

function resolveMerse3DPollUrl(payload: any, endpoint: string, taskId?: string) {
  const explicit =
    payload?.status_url ??
    payload?.statusUrl ??
    payload?.poll_url ??
    payload?.pollUrl ??
    payload?.result?.status_url ??
    payload?.result?.statusUrl;
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim();
  }
  if (taskId) {
    return `${endpoint.replace(/\/+$/, "")}/status?taskId=${encodeURIComponent(taskId)}`;
  }
  return undefined;
}

async function runMerse3DProvider(params: {
  prompt: string;
  material: string;
  lighting: string;
  detail: number;
  productReferenceRaw?: string;
  brandReferenceRaw?: string;
  productReferenceUrl?: string;
  brandReferenceUrl?: string;
}): Promise<ProviderResult> {
  const endpoint = (process.env.MERSE_3D_API_URL ?? process.env.NEXT_PUBLIC_MERSE_3D_API_URL ?? "").trim();
  if (!endpoint) {
    throw new Error("MERSE_3D_API_URL/NEXT_PUBLIC_MERSE_3D_API_URL não configurada.");
  }

  const requestPayload: Record<string, unknown> = {
    prompt: params.prompt,
    material: params.material,
    lighting: params.lighting,
    detail: params.detail,
    modelVersion: process.env.MERSE_3D_MODEL_VERSION,
    references: {
      product: params.productReferenceRaw,
      brand: params.brandReferenceRaw,
      product_url: params.productReferenceUrl,
      brand_url: params.brandReferenceUrl,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof (json as any)?.error === "string"
        ? (json as any).error
        : typeof (json as any)?.message === "string"
        ? (json as any).message
        : "Falha no serviço Merse 3D API.";
    throw new Error(message);
  }

  let latest = json;
  let renders = collectImageUrls(latest).map((url) => ({ url, provider: "merse-3d-api" }));
  let downloads = collectDownloadUrls(latest).map((entry) => ({ ...entry, provider: "merse-3d-api" }));
  const taskId = extractTaskId(json);
  const pollUrl = resolveMerse3DPollUrl(json, endpoint, taskId);
  let status = normalizeStatus((json as any)?.status ?? (json as any)?.state);

  if (pollUrl && (isProcessingStatus(status) || (!renders.length && taskId))) {
    const maxAttempts = 25;
    const delayMs = 2500;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await sleep(delayMs);
      const statusResponse = await fetch(pollUrl, {
        headers: {
          Accept: "application/json",
        },
      });
      const statusJson = await statusResponse.json().catch(() => ({}));

      if (!statusResponse.ok) {
        break;
      }

      latest = statusJson;
      status = normalizeStatus((statusJson as any)?.status ?? (statusJson as any)?.state);
      renders = collectImageUrls(latest).map((url) => ({ url, provider: "merse-3d-api" }));
      downloads = collectDownloadUrls(latest).map((entry) => ({ ...entry, provider: "merse-3d-api" }));

      if (isFailureStatus(status)) {
        const message =
          typeof (statusJson as any)?.error === "string"
            ? (statusJson as any).error
            : typeof (statusJson as any)?.message === "string"
            ? (statusJson as any).message
            : "Job falhou no Merse 3D API.";
        throw new Error(message);
      }

      if (isSuccessStatus(status) || renders.length > 0 || downloads.length > 0) {
        break;
      }
    }
  }

  return {
    provider: "merse-3d-api",
    renders,
    downloads,
  };
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
      typeof (json as any)?.error?.message === "string"
        ? (json as any).error.message
        : "Não foi possível resolver a versão do modelo na Replicate.";
    throw new Error(message);
  }

  const version = (json as any)?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error(`Modelo ${model} sem latest_version na Replicate.`);
  }
  return version.trim();
}

async function ensureReplicateVersion(token: string, model: string, preferredVersion?: string) {
  if (preferredVersion?.trim()) {
    const trimmed = preferredVersion.trim();
    replicateVersionCache.set(model, trimmed);
    return trimmed;
  }

  const cached = replicateVersionCache.get(model);
  if (cached) return cached;

  const resolved = await resolveReplicateVersion(token, model);
  replicateVersionCache.set(model, resolved);
  return resolved;
}

async function createReplicatePrediction(token: string, payload: Record<string, unknown>) {
  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
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
        : `Falha ao iniciar predição 3D na Replicate (status ${response.status}).`;
    const details = typeof json?.error?.details === "string" ? ` ${json.error.details}` : "";
    throw new Error(`${message}${details}`);
  }
  if (typeof json.id !== "string" || !json.id.trim()) {
    throw new Error("Replicate não retornou id da predição.");
  }
  return json;
}

async function waitForReplicatePrediction(token: string, predictionId: string) {
  const maxAttempts = 45;
  const delayMs = 2500;
  let latest: PredictionStatus = {};

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
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

    const status = normalizeStatus(latest.status);
    if (isSuccessStatus(status)) {
      return latest;
    }
    if (isFailureStatus(status)) {
      const message =
        typeof latest?.error?.message === "string"
          ? latest.error.message
          : "Geração 3D falhou na Replicate.";
      const details = typeof latest?.error?.details === "string" ? ` ${latest.error.details}` : "";
      throw new Error(`${message}${details}`);
    }

    await sleep(delayMs);
  }

  throw new Error("Tempo esgotado aguardando a Replicate finalizar o modelo 3D.");
}

async function runReplicate3DProvider(params: {
  prompt: string;
  productReferenceRaw?: string;
  productReferenceUrl?: string;
  brandReferenceUrl?: string;
  detail: number;
}): Promise<ProviderResult> {
  const token = (
    process.env.REPLICATE_OBJECT_3D_API_TOKEN ??
    process.env.REPLICATE_MERSE_API_TOKEN ??
    process.env.REPLICATE_API_TOKEN
  )?.trim();
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN (ou REPLICATE_OBJECT_3D_API_TOKEN) não configurado.");
  }

  const model = (
    process.env.REPLICATE_OBJECT_3D_MODEL ??
    process.env.REPLICATE_3D_MODEL ??
    "hyper3d/rodin"
  ).trim();
  // NOTE: Do NOT fall back to MERSE_3D_MODEL_VERSION here. That env is used by the separate Merse 3D API
  // and can accidentally point Replicate to a completely different model version (often returning 2D images).
  const preferredVersion =
    process.env.REPLICATE_OBJECT_3D_MODEL_VERSION ?? process.env.REPLICATE_3D_MODEL_VERSION;
  const version = await ensureReplicateVersion(token, model, preferredVersion);
  const reference = params.productReferenceUrl ?? params.productReferenceRaw;

  const quality =
    params.detail >= 85 ? "high" : params.detail >= 65 ? "medium" : params.detail >= 45 ? "low" : "extra-low";
  const promptWithHint = `${params.prompt}`.trim();

  const inputVariants: Array<Record<string, unknown>> = [];
  if (reference) {
    // Hyper3D/Rodin-style schema (commonly used by text/image-to-3D wrappers).
    inputVariants.push({
      prompt: promptWithHint,
      input_image_urls: [reference],
      geometry_file_format: "glb",
      material: "PBR",
      quality,
      tier: "Regular",
    });
    inputVariants.push({
      // Some implementations accept a single string instead of list<string>.
      prompt: promptWithHint,
      input_image_urls: reference,
      geometry_file_format: "glb",
      material: "PBR",
      quality,
      tier: "Regular",
    });
    inputVariants.push({
      // Legacy guesses (keep for compatibility with other 3D models).
      prompt: promptWithHint,
      image: reference,
    });
    inputVariants.push({
      prompt: promptWithHint,
      reference_image: reference,
    });
  }
  inputVariants.push({
    // Text-to-3D variant (no images).
    prompt: promptWithHint,
    geometry_file_format: "glb",
    material: "PBR",
    quality,
    tier: "Regular",
  });

  let lastError: unknown = null;
  for (const input of inputVariants) {
    try {
      const created = await createReplicatePrediction(token, {
        version,
        input,
      });
      const final = await waitForReplicatePrediction(token, created.id as string);
      const renders = collectImageUrls(final.output).map((url) => ({
        url,
        provider: "replicate-3d",
      }));
      const downloads = collectDownloadUrls(final.output).map((entry) => ({
        ...entry,
        provider: "replicate-3d",
      }));

      if (renders.length || downloads.length) {
        return {
          provider: "replicate-3d",
          renders,
          downloads,
        };
      }

      throw new Error("Replicate concluiu sem imagens de preview e sem arquivos de modelo.");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha na geração 3D via Replicate.");
}

async function runOpenAIRenderFallback(params: {
  prompt: string;
  productReferenceRaw?: string;
  detail: number;
}): Promise<ProviderResult> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const model = (process.env.OPENAI_OBJECT_RENDER_MODEL ?? "gpt-image-1").trim();
  const requestPayload: OpenAI.ImageGenerateParams = {
    model,
    prompt: [
      params.prompt,
      "Create premium product campaign renders with orbital camera variation.",
      "Keep clean composition, high realism, reflections and holographic accents.",
      "Do not add text, watermark, logo overlays, or UI elements.",
    ].join(" "),
    n: 2,
    size: "auto",
    quality: params.detail >= 70 ? "high" : "medium",
    ...(params.productReferenceRaw ? { image: params.productReferenceRaw } : {}),
  };

  const response = await openai.images.generate(requestPayload);
  const renders: RenderItem[] = [];
  for (let index = 0; index < (response.data?.length ?? 0); index += 1) {
    const item = response.data?.[index];
    if (!item) continue;

    if (item.url && !item.url.toLowerCase().startsWith("data:")) {
      renders.push({
        url: item.url,
        provider: "openai-render",
        angle: index === 0 ? "Hero" : `Orbital ${index + 1}`,
      });
      continue;
    }

    if (item.b64_json) {
      const buffer = Buffer.from(item.b64_json, "base64");
      let uploaded: string | null = null;
      if (isR2Enabled()) {
        uploaded = await uploadBufferToR2({
          buffer,
          contentType: "image/png",
          key: `generated/${randomUUID()}/object-render-${index + 1}.png`,
        });
      }
      renders.push({
        url: uploaded ?? `data:image/png;base64,${item.b64_json}`,
        provider: "openai-render",
        angle: index === 0 ? "Hero" : `Orbital ${index + 1}`,
      });
    }
  }

  if (!renders.length) {
    throw new Error("OpenAI não retornou renders válidos.");
  }

  return {
    provider: "openai-render",
    renders,
    downloads: [],
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

  const body = (req.body ?? {}) as ObjectRequestBody;
  const prompt = sanitizeText(body.prompt, 1200);
  if (!prompt) {
    return res.status(400).json({ error: "Forneça um prompt válido para gerar o objeto." });
  }

  const material = sanitizeText(body.material, 80).toLowerCase() || "metallic";
  const lighting = sanitizeText(body.lighting, 80).toLowerCase() || "studio";
  const detail = normalizeDetail(body.detail);

  const productReferenceInput = normalizeReferenceInput(body.references?.product);
  const brandReferenceInput = normalizeReferenceInput(body.references?.brand);

  const [productReference, brandReference] = await Promise.all([
    resolvePublicReference(productReferenceInput, "object-product-reference"),
    resolvePublicReference(brandReferenceInput, "object-brand-reference"),
  ]);

  const sharedNotes = [productReference.note, brandReference.note].filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );

  const composedPrompt = buildObjectPrompt({
    prompt,
    material,
    lighting,
    detail,
  });

  const providersTried: string[] = [];
  const providerErrors: string[] = [];
  let accumulatedDownloads: DownloadItem[] = [];
  let fallbackResult: ProviderResult | null = null;

  const attempts: Array<{ key: string; run: () => Promise<ProviderResult> }> = [
    {
      key: "meshy",
      run: () =>
        runMeshyProvider({
          prompt: composedPrompt,
          productReferenceUrl: productReference.publicUrl,
          brandReferenceUrl: brandReference.publicUrl,
        }),
    },
    {
      key: "merse-3d-api",
      run: () =>
        runMerse3DProvider({
          prompt: composedPrompt,
          material,
          lighting,
          detail,
          productReferenceRaw: productReference.raw,
          brandReferenceRaw: brandReference.raw,
          productReferenceUrl: productReference.publicUrl,
          brandReferenceUrl: brandReference.publicUrl,
        }),
    },
    {
      key: "replicate-3d",
      run: () =>
        runReplicate3DProvider({
          prompt: composedPrompt,
          detail,
          productReferenceRaw: productReference.raw,
          productReferenceUrl: productReference.publicUrl,
          brandReferenceUrl: brandReference.publicUrl,
        }),
    },
    {
      key: "openai-render",
      run: () =>
        runOpenAIRenderFallback({
          prompt: composedPrompt,
          detail,
          productReferenceRaw: productReference.raw,
        }),
    },
  ];

  for (const attempt of attempts) {
    // Avoid spending extra on 2D-only fallback if we already have a preview render
    // and haven't obtained any 3D downloads so far.
    if (attempt.key === "openai-render" && fallbackResult && accumulatedDownloads.length === 0) {
      break;
    }

    providersTried.push(attempt.key);

    try {
      const result = await attempt.run();
      const taggedDownloads = result.downloads.map((item) => ({
        ...item,
        provider: item.provider ?? result.provider,
      }));
      accumulatedDownloads = mergeDownloads(accumulatedDownloads, taggedDownloads);

      if (!fallbackResult && result.renders.length > 0) {
        fallbackResult = result;
      }

      // Success for this endpoint is returning at least one 3D asset download. If a provider
      // only returns preview renders, keep trying the next provider until we find a 3D file.
      if (accumulatedDownloads.length > 0) {
        return res.status(200).json({
          provider: result.provider,
          providersTried,
          renders: result.renders.length > 0 ? result.renders : fallbackResult?.renders ?? [],
          downloads: accumulatedDownloads,
          notes: [...sharedNotes, ...(result.notes ?? [])],
        });
      }
    } catch (error) {
      const message = toErrorMessage(error, `Falha no provedor ${attempt.key}.`);
      providerErrors.push(`${attempt.key}: ${message}`);
    }
  }

  if (fallbackResult?.renders?.length) {
    return res.status(200).json({
      provider: fallbackResult.provider,
      providersTried,
      renders: fallbackResult.renders,
      downloads: accumulatedDownloads.length ? accumulatedDownloads : undefined,
      notes: [
        ...sharedNotes,
        ...(fallbackResult.notes ?? []),
        "Somente renders de preview foram gerados; nenhum arquivo 3D foi retornado pelos provedores.",
      ],
    });
  }

  return res.status(500).json({
    error: "Não foi possível gerar o objeto com os provedores disponíveis agora.",
    details: providerErrors.slice(0, 5),
  });
}
