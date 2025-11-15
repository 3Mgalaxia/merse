import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let enabled = false;

function createFirebaseServices() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
    return;
  }

  const existingApps = getApps();
  app = existingApps.length ? existingApps[0]! : initializeApp(firebaseConfig);

  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "localhost";
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(firestore, host, 8080);
    connectStorageEmulator(storage, host, 9199);
  }

  enabled = true;
}

try {
  createFirebaseServices();
} catch (error) {
  enabled = false;
  if (process.env.NODE_ENV === "development") {
    console.warn("Firebase não foi inicializado:", error);
  }
}

export const firebaseEnabled = enabled;
export const firebaseApp = app;
export const firebaseAuth: Auth | null = auth;
export const firebaseFirestore = firestore;
export const firebaseStorage = storage;

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
