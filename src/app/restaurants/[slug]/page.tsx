import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { RedeemPanel } from "@/components/redeem-panel";
import { RestaurantCard } from "@/components/restaurant-card";
import { getRestaurantBySlug, searchRestaurants } from "@/lib/data/restaurants";
import { savingsFor } from "@/lib/data/redemptions";
import { money, offerLabel, priceLabel } from "@/lib/format";
import { categoryBySlug } from "@/data/categories";

/**
 * The restaurant record changes maybe monthly; the page is requested constantly.
 * Caching the *data* (rather than the page, which varies by session) keeps the
 * database out of the hot path while the nav stays personalised.
 */
// Nothing on this page varies by viewer — the redeem panel resolves the member
// on the client — so the route itself is statically rendered and revalidated.
export const revalidate = 300;
export const dynamicParams = true;

/**
 * Prerenders the head of the popularity distribution at build time; the long
 * tail is rendered on first request and then cached for the same 300s. Restaurant
 * traffic is heavily skewed, so a few hundred prerendered pages absorb most of it
 * without pushing an 80,000-page build.
 */
export async function generateStaticParams() {
  const { items } = await searchRestaurants({ limit: 48 });
  return items.map((r) => ({ slug: r.slug }));
}

const cachedRestaurant = unstable_cache(
  async (slug: string) => getRestaurantBySlug(slug),
  ["restaurant-by-slug"],
  { revalidate: 300, tags: ["restaurants"] }
);

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const r = await cachedRestaurant(slug);
  if (!r) return { title: "Restaurant not found" };
  return {
    title: `${r.name}, ${r.city}`,
    description: `${offerLabel(r.offerKind, r.offerValue)} at ${r.name} in ${r.city}. Included with a Your Dining Club membership.`,
  };
}

export default async function RestaurantPage({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await cachedRestaurant(slug);
  if (!r) notFound();

  const nearby = await searchRestaurants({ city: r.city, limit: 4 });

  const estimate = savingsFor(r, 2);
  const others = nearby.items.filter((n) => n.id !== r.id).slice(0, 3);

  return (
    <>
      <SiteNav />
      <main className="shell py-10">
        <nav className="text-xs text-ink-muted">
          <Link href="/restaurants/browse" className="hover:text-ink">Restaurants</Link>
          <span className="px-2">/</span>
          <Link href={`/restaurants/browse?city=${encodeURIComponent(r.city)}`} className="hover:text-ink">{r.city}</Link>
          <span className="px-2">/</span>
          <span className="text-ink">{r.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div
              className="h-52 rounded-card"
              style={{
                background: `linear-gradient(135deg, hsl(${(r.id * 47) % 360} 62% 88%), hsl(${(r.id * 47 + 38) % 360} 70% 78%))`,
              }}
            />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-pill bg-ink px-3 py-1 text-[11px] font-semibold text-brand">
                {offerLabel(r.offerKind, r.offerValue)}
              </span>
              <span className="rounded-pill border border-ink-line px-3 py-1 text-[11px] text-ink-soft">
                {categoryBySlug(r.category)?.name ?? r.cuisine}
              </span>
              <span className="rounded-pill border border-ink-line px-3 py-1 text-[11px] text-ink-soft">{r.cuisine}</span>
              <span className="rounded-pill border border-ink-line px-3 py-1 text-[11px] text-ink-soft">{priceLabel(r.priceBand)}</span>
              <span className="rounded-pill border border-ink-line px-3 py-1 text-[11px] text-ink-soft">★ {r.rating.toFixed(1)}</span>
            </div>

            <h1 className="mt-4 text-[32px] font-bold leading-tight sm:text-[41px]">{r.name}</h1>
            <p className="mt-2 text-sm text-ink-muted">{r.address} · {r.city}, {r.region}</p>
            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-soft">{r.blurb}</p>

            <div className="card mt-8 p-6">
              <h2 className="text-lg font-semibold">What members get here</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.offerTerms}</p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <Fact label="Typical saving" value={money(r.avgSaveCents)} />
                <Fact label="Table of two" value={money(estimate)} />
                <Fact label="Frequency" value="Once per day" />
              </dl>
            </div>

            {others.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">Also in {r.city}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {others.map((n) => (
                    <RestaurantCard key={n.id} r={n} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <RedeemPanel slug={r.slug} estimateCents={estimate} />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-ink-wash p-4">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{label}</dt>
      <dd className="mt-1 text-lg font-bold">{value}</dd>
    </div>
  );
}
