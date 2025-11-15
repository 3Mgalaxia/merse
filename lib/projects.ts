import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

import { firebaseFirestore } from "@/lib/firebase";

export type ProjectStatus = "draft" | "processing" | "published";

export type ProjectEffect = {
  id: string;
  name: string;
  intensity: number;
  params?: Record<string, unknown>;
};

export type ProjectImageAsset = {
  id: string;
  label: string;
  url: string;
  createdAt?: Date | Timestamp;
};

export type ProjectModelAsset = {
  id: string;
  label: string;
  taskId: string;
  status: "processing" | "ready" | "failed";
  url?: string;
  previewUrl?: string;
  createdAt?: Date | Timestamp;
};

export type ProjectDocument = {
  uid: string;
  prompt: string;
  summary: string;
  highlights: string[];
  html: string;
  status: ProjectStatus;
  flow: "site" | "model" | "effect";
  theme: string;
  palette: string;
  effect?: ProjectEffect | null;
  options?: Record<string, unknown>;
  assets: {
    images: ProjectImageAsset[];
    models3d: ProjectModelAsset[];
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export async function createProjectDocument(
  uid: string,
  payload: Omit<ProjectDocument, "uid" | "createdAt" | "updatedAt">,
) {
  if (!firebaseFirestore) {
    throw new Error("Firestore não inicializado.");
  }

  const projectsRef = collection(firebaseFirestore, "projects");
  const docRef = await addDoc(projectsRef, {
    uid,
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateProjectDocument(
  projectId: string,
  data: Partial<Omit<ProjectDocument, "uid">>,
) {
  if (!firebaseFirestore) {
    throw new Error("Firestore não inicializado.");
  }

  const projectRef = doc(firebaseFirestore, "projects", projectId);
  await updateDoc(projectRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function appendImageAsset(projectId: string, asset: ProjectImageAsset) {
  if (!firebaseFirestore) {
    throw new Error("Firestore não inicializado.");
  }

  const projectRef = doc(firebaseFirestore, "projects", projectId);
  await updateDoc(projectRef, {
    "assets.images": arrayUnion({
      ...asset,
      createdAt: serverTimestamp(),
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function appendModelAsset(projectId: string, asset: ProjectModelAsset) {
  if (!firebaseFirestore) {
    throw new Error("Firestore não inicializado.");
  }

  const projectRef = doc(firebaseFirestore, "projects", projectId);
  await updateDoc(projectRef, {
    "assets.models3d": arrayUnion({
      ...asset,
      createdAt: serverTimestamp(),
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function replaceModelAssets(projectId: string, assets: ProjectModelAsset[]) {
  if (!firebaseFirestore) {
    throw new Error("Firestore não inicializado.");
  }

  const projectRef = doc(firebaseFirestore, "projects", projectId);
  await updateDoc(projectRef, {
    "assets.models3d": assets.map((asset) => ({
      ...asset,
      createdAt: asset.createdAt ?? serverTimestamp(),
    })),
    updatedAt: serverTimestamp(),
  });
}
