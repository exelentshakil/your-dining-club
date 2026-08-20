import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env, hasStripe } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { applyMembership, claimStripeEvent, findMemberByStripeCustomer } from "@/lib/data/members";
import type { Entitlement } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe is the billing source of truth; this endpoint mirrors it locally so no
 * user-facing request ever calls the Stripe API.
 *
 * Two properties matter at volume:
 *  1. Idempotent — Stripe retries on any non-2xx, and at 1M subscriptions the
 *     monthly renewal burst means retries are routine, not exceptional.
 *  2. Fast — every handler is one or two indexed writes. Slow webhook endpoints
 *     get backed off by Stripe, which turns a blip into a backlog.
 */
export async function POST(req: Request) {
  if (!hasStripe || !stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  // Signature verification needs the exact bytes, so read raw — never req.json().
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, env.stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Claim wins the race against a concurrent redelivery; a replay exits here.
  const fresh = await claimStripeEvent(event.id, event.type);
  if (!fresh) return NextResponse.json({ received: true, replay: true });

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const memberId = s.client_reference_id;
      if (memberId) {
        await applyMembership({
          memberId,
          status: "active",
          stripeCustomerId: typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
          stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null,
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const memberId = sub.metadata?.member_id ?? (await findMemberByStripeCustomer(customerId))?.id;
      if (memberId) {
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        await applyMembership({
          memberId,
          status: mapStatus(sub.status),
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });
      }
      break;
    }

    default:
      // Everything else is acknowledged and ignored — an unhandled type is not
      // an error, and returning non-2xx would put Stripe into retry for nothing.
      break;
  }

  return NextResponse.json({ received: true });
}

function mapStatus(status: Stripe.Subscription.Status): Entitlement {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}
