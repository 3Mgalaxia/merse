import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { useAuth } from "@/contexts/AuthContext";
import { firebaseFirestore } from "@/lib/firebase";

type PlanKey = "free" | "pulse" | "nebula" | "supernova";

type PlanConfig = {
  key: PlanKey;
  name: string;
  limit: number;
};

const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  free: { key: "free", name: "Free Orbit", limit: 300 },
  pulse: { key: "pulse", name: "Pulse Starter", limit: 900 },
  nebula: { key: "nebula", name: "Nebula Studio", limit: 5000 },
  supernova: { key: "supernova", name: "Supernova Pro", limit: 10000 },
};

type EnergySnapshot = {
  plan: PlanKey;
  usage: number;
};

type GenerationProviderKey = "openai" | "flux" | "merse";

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

function resolvePlanKey(raw: unknown): PlanKey {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value in PLAN_CONFIG) {
    return value as PlanKey;
  }
  if (value === "starter") return "free";
  if (value === "pro") return "nebula";
  if (value === "enterprise") return "supernova";
  return "free";
}

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
  const energyDocRef = useMemo(() => {
    if (!user || !firebaseFirestore) return null;
    return doc(firebaseFirestore, "users", user.uid, "meta", "energy");
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
    if (!user || !firebaseFirestore) {
      setSnapshot(loadInitialState());
      return;
    }

    if (!energyDocRef) return;

    const unsubscribe = onSnapshot(energyDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as Partial<EnergySnapshot>;
        const resolved = resolvePlanKey(data.plan);
        setSnapshot({
          plan: forcedPlan ?? resolved,
          usage: typeof data.usage === "number"
            ? Math.min(data.usage, PLAN_CONFIG[forcedPlan ?? resolved].limit)
            : 0,
        });
      } else {
        const defaultState: EnergySnapshot = {
          plan: forcedPlan ?? "free",
          usage: 0,
        };
        void setDoc(
          energyDocRef,
          { ...defaultState, updatedAt: serverTimestamp() },
          { merge: true },
        );
        setSnapshot(defaultState);
      }
    });

    return () => unsubscribe();
  }, [user, energyDocRef, forcedPlan]);

  const persistSnapshot = useCallback(
    (next: EnergySnapshot) => {
      if (energyDocRef) {
        void setDoc(
          energyDocRef,
          {
            plan: next.plan,
            usage: next.usage,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    },
    [energyDocRef],
  );

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
    if (forcedPlan && snapshot.plan !== forcedPlan) {
      const next: EnergySnapshot = {
        plan: forcedPlan,
        usage: Math.min(snapshot.usage, PLAN_CONFIG[forcedPlan].limit),
      };
      setSnapshot(next);
      persistSnapshot(next);
    }
  }, [forcedPlan, snapshot, persistSnapshot]);

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
      persistSnapshot(next);
      return next;
    });
  };

  const setPlan = (plan: PlanKey) => {
    if (forcedPlan && plan !== forcedPlan) {
      return;
    }
    setSnapshot((prev) => {
      const nextConfig = PLAN_CONFIG[plan];
      const clampedUsage = Math.min(prev.usage, nextConfig.limit);
      const next = { plan, usage: clampedUsage };
      persistSnapshot(next);
      return next;
    });
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
