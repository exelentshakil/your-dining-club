import { NextResponse } from "next/server";
import { env, hasStripe } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { applyMembership, getMemberById } from "@/lib/data/members";
import { getSession, writeSession } from "@/lib/session";
import { check, rateHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const verdict = check(`checkout:${session.sub}`, 8, 60_000);
  if (!verdict.ok) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429, headers: rateHeaders(verdict) });
  }

  const member = await getMemberById(session.sub);
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  // No Stripe keys configured: activate locally so the member journey is fully
  // walkable in a demo. Production always takes the branch below.
  if (!hasStripe || !stripe) {
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await applyMembership({ memberId: member.id, status: "active", currentPeriodEnd: periodEnd });
    await writeSession({
      sub: member.id,
      email: member.email,
      name: member.name,
      ent: "active",
      ev: member.entitlementVer + 1,
    });
    return NextResponse.json({ mode: "demo", redirectUrl: "/account?welcome=1" }, { headers: { "cache-control": "no-store" } });
  }

  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: env.stripePriceId, quantity: 1 }],
      customer_email: member.stripeCustomerId ? undefined : member.email,
      customer: member.stripeCustomerId ?? undefined,
      // Carried back on the webhook so the subscription binds to the right member
      // without a lookup by email (emails change; ids do not).
      client_reference_id: member.id,
      subscription_data: {
        metadata: {
          member_id: member.id,
          // Revenue-share settlement reads this off the subscription, so the
          // attribution survives even if the local row is ever rebuilt.
          partner_code: member.partnerCode ?? "",
        },
      },
      success_url: `${env.siteUrl}/account?welcome=1`,
      cancel_url: `${env.siteUrl}/join?cancelled=1`,
      allow_promotion_codes: true,
    },
    // Guards against a double-submitted join form creating two checkouts.
    { idempotencyKey: `checkout:${member.id}:${Math.floor(Date.now() / 60_000)}` }
  );

  return NextResponse.json(
    { mode: "stripe", redirectUrl: checkout.url },
    { headers: { "cache-control": "no-store" } }
  );
}
