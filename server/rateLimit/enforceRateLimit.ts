import type { NextApiRequest, NextApiResponse } from "next";
import type { ApiCaller } from "@/server/auth/requireApiKey";

type Resource = "image" | "video" | "site" | "object";

const LIMITS: Record<Resource, { basic: number; pro: number; enterprise: number }> = {
  image: { basic: 30, pro: 120, enterprise: 600 },
  video: { basic: 6, pro: 30, enterprise: 120 },
  site: { basic: 12, pro: 60, enterprise: 200 },
  object: { basic: 18, pro: 80, enterprise: 300 },
};

function resolveLimit(resource: Resource, tier?: string | null) {
  const norm = tier?.toLowerCase() ?? "basic";
  const limits = LIMITS[resource] ?? LIMITS.image;
  if (norm.includes("enterprise")) return limits.enterprise;
  if (norm.includes("pro")) return limits.pro;
  return limits.basic;
}

async function hitRedisCounter(key: string, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { allowed: true, remaining: null, limit: null };

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commands: [
          ["INCR", key],
          ["EXPIRE", key, String(windowSeconds), "NX"],
        ],
      }),
    });

    const data = (await response.json().catch(() => null)) as { result?: [number, unknown] } | null;
    const current = Array.isArray(data?.result) && typeof data.result[0] === "number" ? data.result[0] : null;
    if (current === null) return { allowed: true, remaining: null, limit: null };
    return { allowed: true, current };
  } catch (error) {
    console.warn("rateLimit redis error", error);
    return { allowed: true, remaining: null, limit: null };
  }
}

export async function enforceRateLimit(opts: {
  req: NextApiRequest;
  res: NextApiResponse;
  caller: ApiCaller;
  resource: Resource;
  windowSeconds?: number;
}) {
  const { res, caller, resource } = opts;
  const windowSeconds = opts.windowSeconds ?? 60;
  const limit = resolveLimit(resource, caller.tier);
  const cacheKey = `rl:${resource}:${caller.keyId}`;

  const hit = await hitRedisCounter(cacheKey, windowSeconds);
  const current = (hit as { current?: number }).current ?? null;

  if (current !== null) {
    const remaining = Math.max(0, limit - current);
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(windowSeconds));

    if (current > limit) {
      return res
        .status(429)
        .json({ error: "Rate limit exceeded. Aguarde um pouco e tente novamente.", limit, remaining: 0 });
    }
  }

  return null;
}
