/**
 * Environment access, resolved once. Nothing here throws at import time — the
 * app has to boot and render the marketing site even with no infrastructure
 * attached, so every integration degrades to a clearly-labelled demo mode.
 *
 * `||` rather than `??` on purpose: Vercel (and some other hosts) can set a
 * declared-but-empty env var to `""` rather than leaving it unset, and `??`
 * only falls back on null/undefined — an empty string sails through and later
 * breaks `new URL("")`. `||` treats "" the same as unset, which is what every
 * one of these fallbacks needs.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL || "",
  sessionSecret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePriceId: process.env.STRIPE_PRICE_ID || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};

export const hasDatabase = env.databaseUrl.length > 0;
export const hasStripe = env.stripeSecretKey.length > 0 && env.stripePriceId.length > 0;
