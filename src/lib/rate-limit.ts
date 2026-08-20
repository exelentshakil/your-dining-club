/**
 * Fixed-window rate limiter.
 *
 * In-process by design for this build: it is correct per instance and costs
 * nothing per check. At 1M members the fleet is many instances, so the real
 * deployment points `check()` at Redis (Upstash `INCR` + `EXPIRE`, one round
 * trip) — the call signature here is exactly what that swap needs. The limiter
 * must never become more expensive than the work it is protecting.
 */
type Bucket = { count: number; resetAt: number };

const g = globalThis as unknown as { ydcBuckets?: Map<string, Bucket> };
const buckets = (g.ydcBuckets ??= new Map<string, Bucket>());

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export type RateVerdict = { ok: boolean; remaining: number; resetAt: number; limit: number };

export function check(key: string, limit: number, windowMs: number): RateVerdict {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt, limit };
  }

  existing.count += 1;
  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    limit,
  };
}

/** Trusts the proxy's client IP header; falls back to a shared bucket. */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip") || "anon";
  return `${scope}:${ip}`;
}

export function rateHeaders(v: RateVerdict): Record<string, string> {
  return {
    "x-ratelimit-limit": String(v.limit),
    "x-ratelimit-remaining": String(v.remaining),
    "x-ratelimit-reset": String(Math.ceil(v.resetAt / 1000)),
  };
}
