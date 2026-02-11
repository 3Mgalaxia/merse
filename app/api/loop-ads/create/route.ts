import { NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";

const REPLICATE_API_URL = "https://api.replicate.com/v1";
const versionCache = new Map<string, string>();

type LoopPreset = "ecom" | "cosmic" | "minimal" | "premium";
type ElementMode = "none" | "orb" | "chroma_creature" | "mixed";
type ParticleStyle = "dust" | "comet" | "mixed";
type PaletteMode = "auto" | "manual";
type BackgroundMode = "studio_glass" | "cosmic_nebula" | "packshot_studio";
type TextAnim = "none" | "fade" | "slide" | "type";

function firstNonEmptyEnv(...keys: string[]) {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (value) return value;
  }
  return "";
}

function parseObject(body: unknown) {
  if (!body || typeof body !== "object") return {};
  return body as Record<string, unknown>;
}

function parseBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseString(value: unknown, fallback: string, maxLength = 120) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
}

function parseNumber(value: unknown, fallback: number, min: number, max: number, step?: number) {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  if (!Number.isFinite(raw)) return fallback;
  const clamped = Math.min(max, Math.max(min, raw));
  if (!step || step <= 0) return clamped;
  const steps = Math.round((clamped - min) / step);
  return min + steps * step;
}

function parseInteger(value: unknown, fallback: number, min: number, max: number) {
  const normalized = parseNumber(value, fallback, min, max);
  return Math.round(normalized);
}

function parseEnum<T extends string>(value: unknown, fallback: T, allowed: readonly T[]) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim() as T;
  if (allowed.includes(normalized)) return normalized;
  return fallback;
}

async function resolveModelVersion(token: string, model: string) {
  const response = await fetch(`${REPLICATE_API_URL}/models/${model}`, {
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
        : `Não foi possível resolver a versão do modelo ${model}.`;
    throw new Error(message);
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error(`Modelo ${model} sem latest_version na Replicate.`);
  }
  return version.trim();
}

async function ensureVersion(token: string, model: string, envVersion?: string | null) {
  if (typeof envVersion === "string" && envVersion.trim()) {
    const trimmed = envVersion.trim();
    versionCache.set(model, trimmed);
    return trimmed;
  }
  const cached = versionCache.get(model);
  if (cached) return cached;
  const resolved = await resolveModelVersion(token, model);
  versionCache.set(model, resolved);
  return resolved;
}

function normalizeOutputUrls(payload: unknown): string[] {
  const urls: string[] = [];
  const seen = new Set<unknown>();

  const walk = (value: unknown) => {
    if (!value || seen.has(value)) return;
    if (typeof value === "string") {
      if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:video/")
      ) {
        urls.push(value);
      }
      return;
    }
    if (typeof value !== "object") return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    Object.values(value as Record<string, unknown>).forEach(walk);
  };

  walk(payload);
  return Array.from(new Set(urls));
}

async function writeJobSnapshot(jobId: string, data: Record<string, unknown>) {
  try {
    const { adminDb } = await import("@/lib/firebaseAdmin");
    await adminDb.collection("loopAdsJobs").doc(jobId).set(data, { merge: true });
  } catch (error) {
    console.warn("[loop-ads/create] falha ao salvar no Firestore:", error);
  }
}

