import { NextResponse } from "next/server";

const REPLICATE_API_URL = "https://api.replicate.com/v1";

function firstNonEmptyEnv(...keys: string[]) {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (value) return value;
  }
  return "";
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

async function writeJobUpdate(id: string, payload: Record<string, unknown>) {
  try {
    const { adminDb } = await import("@/lib/firebaseAdmin");
    await adminDb.collection("loopAdsJobs").doc(id).set(payload, { merge: true });
  } catch (error) {
    console.warn("[loop-ads/status] falha ao atualizar Firestore:", error);
  }
}

function extractJobConfig(input: unknown) {
  if (!input || typeof input !== "object") return {};
  const source = input as Record<string, unknown>;
  const pick = <T = unknown>(key: string): T | undefined => source[key] as T | undefined;

  return {
    preset: pick<string>("preset"),
    background_mode: pick<string>("background_mode"),
    element: pick<string>("element"),
    scenes: pick<number>("scenes"),
    seconds_per_scene: pick<number>("seconds_per_scene"),
    fps: pick<number>("fps"),
    width: pick<number>("width"),
    height: pick<number>("height"),
    batch_count: pick<number>("batch_count"),
    seed: pick<number>("seed"),
    with_product: pick<boolean>("with_product"),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const token = firstNonEmptyEnv(
    "REPLICATE_LOOP_ADS_API_TOKEN",
    "REPLICATE_MERSE_API_TOKEN",
    "REPLICATE_VEO_API_TOKEN",
    "REPLICATE_MINIMAX_API_TOKEN",
    "REPLICATE_WAN_VIDEO_API_TOKEN",
    "REPLICATE_KLING_API_TOKEN",
    "REPLICATE_API_TOKEN",
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

  try {
    const response = await fetch(`${REPLICATE_API_URL}/predictions/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof data?.error?.message === "string"
          ? data.error.message
          : "Replicate retornou erro ao consultar status.";
      return NextResponse.json({ error: message, details: data }, { status: 500 });
    }

    const output = normalizeOutputUrls(data.output);
    const config = extractJobConfig(data.input);

    if (typeof data?.status === "string") {
      await writeJobUpdate(id, {
        id,
        status: data.status,
        output,
        config,
        error: data.error ?? null,
        updatedAt: Date.now(),
      });
    }

    return NextResponse.json({
      id: data.id ?? id,
      status: data.status ?? "unknown",
      output: output.length ? output : data.output ?? [],
      config,
      error: data.error ?? null,
    });
  } catch (error) {
    console.error("[loop-ads/status] erro:", error);
    const message =
      error instanceof Error ? error.message : "Falha ao consultar status do loop.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
