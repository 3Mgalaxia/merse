import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { firebaseFirestore } from "@/lib/firebase";
import { PLAN_CONFIG, PlanKey, resolvePlanKey } from "@/lib/plans";

export type CreditAction = "site" | "image" | "model" | "effect";

export type CreditCharge = {
  action: CreditAction;
  quantity?: number;
};

export const CREDIT_COSTS: Record<CreditAction, number> = {
  site: 20,
  image: 10,
  model: 50,
  effect: 10,
};

type UserCreditSnapshot = {
  plan: PlanKey;
  credits: number;
};

export async function ensureUserCreditProfile(uid: string, planOverride?: PlanKey) {
  if (!firebaseFirestore) return null;

  const userRef = doc(firebaseFirestore, "users", uid);
  const snapshot = await getDoc(userRef);
  const existingData = snapshot.exists() ? snapshot.data() : {};
  const plan = planOverride ?? resolvePlanKey(existingData?.plan);
  const limit = PLAN_CONFIG[plan].limit;
  const credits =
    typeof existingData?.credits === "number" && existingData.credits >= 0
      ? existingData.credits
      : limit;

  if (!snapshot.exists() || typeof existingData?.credits !== "number") {
    await setDoc(
      userRef,
      {
        plan,
        credits: limit,
        generatedCount: existingData?.generatedCount ?? 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  return { plan, credits } as UserCreditSnapshot;
}

export async function applyCreditCharges(uid: string, charges: CreditCharge[]) {
  const db = firebaseFirestore;
  if (!db) {
    throw new Error("Firestore não inicializado.");
  }

  if (!charges.length) {
    return { plan: "free" as PlanKey, remainingCredits: PLAN_CONFIG.free.limit, totalCost: 0 };
  }

  const result = await runTransaction(db, async (transaction) => {
    const userRef = doc(db, "users", uid);
    const snapshot = await transaction.get(userRef);
    const data = snapshot.exists() ? snapshot.data() : {};

    const plan: PlanKey = resolvePlanKey(data?.plan);
    const limit = PLAN_CONFIG[plan].limit;
    let credits =
      typeof data?.credits === "number" && data.credits >= 0 ? data.credits : limit;

    const totalCost = charges.reduce((sum, charge) => {
      const cost = CREDIT_COSTS[charge.action] ?? 0;
      const quantity = charge.quantity ?? 1;
      return sum + cost * Math.max(quantity, 1);
    }, 0);

    if (totalCost <= 0) {
      return { plan, remainingCredits: credits, totalCost: 0 };
    }

    if (credits < totalCost) {
      throw new Error("Créditos insuficientes. Atualize seu plano ou aguarde o reset mensal.");
    }

    credits -= totalCost;

    transaction.set(
      userRef,
      {
        plan,
        credits,
        generatedCount: (data?.generatedCount ?? 0) + 1,
        updatedAt: serverTimestamp(),
        lastCharge: {
          total: totalCost,
          charges,
          at: serverTimestamp(),
        },
      },
      { merge: true },
    );

    return {
      plan,
      remainingCredits: credits,
      totalCost,
    };
  });

  return result;
}
