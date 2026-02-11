import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { createApiKey } from "@/server/auth/apiKeys";

type ExchangeResponse =
  | { ok: true; apiKey: string; apiKeyMask: string; keyId: string }
  | { ok: false; error: string };

const COLLECTION = "vscode_auth_codes";
const MAX_AGE_SECONDS = 10 * 60;

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeCode(code: string) {
  return code.toUpperCase().replace(/\s+/g, "").trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ExchangeResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const raw = typeof (req.body as any)?.code === "string" ? (req.body as any).code : "";
    const code = normalizeCode(raw);
    if (!code) {
      return res.status(400).json({ ok: false, error: "Missing code" });
    }

    const codeHash = sha256(code);
    const nowMs = Date.now();
    const minCreatedMs = nowMs - MAX_AGE_SECONDS * 1000;
    const ref = adminDb.collection(COLLECTION).doc(codeHash);

    const uid = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;

      const data = snap.data() ?? {};
      const recordUid = typeof data.uid === "string" ? data.uid : "";
      const usedAt = data.usedAt as Timestamp | null | undefined;
      const createdAt = data.createdAt as Timestamp | null | undefined;
      const expiresAt = data.expiresAt as Timestamp | null | undefined;

      if (!recordUid) return null;
      if (usedAt) return null;
      if (expiresAt && expiresAt.toMillis() <= nowMs) return null;
      if (createdAt && createdAt.toMillis() < minCreatedMs) return null;

      tx.set(ref, { usedAt: FieldValue.serverTimestamp() }, { merge: true });
      return recordUid;
    });

    if (!uid) {
      return res.status(404).json({ ok: false, error: "Invalid or expired code" });
    }

    const record = await createApiKey({ userId: uid, name: "VS Code" });
    return res.status(200).json({
      ok: true,
      apiKey: record.apiKey,
      apiKeyMask: record.apiKeyMask,
      keyId: record.keyId,
    });
  } catch (error) {
    console.error("Erro em /api/auth/vscode/exchange:", error);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
