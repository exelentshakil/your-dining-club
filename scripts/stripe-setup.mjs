#!/usr/bin/env node
/**
 * Creates (or finds) the Your Dining Club membership product and its $19.95
 * monthly price, then prints the price id to paste into .env.local.
 *
 *   node --env-file=.env.local scripts/stripe-setup.mjs
 *
 * Safe to re-run: it looks the product up by a stable lookup key first, so a
 * second run reports the existing price instead of creating a duplicate.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(
    "STRIPE_SECRET_KEY is not set.\n" +
      "Add it to .env.local, then run:\n" +
      "  node --env-file=.env.local scripts/stripe-setup.mjs"
  );
  process.exit(1);
}

const LOOKUP_KEY = "ydc_membership_monthly";
const PRICE_CENTS = 1995;
const live = key.startsWith("sk_live_");

const stripe = new Stripe(key, { maxNetworkRetries: 2 });

console.log(`Mode: ${live ? "LIVE — real charges" : "TEST"}`);

// A lookup key makes this idempotent without storing any local state.
const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], expand: ["data.product"], limit: 1 });

if (existing.data[0]) {
  const price = existing.data[0];
  console.log(`\nFound existing price.\n  STRIPE_PRICE_ID=${price.id}`);
  console.log(`  product: ${typeof price.product === "string" ? price.product : price.product.id}`);
  console.log(`  amount: $${(price.unit_amount / 100).toFixed(2)} / ${price.recurring.interval}`);
  process.exit(0);
}

const product = await stripe.products.create({
  name: "Your Dining Club Membership",
  description:
    "Buy 2 drinks, 1 appetizer and 1 entrée at participating restaurants and receive a 5th menu item of equal or lesser value free. Unlimited use, no contracts.",
  metadata: { app: "yourdiningclub" },
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: PRICE_CENTS,
  currency: "usd",
  recurring: { interval: "month" },
  lookup_key: LOOKUP_KEY,
  metadata: { app: "yourdiningclub" },
});

console.log(`
Created:
  product  ${product.id}
  price    ${price.id}   $${(PRICE_CENTS / 100).toFixed(2)}/month

Add this line to .env.local:
  STRIPE_PRICE_ID=${price.id}

Then, for local webhook testing:
  stripe listen --forward-to localhost:3419/api/stripe/webhook
and copy the printed whsec_... into STRIPE_WEBHOOK_SECRET.
`);
