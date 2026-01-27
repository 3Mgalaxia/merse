import { randomBytes, createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import type { ApiCaller } from "./requireApiKey";

export type ApiKeyRecord = {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  createdAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  rateLimitTier: string | null;
};

const COLLECTION = "api_keys";

function maskKey(key: string) {
  return key.length > 6 ? `...${key.slice(-6)}` : key;
}

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(params: { userId: string; name: string; rateLimitTier?: string }) {
  const apiKey = `merse_live_${randomBytes(24).toString("hex")}`;
  const keyHash = hashKey(apiKey);
  const now = FieldValue.serverTimestamp();

  const docRef = await adminDb.collection(COLLECTION).add({
    userId: params.userId,
    name: params.name,
    keyHash,
    createdAt: now,
    revokedAt: null,
    lastUsedAt: null,
    rateLimitTier: params.rateLimitTier ?? null,
  });

  return {
    apiKey,
    apiKeyMask: maskKey(apiKey),
    keyId: docRef.id,
  };
}

export async function revokeApiKey(keyId: string) {
  const docRef = adminDb.collection(COLLECTION).doc(keyId);
  await docRef.set({ revokedAt: FieldValue.serverTimestamp() }, { merge: true });
  return true;
}

export async function verifyApiKey(token: string): Promise<ApiCaller | null> {
  if (!token) return null;
  const keyHash = hashKey(token);

  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("keyHash", "==", keyHash)
    .where("revokedAt", "==", null)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as Partial<ApiKeyRecord>;

  // best-effort update lastUsedAt
  void doc.ref.set({ lastUsedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});

  return {
    apiKey: token,
    apiKeyMask: maskKey(token),
    keyId: doc.id,
    userId: data.userId ?? undefined,
    rateLimitTier: data.rateLimitTier ?? null,
  };
}
