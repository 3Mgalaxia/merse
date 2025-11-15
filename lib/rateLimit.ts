type RateRecord = {
  count: number;
  expiresAt: number;
};

const store = new Map<string, RateRecord>();

export function applyRateLimit(
  identifier: string,
  limit = 10,
  windowMs = 60_000,
): { allowed: true; remaining: number } | { allowed: false; retryAfter: number } {
  const key = identifier || "anonymous";
  const now = Date.now();
  const record = store.get(key);

  if (!record || record.expiresAt < now) {
    store.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, retryAfter: record.expiresAt - now };
  }

  record.count += 1;
  store.set(key, record);
  return { allowed: true, remaining: limit - record.count };
}
