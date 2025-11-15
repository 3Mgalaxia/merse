export type PlanKey = "free" | "pulse" | "nebula" | "supernova";

export type PlanConfig = {
  key: PlanKey;
  name: string;
  limit: number;
};

export const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  free: { key: "free", name: "Free Orbit", limit: 300 },
  pulse: { key: "pulse", name: "Pulse Starter", limit: 900 },
  nebula: { key: "nebula", name: "Nebula Studio", limit: 5000 },
  supernova: { key: "supernova", name: "Supernova Pro", limit: 10000 },
};

export const DEFAULT_PLAN: PlanKey = "free";

export function resolvePlanKey(raw: unknown): PlanKey {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value in PLAN_CONFIG) {
    return value as PlanKey;
  }
  if (value === "starter") return "free";
  if (value === "pro") return "nebula";
  if (value === "enterprise") return "supernova";
  return DEFAULT_PLAN;
}
