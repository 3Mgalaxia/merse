import { cert, getApps, initializeApp, type AppOptions, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

const adminConfig: AppOptions = projectId && clientEmail && privateKey
  ? {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      } satisfies ServiceAccount),
    }
  : {};

const adminApp = getApps()[0] ?? initializeApp(adminConfig);

export const adminDb = getFirestore(adminApp);
