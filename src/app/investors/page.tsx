import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { InvestorModel, UnitEconomics } from "@/components/investor-model";
import { SLOTS_PER_MARKET } from "@/lib/projection";
import { ALL_CATEGORIES, BUSINESS_CATEGORIES, RESTAURANT_CATEGORIES } from "@/data/categories";
import {
  MEMBERSHIP_PRICE_CENTS,
  REV_SHARE_CENTS,
  MAX_PARTNERS_PER_CATEGORY_PER_MARKET,
  contributionMarginCents,
  grossMarginPercent,
  lifetimeMonthsFromChurn,
  memberLtvCents,
  processingCostCents,
} from "@/lib/business-model";
import { money } from "@/lib/format";

export const metadata: Metadata = {
  title: "Investor Room",
  description: "The economics behind Your Dining Club — a partner-acquired subscription network.",
};
export const revalidate = 3600;

export default function InvestorsPage() {
  const contribution = contributionMarginCents();
  const processing = processingCostCents();
  const margin = grossMarginPercent();
  const lifetime = lifetimeMonthsFromChurn(0.045);
  const ltv = memberLtvCents(lifetime);

  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="📈 Investor Room"
          title="The restaurants are the sales force."
          subtitle="Your Dining Club is a subscription business whose customer acquisition is performed by the merchants themselves — paid monthly, out of revenue, only while the member stays."
        />

        <Thesis />

        <section className="bg-white py-16 sm:py-20">
          <div className="shell grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <span className="eyebrow">◧ Unit Economics</span>
              <h2 className="section-head mt-4">
                Where every <span className="accent">{money(MEMBERSHIP_PRICE_CENTS)}</span> goes
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                The partner revenue share is the single largest line — and that is the
                design, not a leak. It is the entire customer acquisition budget, it is
                paid out of revenue rather than ahead of it, and it stops the month a
                member leaves. There is no upfront CAC to recover.
              </p>

              <dl className="mt-7 grid grid-cols-2 gap-4">
                <Metric label="Contribution margin" value={`${Math.round(margin * 100)}%`} />
                <Metric label="Per member / month" value={money(contribution)} />
                <Metric label="Implied lifetime" value={`${lifetime.toFixed(0)} mo`} hint="at 4.5% monthly churn" />
                <Metric label="LTV per member" value={money(ltv)} hint="contribution × lifetime" />
              </dl>
            </div>

            <div className="card p-7">
              <h3 className="text-base font-bold">One membership, broken down</h3>
              <p className="mb-6 mt-1 text-[13px] text-ink-muted">
                Monthly, per member, at the typical revenue-share rate.
              </p>
              <UnitEconomics
                price={MEMBERSHIP_PRICE_CENTS}
                revShare={REV_SHARE_CENTS.typical}
                processing={processing}
                contribution={contribution}
              />
              <p className="mt-6 border-t border-ink-line pt-4 text-[12px] leading-relaxed text-ink-muted">
                Payback period is <strong className="text-ink">zero months</strong>. A member is
                contribution-positive on their first invoice, because the acquisition cost is
                a revenue share rather than a prepaid advertising spend.
              </p>
            </div>
          </div>
        </section>

        <Flywheel />

        <section className="bg-white py-16 sm:py-20">
          <div className="shell">
            <div className="text-center">
              <span className="eyebrow">▤ Scenario Model</span>
              <h2 className="section-head mx-auto mt-4 max-w-3xl">
                Move the assumptions. <span className="accent">Watch the model respond.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[15px] text-ink-muted">
                Nothing below is a fitted curve. Markets open, category slots fill, partners
                enroll members, members churn — the arithmetic is multiplied out month by month.
              </p>
            </div>
            <div className="mt-10">
              <InvestorModel />
            </div>
          </div>
        </section>

        <MarketMath />
        <Moat />

        <section className="bg-brand py-14">
          <div className="shell flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-[28px] font-bold leading-tight text-ink sm:text-[34px]">
                Want the full data room?
              </h2>
              <p className="mt-2 max-w-xl text-[15px] text-ink/70">
                Cohort tables, market-level P&amp;L, partner pipeline and the live product.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/scale" className="btn-dark">Technical architecture →</Link>
              <Link href="/partners" className="rounded-pill border border-ink/25 px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-ink/10">
                See the partner funnel
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Thesis() {
  const points = [
    {
      k: "01",
      t: "Acquisition is a revenue share, not a budget",
      d: `Partners earn ${money(REV_SHARE_CENTS.min)}–${money(REV_SHARE_CENTS.max)} per member, per month, for as long as that member stays. No upfront spend, no payback period, and the cost disappears the moment the revenue does.`,
    },
    {
      k: "02",
      t: "Scarcity makes partners recruit",
      d: `Only ${MAX_PARTNERS_PER_CATEGORY_PER_MARKET} businesses per category per market are admitted. Exclusivity is what converts a partner from a passive listing into an active seller — the members they sign up are members their competitor cannot have.`,
    },
    {
      k: "03",
      t: "Both sides get more valuable together",
      d: `Each partner makes the membership worth more to members; each member makes the partnership worth more to businesses. ${ALL_CATEGORIES.length} categories means the flywheel does not stall once restaurants saturate.`,
    },
    {
      k: "04",
      t: "The offer costs the merchant less than advertising",
      d: "A free fifth item is priced at food cost, not menu price, and it arrives with a paying table. Set against the revenue share, effective redemption cost approaches zero.",
    },
  ];

  return (
    <section className="bg-ink-black py-16 text-white sm:py-20">
      <div className="shell">
        <span className="eyebrow-dark">The thesis</span>
        <h2 className="section-head mt-4 max-w-3xl">
          Four things make this different from a coupon book.
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {points.map((p) => (
            <div key={p.k} className="rounded-card border border-white/10 bg-white/[0.03] p-6">
              <span className="text-sm font-bold text-brand">{p.k}</span>
              <h3 className="mt-3 text-[17px] font-bold">{p.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/55">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Flywheel() {
  const steps = [
    ["Partner joins free", "Category exclusivity in their market"],
    ["Partner enrolls members", `Earns ${money(REV_SHARE_CENTS.typical)}/member/month, forever`],
    ["Members redeem", "Full-price tables the partner would not have had"],
    ["Members refer members", "Free month per referral — zero-cost growth"],
    ["Network gets denser", "Membership worth more → churn falls → partner income rises"],
  ];
  return (
    <section className="bg-ink-wash py-16 sm:py-20">
      <div className="shell">
        <div className="text-center">
          <span className="eyebrow">⟳ The Flywheel</span>
          <h2 className="section-head mx-auto mt-4 max-w-2xl">
            Every turn makes the <span className="accent">next turn cheaper</span>
          </h2>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(([t, d], i) => (
            <li key={t} className="relative card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[13px] font-bold text-brand">
                {i + 1}
              </span>
              <h3 className="mt-3 text-[14px] font-bold leading-snug">{t}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function MarketMath() {
  const slots = SLOTS_PER_MARKET;
  return (
    <section className="bg-ink-black py-16 text-white sm:py-20">
      <div className="shell grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="eyebrow-dark">▦ Market Math</span>
          <h2 className="section-head mt-4">
            Every market is the <span className="text-brand">same repeatable unit</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            A market is not a negotiation — it is a template. {RESTAURANT_CATEGORIES.length}{" "}
            restaurant categories and {BUSINESS_CATEGORIES.length} other business categories,
            each holding {MAX_PARTNERS_PER_CATEGORY_PER_MARKET} partner slots. That is{" "}
            {slots} sellable positions per city, priced identically everywhere, sold by the
            same playbook.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Expansion is therefore a hiring problem rather than a product problem — which is
            the part of this business that scales linearly with capital.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DarkMetric value={String(ALL_CATEGORIES.length)} label="Categories per market" />
          <DarkMetric value={String(MAX_PARTNERS_PER_CATEGORY_PER_MARKET)} label="Partners per category" />
          <DarkMetric value={String(slots)} label="Partner slots per market" />
          <DarkMetric value="100+" label="US metros addressable" />
        </div>
      </div>
    </section>
  );
}

function Moat() {
  const items = [
    ["Exclusivity contracts", "A competitor entering a market finds the best operator in each category already committed — and paid monthly to stay."],
    ["Recurring partner income", "Partners are not listed, they are invested. Churning the platform means cancelling their own revenue stream."],
    ["Redemption data", "Every redemption carries a unique transaction number, building per-market demand data no competitor can reconstruct."],
    ["Member habit", "The offer rewards frequency, not one-off deal hunting. Usage compounds into routine, and routine is what suppresses churn."],
  ];
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="shell">
        <div className="text-center">
          <span className="eyebrow">🛡 Defensibility</span>
          <h2 className="section-head mx-auto mt-4 max-w-2xl">
            Why this is <span className="accent">hard to copy</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {items.map(([t, d]) => (
            <div key={t} className="card p-6">
              <h3 className="text-[16px] font-bold">{t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card bg-ink-wash p-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-muted">{hint}</div>}
    </div>
  );
}

function DarkMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-white/10 bg-white/[0.03] p-5 text-center">
      <div className="text-[32px] font-bold leading-none text-brand">{value}</div>
      <div className="mt-2 text-[11px] text-white/50">{label}</div>
    </div>
  );
}
