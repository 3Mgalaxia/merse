import { NextResponse } from "next/server";

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
    console.warn("[loop-ads/webhook] falha ao atualizar Firestore:", error);
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const expected = process.env.REPLICATE_WEBHOOK_SECRET?.trim();

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!id) {
    return NextResponse.json({ ok: true });
  }

  const status = typeof payload?.status === "string" ? payload.status : "unknown";
  const output = normalizeOutputUrls(payload?.output);
  const errorPayload = payload?.error ?? null;

  await writeJobUpdate(id, {
    id,
    status,
    output,
    error: errorPayload,
    updatedAt: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
