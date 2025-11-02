import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { firebaseEnabled, firebaseFirestore, firebaseStorage } from "@/lib/firebase";

export type CreationRecordType = "image" | "video" | "object";

export type CreationRecord = {
  id: string;
  type: CreationRecordType;
  prompt: string;
  createdAt: string;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  storagePath?: string | null;
  meta?: Record<string, string | number | boolean | null>;
};

type CreationSnapshot = CreationRecord & {
  createdAtISO?: string;
};

const STORAGE_KEY = "merse.creations.v2";
const defaultUserKey = "guest";

type StorageShape = Record<string, CreationRecord[]>;

const isBrowser = typeof window !== "undefined";

function readStorage(): StorageShape {
  if (!isBrowser) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as StorageShape;
    }
  } catch (error) {
    console.warn("Falha ao ler criações locais:", error);
  }
  return {};
}

function writeStorage(data: StorageShape) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Falha ao salvar criações localmente:", error);
  }
}

function appendLocal(userKey: string, records: CreationRecord[]): void {
  if (!records.length) return;
  const storage = readStorage();
  const existing = storage[userKey] ?? [];
  storage[userKey] = [...records, ...existing];
  writeStorage(storage);
}

function persistLocal(userKey: string, creations: CreationRecord[]): void {
  const storage = readStorage();
  storage[userKey] = [...creations];
  writeStorage(storage);
}

function removeLocal(userKey: string, creationId: string): void {
  const storage = readStorage();
  const existing = storage[userKey];
  if (!existing) return;
  storage[userKey] = existing.filter((item) => item.id !== creationId);
  writeStorage(storage);
}

function extractMimeFromDataUrl(source: string): string | null {
  const match = /^data:(.+?);base64/.exec(source);
  return match ? match[1] ?? null : null;
}

function deriveExtension(contentType: string | null | undefined, fallback: CreationRecordType): string {
  if (!contentType) {
    switch (fallback) {
      case "video":
        return "mp4";
      case "object":
        return "glb";
      default:
        return "png";
    }
  }

  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("glb")) return "glb";
  if (contentType.includes("gltf")) return "gltf";
  return fallback === "image" ? "png" : fallback === "video" ? "mp4" : "bin";
}

