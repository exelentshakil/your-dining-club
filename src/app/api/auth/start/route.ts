import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertMember } from "@/lib/data/members";
import { normalizeCode, normalizePartnerCode } from "@/lib/referral";
import { writeSession } from "@/lib/session";
import { check, clientKey, rateHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(160),
  name: z.string().trim().max(80).optional(),
  /** Referral code of the member who invited them — earns that member a free month. */
  ref: z.string().trim().max(24).optional(),
  /** Business partnership number — earns that business monthly revenue share. */
  partner: z.string().trim().max(24).optional(),
});

/**
 * Identity entry point.
 *
 * NOTE — this issues a session straight from a claimed email address, which is
 * fine for a demo and NOT correct for production. The seam is deliberate:
 * everything downstream reads `getSession()`, so swapping this handler for a
 * magic-link or OTP verification step (Resend/Postmark + a short-lived code)
 * changes this file only. See README, "Before this ships".
 */
export async function POST(req: Request) {
  const verdict = check(clientKey(req, "auth"), 10, 60_000);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { ...rateHeaders(verdict), "retry-after": "60" } }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const member = await upsertMember(parsed.data.email, parsed.data.name ?? null, {
    referredByCode: normalizeCode(parsed.data.ref),
    partnerCode: normalizePartnerCode(parsed.data.partner),
  });
  await writeSession({
    sub: member.id,
    email: member.email,
    name: member.name,
    ent: member.entitlement,
    ev: member.entitlementVer,
  });

  return NextResponse.json(
    { memberId: member.id, entitlement: member.entitlement, referralCode: member.referralCode },
    { headers: { "cache-control": "no-store" } }
  );
}
