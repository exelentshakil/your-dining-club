import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SavingsCalculator } from "@/components/savings-calculator";
import { Faq } from "@/components/faq";
import { img, creditFor } from "@/lib/images";
import { RESTAURANT_CATEGORIES } from "@/data/categories";
import {
  MEMBERSHIP_PRICE_CENTS,
  REFERRAL,
  REV_SHARE_CENTS,
} from "@/lib/business-model";
import { money } from "@/lib/format";

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <CalculatorSection />
        <StatsBand />
        <CategoryPeek />
        <PartnerTeaser />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function Hero() {
  const credit = creditFor("hero-dining");
  return (
    <section className="relative overflow-hidden bg-ink-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 420px at 12% -10%, rgba(253,185,19,0.16) 0%, transparent 62%), radial-gradient(700px 380px at 88% 4%, rgba(229,52,42,0.12) 0%, transparent 58%)",
        }}
      />
      <div className="shell relative grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div className="animate-fade-up">
          <span className="eyebrow-dark">★ America&apos;s #1 Dining Membership</span>

          <h1 className="mt-5 text-[38px] font-bold leading-[1.06] sm:text-[52px] lg:text-[58px]">
            Save <span className="text-brand">$500–$1,000+</span>
            <br />
            Every Month Dining Out
          </h1>

          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/65">
            Buy 2 drinks, 1 appetizer &amp; 1 entrée — get a 5th menu item of equal
            or lesser value <span className="font-semibold text-brand">absolutely FREE</span> at
            hundreds of restaurants. Only {money(MEMBERSHIP_PRICE_CENTS)}/month, cancel anytime.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/join" className="btn-primary">
              ♛ Become A Member — {money(MEMBERSHIP_PRICE_CENTS)}/mo
            </Link>
            <Link href="/#how" className="btn-outline">▶ How It Works</Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-white/55">
            {[
              ["✓", "No contracts"],
              ["∞", "Unlimited use"],
              ["▣", "iOS & Android app"],
              ["★", `Earn free months`],
            ].map(([icon, label]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="text-brand" aria-hidden>{icon}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual */}
        <div className="relative animate-fade-up">
          <div className="overflow-hidden rounded-card ring-1 ring-white/15 shadow-lift">
            <div className="relative h-[300px] sm:h-[360px]">
              <Image
                src={img("hero-dining", { w: 1200, h: 800 })}
                alt="Friends dining together at a restaurant"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.88) 100%)" }}
              />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
                  The 5th item is free
                </p>
                <p className="mt-2 text-xl font-bold leading-snug">
                  Perfect for couples, families, business entertaining — and anyone
                  who loves to dine out.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 bg-ink-panel sm:grid-cols-4">
              <HeroStat value={money(MEMBERSHIP_PRICE_CENTS)} label="Per month" />
              <HeroStat value="$1,000+" label="Monthly savings" />
              <HeroStat value="∞" label="Times you can use it" />
              <HeroStat value="0" label="Contracts" />
            </div>
          </div>

          {credit && (
            <p className="mt-3 text-right text-[11px] text-white/35">
              Photo:{" "}
              <a href={credit.href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white/60">
                {credit.name}
              </a>{" "}
              / Unsplash
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 py-4 text-center">
      <div className="text-lg font-bold text-brand">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/45">{label}</div>
    </div>
  );
}

/* ── Trust strip ──────────────────────────────────────────────────────────── */

function TrustStrip() {
  const items = [
    ["✓", "No Contracts — Cancel Anytime"],
    ["∞", "Unlimited Use, No Limits"],
    ["$", `Only ${money(MEMBERSHIP_PRICE_CENTS)} Per Month`],
  ];
  return (
    <section className="border-y-2 border-brand bg-ink-black">
      <div className="shell flex flex-wrap items-center justify-center gap-x-12 gap-y-3 py-4 text-[13px] font-medium text-white/75">
        {items.map(([icon, label]) => (
          <span key={label} className="flex items-center gap-2">
            <span className="text-brand" aria-hidden>{icon}</span>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── How it works ─────────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    { n: 1, icon: "👤", t: "Sign Up Online", d: `Create your Your Dining Club account in minutes for just ${money(MEMBERSHIP_PRICE_CENTS)}/month — no long-term commitment.` },
    { n: 2, icon: "📱", t: "Download the App", d: "Get the Your Dining Club app on the App Store or Google Play and log into your new account." },
    { n: 3, icon: "🍽", t: "Dine & Save", d: "Purchase 2 drinks, 1 appetizer & 1 entrée — then receive a 5th item of equal or lesser value FREE." },
    { n: 4, icon: "🎁", t: "Refer & Earn FREE Months", d: `Invite friends. For every referral who stays ${REFERRAL.qualifyingDays} days, earn a FREE month. No cap on referrals.` },
  ];

  return (
    <section id="how" className="bg-ink-wash py-20 sm:py-24">
      <div className="shell">
        <div className="text-center">
          <span className="eyebrow">⚡ How It Works</span>
          <h2 className="section-head mx-auto mt-4 max-w-2xl">
            Saving Money Has <span className="accent">Never Been Easier</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-muted">
            Four simple steps to start saving hundreds every month at your favorite
            restaurants.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="card group relative p-6 transition hover:-translate-y-1 hover:shadow-lift">
              <div className="relative inline-grid h-14 w-14 place-items-center rounded-full bg-brand text-2xl">
                <span aria-hidden>{s.icon}</span>
                <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-flame text-[11px] font-bold text-white">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-5 text-[17px] font-bold">{s.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Calculator ───────────────────────────────────────────────────────────── */

function CalculatorSection() {
  return (
    <section id="calculator" className="bg-white py-20 sm:py-24">
      <div className="shell">
        <div className="text-center">
          <span className="eyebrow">▦ Savings Calculator</span>
          <h2 className="section-head mx-auto mt-4 max-w-2xl">
            See How Much <span className="accent">You Can Save</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-muted">
            Adjust the party size and average entrée cost below to instantly
            calculate your potential monthly savings.
          </p>
        </div>

        <div className="mt-12">
          <SavingsCalculator />
        </div>

        <div className="mt-10 text-center">
          <Link href="/join" className="btn-dark">
            ♛ Become A Member — {money(MEMBERSHIP_PRICE_CENTS)} / Month
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Stats band ───────────────────────────────────────────────────────────── */

function StatsBand() {
  const stats = [
    [money(MEMBERSHIP_PRICE_CENTS), "Per Month — All-Inclusive"],
    ["$1,000+", "Potential Monthly Savings"],
    ["0", "Contracts or Blackout Dates"],
    ["∞", "Referral Earnings Potential"],
  ];
  return (
    <section className="bg-ink-black py-16">
      <div className="shell grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label}>
            <div className="text-[36px] font-bold leading-none text-brand sm:text-[44px]">{value}</div>
            <div className="mt-3 text-[12px] text-white/50">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Category peek ────────────────────────────────────────────────────────── */

function CategoryPeek() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">🍴 Where It Works</span>
            <h2 className="section-head mt-4">
              Every Kind of <span className="accent">Restaurant</span>
            </h2>
            <p className="mt-3 max-w-lg text-[15px] text-ink-muted">
              From white-tablecloth dining to the coffee shop on your commute —
              plus 32 more categories of local business.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/restaurants" className="btn-secondary">All restaurants</Link>
            <Link href="/businesses" className="btn-dark">Other businesses</Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RESTAURANT_CATEGORIES.slice(0, 4).map((c) => (
            <Link
              key={c.slug}
              href={`/restaurants#${c.slug}`}
              className="group relative h-44 overflow-hidden rounded-card ring-1 ring-ink-line"
            >
              <Image
                src={img(c.imageSlug, { w: 600, h: 450 })}
                alt={c.name}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 280px"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.05) 30%, rgba(10,10,10,0.85) 100%)" }}
              />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-[15px] font-bold text-white">{c.name}</h3>
                <p className="text-[10px] uppercase tracking-[0.1em] text-white/60">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Partner teaser ───────────────────────────────────────────────────────── */

function PartnerTeaser() {
  const credit = creditFor("partner-owner");
  return (
    <section className="bg-ink-wash py-20 sm:py-24">
      <div className="shell grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="relative h-[320px] overflow-hidden rounded-card ring-1 ring-ink-line sm:h-[400px]">
          <Image
            src={img("partner-owner", { w: 900, h: 900 })}
            alt="A restaurant owner in their kitchen"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 560px"
          />
          {credit && (
            <span className="absolute bottom-2 right-3 text-[10px] text-white/70">
              Photo:{" "}
              <a href={credit.href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {credit.name}
              </a>
            </span>
          )}
        </div>

        <div>
          <span className="eyebrow">🏪 For Business Owners</span>
          <h2 className="section-head mt-4">
            Get Paid <span className="accent">Every Month</span> For Every Member You Send Us
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Partnership is free for qualifying businesses. You earn{" "}
            <strong>{money(REV_SHARE_CENTS.min)}–{money(REV_SHARE_CENTS.max)} every month</strong>{" "}
            for every member who joins under your partnership number — for as long as
            they stay. There is no cap.
          </p>
          <ul className="mt-6 space-y-3 text-[14px] text-ink-soft">
            {[
              "Category exclusivity — we limit how many businesses per category, per market",
              "Redemption cost as low as 0% once revenue sharing is counted",
              "Fraud-proof redemptions with a unique transaction number every time",
              "2.99¢ direct mail to 10,000 high-end homes — free for 12 months",
            ].map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-ink">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/partners" className="btn-dark mt-8">Apply For FREE Partnership →</Link>
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="bg-brand py-16">
      <div className="shell grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <h2 className="text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
            Ready to Start Saving on Every Meal?
          </h2>
          <p className="mt-3 max-w-xl text-[15px] text-ink/70">
            Join thousands of members already saving $500–$1,000+ every month at
            their favorite restaurants.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/join" className="btn-dark">♛ Join for {money(MEMBERSHIP_PRICE_CENTS)}/mo</Link>
          <Link
            href="/partners"
            className="inline-flex items-center justify-center gap-2 rounded-pill border border-ink/25 px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-ink/10"
          >
            🏪 Business Apply
          </Link>
        </div>
      </div>
    </section>
  );
}
