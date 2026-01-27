import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ConsumeParams = {
  userId?: string | null;
  product?: "image" | "video" | "site" | "object";
  amount: number;
  metadata?: Record<string, unknown>;
};

type ConsumeResult = {
  ok: boolean;
  consumed: number;
  balance?: number | null;
  planTier?: string | null;
};

const PROFILE_COLLECTION = "user_credits";
const USAGE_COLLECTION = "credit_usage";

async function getProfile(userId: string) {
  const ref = adminDb.collection(PROFILE_COLLECTION).doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  return {
    ref,
    balance: typeof data.balance === "number" ? data.balance : null,
    planTier: typeof data.planTier === "string" ? data.planTier : null,
  };
}

export async function consumeCredits(params: ConsumeParams): Promise<ConsumeResult> {
  const { userId, product, amount, metadata } = params;
  const safeProduct = (product ?? "unknown") as string;
  const now = Timestamp.now();

  // Sem userId -> apenas registra uso não debitado
  if (!userId) {
    await adminDb.collection(USAGE_COLLECTION).add({
      userId: null,
      product: safeProduct,
      amount,
      status: "skipped_no_user",
      metadata: metadata ?? {},
      createdAt: now,
    });
    return { ok: true, consumed: 0, balance: null, planTier: null };
  }

  const profile = await getProfile(userId);

  // Se não houver perfil, registra uso e segue (sem bloquear)
  if (!profile || profile.balance === null) {
    await adminDb.collection(USAGE_COLLECTION).add({
      userId,
      product: safeProduct,
      amount,
      status: "no_profile",
      metadata: metadata ?? {},
      createdAt: now,
    });
    return { ok: true, consumed: 0, balance: null, planTier: profile?.planTier ?? null };
  }

  // Tenta debitar em transação
  const consumed = Math.max(1, Math.ceil(amount));
  let newBalance: number | null = null;

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(profile.ref);
    const data = snap.data() ?? {};
    const balance = typeof data.balance === "number" ? data.balance : 0;
    if (balance < consumed) {
      throw new Error("Saldo insuficiente para gerar este recurso.");
    }
    newBalance = balance - consumed;
    tx.update(profile.ref, { balance: newBalance, updatedAt: FieldValue.serverTimestamp() });
  });

  await adminDb.collection(USAGE_COLLECTION).add({
    userId,
    product: safeProduct,
    amount: consumed,
    status: "debited",
    metadata: metadata ?? {},
    createdAt: now,
    balanceAfter: newBalance,
    planTier: profile.planTier ?? null,
  });

  return { ok: true, consumed, balance: newBalance, planTier: profile.planTier ?? null };
}
