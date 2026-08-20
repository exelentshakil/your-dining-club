import { NextResponse } from "next/server";
import { z } from "zod";
import { getRestaurantBySlug } from "@/lib/data/restaurants";
import { redeem } from "@/lib/data/redemptions";
import { getSession, isMember } from "@/lib/session";
import { check, clientKey, rateHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  slug: z.string().min(1).max(160),
  partySize: z.coerce.number().int().min(1).max(12).default(2),
  idempotencyKey: z.string().min(8).max(80),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to redeem." }, { status: 401 });
  }
  if (!isMember(session)) {
    return NextResponse.json({ error: "An active membership is required.", code: "no_membership" }, { status: 402 });
  }

  // Keyed on the member, not the IP: a whole restaurant behind one NAT should
  // not throttle each other, and a single member cannot hammer the write path.
  const verdict = check(`redeem:${session.sub}`, 20, 60_000);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Too many redemption attempts." },
      { status: 429, headers: { ...rateHeaders(verdict), "retry-after": "60" } }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const restaurant = await getRestaurantBySlug(parsed.data.slug);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  const outcome = await redeem({
    memberId: session.sub,
    restaurant,
    partySize: parsed.data.partySize,
    idempotencyKey: parsed.data.idempotencyKey,
  });

  return NextResponse.json(outcome, {
    // A redemption code is personal and single-use. Nothing about it is cacheable.
    headers: { ...rateHeaders(verdict), "cache-control": "no-store" },
  });
}
