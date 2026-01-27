import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";

import { useAuth } from "@/contexts/AuthContext";
import { firebaseFirestore } from "@/lib/firebase";
import { PLAN_CONFIG, PlanKey, resolvePlanKey } from "@/lib/plans";

type EnergySnapshot = {
  plan: PlanKey;
  usage: number;
};

type GenerationProviderKey = "openai" | "flux" | "merse" | "nano-banana" | "runway-gen4";

type DailyUsageSnapshot = {
  date: string;
  openaiImages: number;
  merseImages: number;
};

type EnergyContextValue = {
  plan: PlanKey;
  planName: string;
  usage: number;
  limit: number;
  percentUsed: number;
  remaining: number;
  registerUsage: (amount?: number) => void;
  setPlan: (plan: PlanKey) => void;
  dailyUsage: DailyUsageSnapshot;
  canGenerateImage: (provider: GenerationProviderKey) => boolean;
  incrementDailyImageCount: (provider: GenerationProviderKey) => void;
};

const STORAGE_KEY = "merse.energy";

const EnergyContext = createContext<EnergyContextValue | undefined>(undefined);

function loadInitialState(): EnergySnapshot {
  if (typeof window === "undefined") {
    return { plan: "free", usage: 0 };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { plan: "free", usage: 0 };
    const parsed = JSON.parse(raw) as Partial<EnergySnapshot>;
    const plan = resolvePlanKey(parsed.plan);
    return {
      plan,
      usage: typeof parsed.usage === "number" && parsed.usage >= 0 ? parsed.usage : 0,
    };
  } catch {
    return { plan: "free", usage: 0 };
  }
}

