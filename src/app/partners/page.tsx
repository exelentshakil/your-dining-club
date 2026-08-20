import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { PartnerForm } from "@/components/partner-form";
import { PartnerEarnings } from "@/components/partner-earnings";
import { categoryBySlug } from "@/data/categories";
import {
  DIRECT_MAIL,
  MAX_PARTNERS_PER_CATEGORY_PER_MARKET,
  REDEMPTION_COST,
  REV_SHARE_CENTS,
} from "@/lib/business-model";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Become A Partner" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BENEFITS = [
  {
    icon: "🎁",
    title: "Join YDC 100% FREE",
    body: `For businesses that qualify, your YDC Business Partnership is 100% FREE — including revenue sharing, ${DIRECT_MAIL.centsPerPiece}¢ direct mail, and access to wholesale full-color printing.`,
  },
  {
    icon: "🏆",
    title: "Huge Competitive Advantage",
    body: `Because YDC limits the number of businesses per industry category, your business enjoys a decisive advantage over the rest of your market.`,
  },
  {
    icon: "💵",
    title: "FREE YDC Revenue Sharing",
    body: `Earn ${money(REV_SHARE_CENTS.min)} to ${money(REV_SHARE_CENTS.max)} per month for every YDC member who signs up using your unique partnership number. No caps — it goes straight to your bottom line.`,
  },
  {
    icon: "👥",
    title: "Attract New Customers",
    body: "Members in your market actively look for new businesses to visit in order to maximize the value of their membership.",
  },
  {
    icon: "📈",
    title: "Increase Purchasing Frequency",
    body: "Turn your best customers into more frequent purchasers every month, which compounds into higher bottom-line profits.",
  },
  {
    icon: "⬇",
    title: "Lowest Redemption Cost In America",
    body: `Redemption costs run as low as ${(REDEMPTION_COST.min * 100).toFixed(0)}% once revenue sharing is counted. Without it, redemption averages between 9% and ${(REDEMPTION_COST.max * 100).toFixed(0)}% for most businesses.`,
  },
  {
    icon: "🛡",
    title: "Fraud Proof Redemption System",
    body: "The YDC platform issues a unique transaction number for every redemption, so staff cannot be dishonest and every discount is accounted for.",
  },
  {
    icon: "✉",
    title: `${DIRECT_MAIL.centsPerPiece}¢ Direct Mail`,
    body: `Reach ${DIRECT_MAIL.homesPerMonth.toLocaleString()} high-end homes per month at ${DIRECT_MAIL.centsPerPiece}¢ per piece — free for your first ${DIRECT_MAIL.freeMonths} months.`,
  },
];

export default async function PartnersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const preselected = raw && categoryBySlug(raw) ? raw : undefined;

  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="🤝 Business Partnership"
          title="Apply To Become A YDC Business Partner"
          subtitle={`Only ${MAX_PARTNERS_PER_CATEGORY_PER_MARKET} businesses per category are accepted in each market — and spaces fill fast. Apply today to secure your position.`}
        />

        <section className="bg-white py-16">
          <div className="shell grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="card p-6 transition hover:-translate-y-1 hover:shadow-lift">
                <span className="grid h-12 w-12 place-items-center rounded-[10px] bg-brand-50 text-2xl" aria-hidden>
                  {b.icon}
                </span>
                <h3 className="mt-4 text-[15px] font-bold leading-snug">{b.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="revenue" className="bg-ink-wash py-16">
          <div className="shell">
            <div className="text-center">
              <span className="eyebrow">📊 Run The Numbers</span>
              <h2 className="section-head mx-auto mt-4 max-w-2xl">
                Revenue Sharing Is <span className="accent">Recurring</span>. The Discount Is Not.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[15px] text-ink-muted">
                You are paid every month for every member you enroll, for as long as they
                stay. Move the sliders to see where your break-even sits.
              </p>
            </div>
            <div className="mx-auto mt-10 max-w-3xl">
              <PartnerEarnings />
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="shell mx-auto max-w-4xl">
            <Suspense fallback={<div className="card h-[600px] animate-pulse" />}>
              <PartnerForm initialCategory={preselected} />
            </Suspense>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
