import { NextResponse } from "next/server";
import { hasStripe } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { applyMembership, getMemberById } from "@/lib/data/members";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const member = await getMemberById(session.sub);
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  if (hasStripe && stripe && member.stripeCustomerId) {
    const subs = await stripe.subscriptions.list({ customer: member.stripeCustomerId, limit: 1, status: "active" });
    const sub = subs.data[0];
    if (sub) {
      // Cancel at period end, not immediately — the member paid for this month.
      // The resulting webhook is what updates local state.
      await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
      return NextResponse.json({ ok: true, cancelAtPeriodEnd: true });
    }
  }

  await applyMembership({ memberId: member.id, status: "canceled" });
  return NextResponse.json({ ok: true, cancelAtPeriodEnd: false });
}
