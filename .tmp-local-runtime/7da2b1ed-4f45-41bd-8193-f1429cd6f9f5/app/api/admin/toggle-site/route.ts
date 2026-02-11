import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firebase-admin";

const SHARED_TOKEN = process.env.WATCH_SHARED_TOKEN ?? "";
const COLLECTION_PATH = { collection: "admin", doc: "site_status" } as const;

async function readBody<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

function extractToken(req: NextRequest, body: Record<string, unknown> | null) {
  return (
    req.headers.get("x-watch-token") ||
    req.nextUrl.searchParams.get("token") ||
    (body?.token as string | undefined) ||
    null
  );
}

async function updateSiteStatus(enabled: boolean) {
  const siteRef = firestore.collection(COLLECTION_PATH.collection).doc(COLLECTION_PATH.doc);
  await siteRef.set(
    {
      enabled,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function GET() {
  try {
    const siteRef = firestore.collection(COLLECTION_PATH.collection).doc(COLLECTION_PATH.doc);
    const snapshot = await siteRef.get();
    const data = snapshot.exists
      ? snapshot.data()
      : { enabled: true, updatedAt: new Date().toISOString() };
    return NextResponse.json(data);
  } catch (error) {
    console.error("[toggle-site][GET]", error);
    return NextResponse.json(
      { error: "Não foi possível obter o status do site." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!SHARED_TOKEN) {
      return NextResponse.json(
        { error: "Token compartilhado não configurado." },
        { status: 500 }
      );
    }

    const body = await readBody<{ action?: string; token?: string }>(req);
    const token = extractToken(req, body);
    if (!token || token !== SHARED_TOKEN) {
      return NextResponse.json({ error: "Token inválido." }, { status: 401 });
    }

    const action = body?.action;
    if (action === "disable") {
      await updateSiteStatus(false);
      return NextResponse.json({ message: "Site desativado." });
    }

    if (action === "enable") {
      await updateSiteStatus(true);
      return NextResponse.json({ message: "Site reativado." });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("[toggle-site][POST]", error);
    return NextResponse.json(
      { error: "Não foi possível processar a solicitação." },
      { status: 500 }
    );
  }
}