export function EnergyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<EnergySnapshot>({ plan: "free", usage: 0 });
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageSnapshot>({
    date: todayKey,
    openaiImages: 0,
    merseImages: 0,
  });
  const hasLoadedRef = useRef(false);
  const userDocRef = useMemo(() => {
    if (!user || !firebaseFirestore) return null;
    return doc(firebaseFirestore, "users", user.uid);
  }, [user]);
  const dailyUsageDocRef = useMemo(() => {
    if (!user || !firebaseFirestore) return null;
    return doc(firebaseFirestore, "users", user.uid, "meta", "dailyUsage");
  }, [user]);

  const forcedPlan = useMemo<PlanKey | null>(() => {
    const email = user?.email?.toLowerCase();
    if (!email) return null;
    if (email === "tauruskennelgo@gmail.com") {
      return "nebula";
    }
    return null;
  }, [user?.email]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    const initialState = loadInitialState();
    setSnapshot(initialState);
    hasLoadedRef.current = true;
    setDailyUsage({
      date: todayKey,
      openaiImages: 0,
      merseImages: 0,
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  useEffect(() => {
    if (!userDocRef) {
      setSnapshot(loadInitialState());
      return;
    }

    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as {
          plan?: string;
          credits?: number;
          planExpiresAt?: Timestamp | Date | string | null;
        };
        const resolvedPlan = forcedPlan ?? resolvePlanKey(data.plan);
        const limitValue = PLAN_CONFIG[resolvedPlan].limit;
        const credits = typeof data.credits === "number" ? Math.max(0, data.credits) : limitValue;

        const expiresAtValue = (() => {
          const raw = data.planExpiresAt;
          if (raw instanceof Timestamp) return raw.toDate();
          if (raw instanceof Date) return raw;
          if (typeof raw === "string") {
            const parsed = new Date(raw);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
          }
          if (raw && typeof (raw as { toDate?: () => Date }).toDate === "function") {
            return (raw as { toDate: () => Date }).toDate();
          }
          return null;
        })();

        const now = Date.now();
        const isExpired =
          resolvedPlan !== "free" && expiresAtValue ? expiresAtValue.getTime() < now : false;

        if (isExpired && !forcedPlan) {
          const freeLimit = PLAN_CONFIG.free.limit;
          void setDoc(
            userDocRef,
            {
              plan: "free",
              credits: freeLimit,
              planExpiresAt: null,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
          setSnapshot({ plan: "free", usage: 0 });
          return;
        }

        const usageValue = Math.min(Math.max(limitValue - credits, 0), limitValue);
        setSnapshot({ plan: resolvedPlan, usage: usageValue });
      } else {
        const basePlan = forcedPlan ?? "free";
        const limitValue = PLAN_CONFIG[basePlan].limit;
        void setDoc(
          userDocRef,
          {
            plan: basePlan,
            credits: limitValue,
            generatedCount: 0,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        setSnapshot({ plan: basePlan, usage: 0 });
      }
    });

    return () => unsubscribe();
  }, [userDocRef, forcedPlan]);

  useEffect(() => {
    if (!user) {
      setDailyUsage({ date: todayKey, openaiImages: 0, merseImages: 0 });
      return;
    }
    if (!dailyUsageDocRef) return;

    const unsubscribe = onSnapshot(dailyUsageDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as Partial<DailyUsageSnapshot>;
        if (data.date === todayKey) {
          setDailyUsage({
            date: todayKey,
            openaiImages:
              typeof data.openaiImages === "number" && data.openaiImages >= 0 ? data.openaiImages : 0,
            merseImages:
              typeof data.merseImages === "number" && data.merseImages >= 0 ? data.merseImages : 0,
          });
        } else {
          const reset: DailyUsageSnapshot = {
            date: todayKey,
            openaiImages: 0,
            merseImages: 0,
          };
          void setDoc(
            dailyUsageDocRef,
            { ...reset, updatedAt: serverTimestamp() },
            { merge: true },
          );
          setDailyUsage(reset);
        }
      } else {
        const reset: DailyUsageSnapshot = {
          date: todayKey,
          openaiImages: 0,
          merseImages: 0,
        };
        void setDoc(
          dailyUsageDocRef,
          { ...reset, updatedAt: serverTimestamp() },
          { merge: true },
        );
        setDailyUsage(reset);
      }
    });

    return () => unsubscribe();
  }, [user, dailyUsageDocRef, todayKey]);

  useEffect(() => {
    if (!forcedPlan || !userDocRef) return;
    void setDoc(
      userDocRef,
      {
        plan: forcedPlan,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }, [forcedPlan, userDocRef]);

  const planConfig = PLAN_CONFIG[snapshot.plan];
  const limit = planConfig.limit;
  const usage = Math.min(snapshot.usage, limit);
  const percentUsed = limit === 0 ? 0 : Math.min(100, Math.round((usage / limit) * 100));
  const remaining = Math.max(limit - usage, 0);

  const registerUsage = (amount = 1) => {
    if (amount <= 0) return;
    setSnapshot((prev) => {
      const key = forcedPlan ?? prev.plan;
      const next = {
        plan: key,
        usage: Math.min(PLAN_CONFIG[key].limit, prev.usage + amount),
      };
      return next;
    });
  };

  const setPlan = (plan: PlanKey) => {
    if (forcedPlan && plan !== forcedPlan) {
      return;
    }
    if (!userDocRef) return;
    const limitValue = PLAN_CONFIG[plan].limit;
    const now = new Date();
    const expiresAt =
      plan === "free"
        ? null
        : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes());

    void setDoc(
      userDocRef,
      {
        plan,
        credits: limitValue,
        planActivatedAt: serverTimestamp(),
        planExpiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const canGenerateImage = useCallback(
    (provider: GenerationProviderKey) => {
      if (snapshot.plan !== "free") return true;
      if (provider === "merse") {
        return dailyUsage.merseImages < 3;
      }
      return dailyUsage.openaiImages < 1;
    },
    [snapshot.plan, dailyUsage],
  );

  const incrementDailyImageCount = useCallback(
    (provider: GenerationProviderKey) => {
      if (!dailyUsageDocRef) return;
      setDailyUsage((prev) => {
        const next: DailyUsageSnapshot = {
          date: prev.date,
          openaiImages: prev.openaiImages,
          merseImages: prev.merseImages,
        };
        if (provider === "merse") {
          next.merseImages = Math.min(next.merseImages + 1, 999);
        } else {
          next.openaiImages = Math.min(next.openaiImages + 1, 999);
        }
        void setDoc(
          dailyUsageDocRef,
          {
            ...next,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        return next;
      });
    },
    [dailyUsageDocRef],
  );

  const value = useMemo<EnergyContextValue>(
    () => ({
      plan: planConfig.key,
      planName: planConfig.name,
      usage,
      limit,
      percentUsed,
      remaining,
      registerUsage,
      setPlan,
      dailyUsage,
      canGenerateImage,
      incrementDailyImageCount,
    }),
    [
      planConfig.key,
      planConfig.name,
      usage,
      limit,
      percentUsed,
      remaining,
      registerUsage,
      setPlan,
      dailyUsage,
      canGenerateImage,
      incrementDailyImageCount,
    ],
  );

  return <EnergyContext.Provider value={value}>{children}</EnergyContext.Provider>;
}

export function useEnergy(): EnergyContextValue {
  const context = useContext(EnergyContext);
  if (!context) {
    throw new Error("useEnergy deve ser usado dentro de EnergyProvider");
  }
  return context;
}

export function getPlanKeyFromName(name: string): PlanKey | null {
  const entry = Object.values(PLAN_CONFIG).find(
    (config) => config.name.toLowerCase() === name.toLowerCase(),
  );
  return entry?.key ?? null;
}

export const planCatalog = PLAN_CONFIG;