async function uploadAssetToStorage(
  sourceUrl: string,
  userId: string,
  creation: CreationRecord,
): Promise<{ storagePath: string; downloadUrl: string } | null> {
  if (!firebaseStorage) return null;
  if (!sourceUrl) return null;
  if (sourceUrl.startsWith("https://firebasestorage.googleapis.com")) {
    return {
      storagePath: creation.storagePath ?? "",
      downloadUrl: sourceUrl,
    };
  }

  try {
    let arrayBuffer: ArrayBuffer;
    let contentType: string | null = null;

    if (sourceUrl.startsWith("data:")) {
      const base64 = sourceUrl.split(",")[1] ?? "";
      const binaryString =
        typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
      contentType = extractMimeFromDataUrl(sourceUrl);
    } else {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Resposta ${response.status} ao baixar asset.`);
      }
      arrayBuffer = await response.arrayBuffer();
      contentType = response.headers.get("content-type");
    }

    const extension = deriveExtension(contentType, creation.type);
    const storagePath = `users/${userId}/creations/${creation.id}.${extension}`;
    const fileRef = ref(firebaseStorage, storagePath);

    await uploadBytes(fileRef, arrayBuffer, {
      contentType: contentType ?? undefined,
    });

    const downloadUrl = await getDownloadURL(fileRef);
    return { storagePath, downloadUrl };
  } catch (error) {
    console.warn("Não foi possível enviar o asset para o Firebase Storage:", error);
    return null;
  }
}

function toCreationRecord(id: string, data: Record<string, unknown>): CreationRecord {
  const createdAtISO =
    typeof data.createdAtISO === "string"
      ? data.createdAtISO
      : data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : new Date().toISOString();

  const previewUrl =
    typeof data.previewUrl === "string"
      ? data.previewUrl
      : typeof data.downloadUrl === "string"
      ? data.downloadUrl
      : null;

  return {
    id,
    type: (data.type as CreationRecordType) ?? "image",
    prompt: typeof data.prompt === "string" ? data.prompt : "",
    createdAt: createdAtISO,
    previewUrl,
    downloadUrl: typeof data.downloadUrl === "string" ? data.downloadUrl : previewUrl,
    storagePath: typeof data.storagePath === "string" ? data.storagePath : null,
    meta: typeof data.meta === "object" && data.meta !== null ? (data.meta as Record<string, any>) : undefined,
  };
}

export function getUserStorageKey(email?: string | null, uid?: string | null): string {
  if (email && email.trim().length > 0) {
    return email.trim().toLowerCase();
  }
  if (uid && uid.trim().length > 0) {
    return `uid:${uid.trim()}`;
  }
  return defaultUserKey;
}

type CreationOperationOptions = {
  userId?: string | null;
  skipLocalCache?: boolean;
};

export async function loadUserCreations(
  userKey: string,
  options: CreationOperationOptions = {},
): Promise<CreationRecord[]> {
  const { userId } = options;

  if (firebaseEnabled && firebaseFirestore && userId) {
    const collectionRef = collection(firebaseFirestore, "users", userId, "creations");
    const snapshot = await getDocs(query(collectionRef, orderBy("createdAt", "desc")));
    return snapshot.docs.map((docSnapshot) => toCreationRecord(docSnapshot.id, docSnapshot.data()));
  }

  const storage = readStorage();
  return storage[userKey] ? [...storage[userKey]] : [];
}

export async function persistUserCreations(
  userKey: string,
  creations: CreationRecord[],
  options: CreationOperationOptions = {},
): Promise<void> {
  if (firebaseEnabled && firebaseFirestore && options.userId) {
    // Firestore já guarda o estado da coleção; nada a fazer aqui.
    return;
  }
  persistLocal(userKey, creations);
}

export async function appendUserCreations(
  userKey: string,
  records: CreationRecord[],
  options: CreationOperationOptions = {},
): Promise<void> {
  if (!records.length) return;
  const { userId } = options;

  if (firebaseEnabled && firebaseFirestore && userId) {
    const collectionRef = collection(firebaseFirestore, "users", userId, "creations");

    // Process sequentialmente para garantir ordem cronológica na UI.
    for (const record of records) {
      let nextRecord: CreationSnapshot = { ...record };

      const sourceForUpload = record.downloadUrl ?? record.previewUrl ?? null;
      if (sourceForUpload) {
        const storedAsset = await uploadAssetToStorage(sourceForUpload, userId, record);
        if (storedAsset) {
          nextRecord = {
            ...nextRecord,
            downloadUrl: storedAsset.downloadUrl,
            previewUrl: storedAsset.downloadUrl,
            storagePath: storedAsset.storagePath,
          };
        }
      }

      const docRef = doc(collectionRef, record.id);
      await setDoc(
        docRef,
        {
          ...nextRecord,
          createdAtISO: nextRecord.createdAt,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  appendLocal(userKey, records);
}

export async function removeUserCreation(
  userKey: string,
  creationId: string,
  options: CreationOperationOptions & { storagePath?: string | null } = {},
): Promise<void> {
  const { userId, storagePath } = options;

  if (firebaseEnabled && firebaseFirestore && userId) {
    try {
      const docRef = doc(firebaseFirestore, "users", userId, "creations", creationId);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn("Não foi possível remover criação do Firestore:", error);
    }
    if (firebaseStorage && storagePath) {
      try {
        const fileRef = ref(firebaseStorage, storagePath);
        await deleteObject(fileRef);
      } catch (error) {
        console.warn("Não foi possível remover asset do Storage:", error);
      }
    }
  }

  removeLocal(userKey, creationId);
}

export function subscribeToUserCreations(
  userId: string | null | undefined,
  userKey: string,
  onUpdate: (records: CreationRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!firebaseEnabled || !firebaseFirestore || !userId) {
    void loadUserCreations(userKey, { userId }).then(onUpdate).catch((error) => {
      console.warn("Falha ao carregar criações locais:", error);
      onUpdate([]);
    });
    return () => {};
  }

  const collectionRef = collection(firebaseFirestore, "users", userId, "creations");
  const q = query(collectionRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((docSnapshot) => toCreationRecord(docSnapshot.id, docSnapshot.data()));
      onUpdate(records);
      persistLocal(userKey, records);
    },
    (error) => {
      console.error("Falha ao escutar criações do Firestore:", error);
      if (onError) {
        onError(error);
      }
      void loadUserCreations(userKey, { userId: null }).then(onUpdate);
    },
  );

  return unsubscribe;
}

export function generateCreationId(prefix: CreationRecordType): string {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Date.now().toString(36);
  return `${prefix}-${base}`;
}
