import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export type ApiKeyRecord = {
  id: string;
  userId?: string | null;
  name?: string | null;
  keyHash?: string;
  createdAt?: Date | null;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  rateLimitTier?: string | null;
};

const COLLECTION = "api_keys";

export async function getApiKeyRecordByHash(keyHash: string): Promise<ApiKeyRecord | null> {
  if (!keyHash) return null;

  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("keyHash", "==", keyHash)
    .where("revokedAt", "==", null)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    userId: data.userId ?? null,
    name: data.name ?? null,
    keyHash: data.keyHash,
    createdAt: (data.createdAt as Date) ?? null,
    revokedAt: (data.revokedAt as Date) ?? null,
    lastUsedAt: (data.lastUsedAt as Date) ?? null,
    rateLimitTier: data.rateLimitTier ?? null,
  };
}

export async function touchApiKeyLastUsed(keyId: string) {
  if (!keyId) return;
  const ref = adminDb.collection(COLLECTION).doc(keyId);
  await ref.set({ lastUsedAt: FieldValue.serverTimestamp() }, { merge: true });
}
