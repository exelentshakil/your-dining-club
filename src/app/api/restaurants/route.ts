import { NextResponse } from "next/server";
import { z } from "zod";
import { searchRestaurants } from "@/lib/data/restaurants";
import { check, clientKey, rateHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  q: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  cuisine: z.string().trim().max(60).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  cursor: z.string().max(120).optional(),
});

export async function GET(req: Request) {
  const verdict = check(clientKey(req, "restaurants"), 120, 60_000);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Slow down a moment." },
      { status: 429, headers: { ...rateHeaders(verdict), "retry-after": "30" } }
    );
  }

  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", detail: parsed.error.flatten() }, { status: 400 });
  }

  const page = await searchRestaurants(parsed.data);

  // The catalogue is public and identical for everyone, so it belongs on the
  // CDN. At 1M members this is the difference between the database serving
  // every browse and serving almost none of them.
  return NextResponse.json(page, {
    headers: {
      ...rateHeaders(verdict),
      "cache-control": "public, s-maxage=60, stale-while-revalidate=600",
    },
  });
}
