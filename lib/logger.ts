import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { firebaseFirestore } from "@/lib/firebase";

type ApiLogPayload = {
  action: string;
  userId?: string | null;
  status: number | string;
  durationMs?: number;
  cost?: number;
  metadata?: Record<string, unknown>;
};

export async function logApiAction(payload: ApiLogPayload) {
  const entry = {
    action: payload.action,
    userId: payload.userId ?? null,
    status: payload.status,
    durationMs: payload.durationMs ?? null,
    cost: payload.cost ?? null,
    metadata: payload.metadata ?? null,
    createdAt: serverTimestamp(),
  };

  if (!firebaseFirestore) {
    console.log("[Merse][Log]", entry);
    return;
  }

  try {
    await addDoc(collection(firebaseFirestore, "logs"), entry);
  } catch (error) {
    console.warn("[Merse][Log] Falha ao registrar log:", error);
  }
}
