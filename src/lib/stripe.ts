import Stripe from "stripe";
import { env, hasStripe } from "./env";

const g = globalThis as unknown as { ydcStripe?: Stripe };

export const stripe: Stripe | null = hasStripe
  ? (g.ydcStripe ??= new Stripe(env.stripeSecretKey, {
      // Retries are on by default; the webhook handler is idempotent, so a
      // duplicate delivery caused by a retry is a no-op rather than a double charge.
      maxNetworkRetries: 2,
      timeout: 8_000,
    }))
  : null;