export async function POST(req: Request) {
  const userId = req.headers.get("x-merse-uid")?.trim() || "";
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const clientKey = userId || forwardedFor || "anonymous";
  const rate = applyRateLimit(`loop-ads-create:${clientKey}`, 4, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Muitas solicitacoes em pouco tempo. Aguarde alguns segundos.",
        details: { retryAfter: rate.retryAfter },
      },
      { status: 429 }
    );
  }

  const body = parseObject(await req.json().catch(() => ({})));

  const token = firstNonEmptyEnv(
    "REPLICATE_LOOP_ADS_API_TOKEN",
    "REPLICATE_MERSE_API_TOKEN",
    "REPLICATE_VEO_API_TOKEN",
    "REPLICATE_MINIMAX_API_TOKEN",
    "REPLICATE_WAN_VIDEO_API_TOKEN",
    "REPLICATE_KLING_API_TOKEN",
    "REPLICATE_API_TOKEN",
  );

  const model = firstNonEmptyEnv(
    "REPLICATE_LOOP_ADS_MODEL",
    "REPLICATE_MERSE_MODEL",
    "REPLICATE_VEO_MODEL",
    "REPLICATE_MINIMAX_MODEL",
    "REPLICATE_WAN_VIDEO_MODEL",
    "REPLICATE_KLING_MODEL",
  );

  const envVersion = firstNonEmptyEnv(
    "REPLICATE_LOOP_ADS_MODEL_VERSION",
    "REPLICATE_MERSE_MODEL_VERSION",
    "REPLICATE_VEO_MODEL_VERSION",
    "REPLICATE_SORA_MODEL_VERSION",
    "REPLICATE_MINIMAX_MODEL_VERSION",
    "REPLICATE_WAN_VIDEO_MODEL_VERSION",
    "REPLICATE_KLING_MODEL_VERSION",
  );

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Configure REPLICATE_LOOP_ADS_API_TOKEN (recomendado) ou um token de fallback (REPLICATE_MERSE_API_TOKEN / REPLICATE_VEO_API_TOKEN / REPLICATE_API_TOKEN).",
      },
      { status: 500 },
    );
  }

  if (!model) {
    return NextResponse.json(
      {
        error:
          "Configure REPLICATE_LOOP_ADS_MODEL (recomendado) ou um model de fallback no .env.local para usar o Loop Ads Engine.",
      },
      { status: 500 },
    );
  }

  const input = {
    preset: parseEnum<LoopPreset>(body.preset, "ecom", ["ecom", "cosmic", "minimal", "premium"]),
    background_mode: parseEnum<BackgroundMode>(body.background_mode, "studio_glass", [
      "studio_glass",
      "cosmic_nebula",
      "packshot_studio",
    ]),
    element: parseEnum<ElementMode>(body.element, "mixed", ["none", "orb", "chroma_creature", "mixed"]),
    particles: parseBoolean(body.particles, true),
    particle_style: parseEnum<ParticleStyle>(body.particle_style, "mixed", ["dust", "comet", "mixed"]),

    width: parseInteger(body.width, 720, 512, 1080),
    height: parseInteger(body.height, 1280, 512, 1920),
    fps: parseInteger(body.fps, 24, 12, 60),

    scenes: parseInteger(body.scenes, 5, 3, 10),
    seconds_per_scene: parseNumber(body.seconds_per_scene, 1, 0.6, 3, 0.1),
    motion_intensity: parseNumber(body.motion_intensity, 0.9, 0, 1, 0.01),
    loop_fade: parseNumber(body.loop_fade, 0.35, 0.1, 0.8, 0.01),

    with_product: parseBoolean(body.with_product, false),
    remove_bg: parseBoolean(body.remove_bg, true),
    product_image:
      typeof body.product_image === "string" && body.product_image.trim().length > 0
        ? body.product_image.trim()
        : undefined,

    title: parseString(body.title, "MERSE", 100),
    subtitle: parseString(body.subtitle, "Loop Ads Engine", 140),
    text_anim: parseEnum<TextAnim>(body.text_anim, "fade", ["none", "fade", "slide", "type"]),

    reflection: parseBoolean(body.reflection, true),
    reflection_strength: parseNumber(body.reflection_strength, 0.22, 0, 0.8, 0.01),

    palette_mode: parseEnum<PaletteMode>(body.palette_mode, "auto", ["auto", "manual"]),
    manual_colors:
      typeof body.manual_colors === "string" && body.manual_colors.trim().length > 0
        ? body.manual_colors.trim()
        : undefined,

    product_scale: parseNumber(body.product_scale, 0.58, 0.2, 0.9, 0.01),
    product_x: parseNumber(body.product_x, 0.64, 0, 1, 0.01),
    product_y: parseNumber(body.product_y, 0.5, 0, 1, 0.01),

    seed: parseInteger(body.seed, 0, 0, 2_147_483_647),
    batch_count: parseInteger(body.batch_count, 1, 1, 8),
    batch_start: parseInteger(body.batch_start, 0, 0, 9999),
  };

  if (input.with_product && !input.product_image) {
    return NextResponse.json(
      {
        error:
          "Com produto ativado, envie uma URL publica (ou upload) em product_image.",
      },
      { status: 400 }
    );
  }

  const hasWebhookConfig =
    Boolean(process.env.APP_URL?.trim()) && Boolean(process.env.REPLICATE_WEBHOOK_SECRET?.trim());

  try {
    const version = await ensureVersion(token, model, envVersion);
    const payload: Record<string, unknown> = {
      version,
      input,
    };

    if (hasWebhookConfig) {
      const appUrl = process.env.APP_URL!.trim().replace(/\/+$/, "");
      const secret = process.env.REPLICATE_WEBHOOK_SECRET!.trim();
      payload.webhook = `${appUrl}/api/loop-ads/webhook?secret=${encodeURIComponent(secret)}`;
      payload.webhook_events_filter = ["completed", "failed", "canceled"];
    }

    const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    const usesDedicatedLoopModel = Boolean(process.env.REPLICATE_LOOP_ADS_MODEL?.trim());

    if (!response.ok) {
      const message =
        typeof data?.error?.message === "string"
          ? data.error.message
          : typeof data?.detail === "string"
          ? data.detail
          : "Replicate retornou erro ao criar o loop.";
      const hint = usesDedicatedLoopModel
        ? ""
        : " Dica: defina REPLICATE_LOOP_ADS_MODEL e REPLICATE_LOOP_ADS_MODEL_VERSION para compatibilidade total com os parametros do Loop Ads.";
      return NextResponse.json({ error: `${message}${hint}`, details: data }, { status: 500 });
    }

    const predictionId = typeof data?.id === "string" ? data.id : "";
    if (!predictionId) {
      return NextResponse.json(
        { error: "Replicate não retornou id da predição.", details: data },
        { status: 500 },
      );
    }

    await writeJobSnapshot(predictionId, {
      id: predictionId,
      status: data.status ?? "starting",
      output: normalizeOutputUrls(data.output),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      provider: "replicate",
      model,
      webhookMode: hasWebhookConfig ? "enabled" : "disabled",
      config: {
        preset: input.preset,
        background_mode: input.background_mode,
        element: input.element,
        scenes: input.scenes,
        seconds_per_scene: input.seconds_per_scene,
        fps: input.fps,
        width: input.width,
        height: input.height,
        batch_count: input.batch_count,
        seed: input.seed,
        with_product: input.with_product,
      },
    });

    return NextResponse.json({
      id: predictionId,
      status: data.status ?? "starting",
      model,
      webhook: hasWebhookConfig ? "enabled" : "disabled",
      config: {
        preset: input.preset,
        background_mode: input.background_mode,
        element: input.element,
        scenes: input.scenes,
        seconds_per_scene: input.seconds_per_scene,
        fps: input.fps,
        width: input.width,
        height: input.height,
        batch_count: input.batch_count,
        seed: input.seed,
        with_product: input.with_product,
      },
    });
  } catch (error) {
    console.error("[loop-ads/create] erro:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível criar o loop no momento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
