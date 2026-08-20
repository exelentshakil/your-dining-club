import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { JoinForm } from "@/components/join-form";
import { hasStripe } from "@/lib/env";

export const metadata: Metadata = { title: "Join" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function JoinPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const mode = sp.mode === "signin" ? "signin" : "join";
  const cancelled = sp.cancelled === "1";

  return (
    <>
      <SiteNav />
      <main className="shell grid gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <span className="eyebrow">Membership</span>
          <h2 className="mt-3 text-[32px] font-bold leading-tight sm:text-[41px]">
            Two dinners in and it has paid for itself.
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-ink-soft">
            {[
              "2-for-1 mains and up to 25% off across the whole club",
              "Works in every city we operate in — no add-ons",
              "One redemption per restaurant per day, no monthly cap",
              "Cancel in one click; access runs to the end of the period",
            ].map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-ink">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {!hasStripe && (
            <p className="mt-8 rounded-card border border-brand-200 bg-brand-50 p-4 text-xs leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">Demo mode.</strong> No Stripe
              keys are configured, so joining activates a membership locally instead of
              taking a payment. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID for real checkout.
            </p>
          )}
        </div>

        <div>
          {cancelled && (
            <p className="card mb-4 border-brand-200 bg-brand-50 p-4 text-sm text-ink-soft">
              Checkout was cancelled — nothing was charged.
            </p>
          )}
          <Suspense fallback={<div className="card h-[420px] animate-pulse" />}>
            <JoinForm mode={mode} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
