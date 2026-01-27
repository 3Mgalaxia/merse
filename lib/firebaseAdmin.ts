import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const storageBucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKeyRaw) {
  throw new Error("Firebase admin credenciais ausentes no ambiente.");
}

const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

const serviceAccount: ServiceAccount = {
  projectId,
  clientEmail,
  privateKey,
};

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        ...(storageBucket ? { storageBucket } : {}),
      });

export const adminDb = getFirestore(adminApp);
export const adminStorage = storageBucket ? getStorage(adminApp).bucket(storageBucket) : null;
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
