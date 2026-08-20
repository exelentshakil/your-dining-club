#!/usr/bin/env node
/**
 * Minimal latency harness for the catalogue endpoint.
 *
 *   BASE=http://localhost:3000 CONCURRENCY=50 DURATION=15 npm run loadtest
 *
 * It walks real cursors rather than hammering page 1, because page 1 is the one
 * page that is always warm. The number worth watching is whether p99 stays flat
 * as the cursor goes deeper — that is the whole claim keyset pagination makes.
 *
 * Each worker presents its own X-Forwarded-For so it lands in its own rate-limit
 * bucket. Without that the harness measures the limiter (120 req/min per client)
 * rather than the endpoint. Set SHARED_IP=1 to drop the header and watch the
 * limiter engage instead — the 429 count is reported either way.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 25);
const DURATION_S = Number(process.env.DURATION ?? 10);

const CITIES = ["New York", "Los Angeles", "Chicago", "Austin", "Miami", "Seattle"];
const SHARED_IP = process.env.SHARED_IP === "1";

const latencies = [];
let errors = 0;
let throttled = 0;
const deadline = Date.now() + DURATION_S * 1000;

async function worker(index) {
  const headers = SHARED_IP ? {} : { "x-forwarded-for": `10.0.${(index >> 8) & 255}.${index & 255}` };
  let cursor = null;
  let city = CITIES[Math.floor(Math.random() * CITIES.length)];

  while (Date.now() < deadline) {
    const params = new URLSearchParams({ city, limit: "24" });
    if (cursor) params.set("cursor", cursor);

    const started = performance.now();
    try {
      const res = await fetch(`${BASE}/api/restaurants?${params}`, { headers });
      const body = await res.json();
      latencies.push(performance.now() - started);
      if (res.status === 429) throttled++;
      else if (!res.ok) errors++;
      cursor = body.nextCursor;
      if (!cursor) {
        // Exhausted this city — start another walk.
        city = CITIES[Math.floor(Math.random() * CITIES.length)];
      }
    } catch {
      errors++;
      latencies.push(performance.now() - started);
      cursor = null;
    }
  }
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

console.log(`Load: ${CONCURRENCY} workers x ${DURATION_S}s against ${BASE}`);
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

const sorted = latencies.slice().sort((a, b) => a - b);
console.log(`
  requests   ${latencies.length.toLocaleString()}
  errors     ${errors}
  throttled  ${throttled} (429)
  rps        ${(latencies.length / DURATION_S).toFixed(0)}
  p50        ${pct(sorted, 50).toFixed(1)} ms
  p95        ${pct(sorted, 95).toFixed(1)} ms
  p99        ${pct(sorted, 99).toFixed(1)} ms
  max        ${sorted[sorted.length - 1].toFixed(1)} ms
`);
