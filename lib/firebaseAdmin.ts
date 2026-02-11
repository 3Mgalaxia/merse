import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_JSON;
  if (raw) {
    const txt = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(txt);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Missing FIREBASE_ADMIN_JSON or legacy Firebase admin env vars");
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
  };
}

const storageBucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET;
const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(getServiceAccount()),
        ...(storageBucket ? { storageBucket } : {}),
      });

export const adminDb = getFirestore(app);
export const adminStorage = storageBucket
  ? getStorage(app).bucket(storageBucket)
  : null;

(() => {
  try {
    const globalAny = globalThis as Record<string, unknown>;
    const flag = "__merse_firestore_settings_applied__";
    if (!globalAny[flag]) {
      adminDb.settings({ ignoreUndefinedProperties: true });
      globalAny[flag] = true;
    }
  } catch {
    // ignore if settings were already applied elsewhere
  }
})();
