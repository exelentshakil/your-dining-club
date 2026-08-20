import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CategoryGrid } from "@/components/category-grid";
import { LocationSearch } from "@/components/location-search";
import { PageHero } from "@/components/page-hero";
import { RESTAURANT_CATEGORIES } from "@/data/categories";
import { categoryCounts, listCities } from "@/lib/data/restaurants";
import { LAUNCH_DATE, MEMBERSHIP_PRICE_CENTS } from "@/lib/business-model";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Member Restaurants" };
export const revalidate = 300;

export default async function RestaurantsPage() {
  const [counts, cities] = await Promise.all([categoryCounts(), listCities()]);

  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="🍴 Member Restaurants"
          title="Select From All Types Of Restaurants"
          subtitle="Explore the types of restaurant partnerships available. Select a category below to view specific offers, or search for nearby locations."
        />

        <section className="bg-white py-16">
          <div className="shell">
            <CategoryGrid
              categories={RESTAURANT_CATEGORIES}
              counts={counts}
              hrefFor={(c) => `/restaurants/browse?category=${c.slug}`}
            />
          </div>
        </section>

        <section className="bg-ink-wash py-16">
          <div className="shell space-y-8">
            <LaunchNotice />
            <LocationSearch cities={cities} basePath="/restaurants/browse" />
            <p className="text-center text-sm text-ink-muted">
              Or{" "}
              <Link href="/restaurants/browse" className="font-semibold text-ink underline underline-offset-2">
                browse every partner restaurant
              </Link>{" "}
              — {Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString()} listed.
            </p>
          </div>
        </section>

        <section className="bg-brand py-14">
          <div className="shell grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="text-[30px] font-bold leading-tight text-ink sm:text-[36px]">
                Not a Member Yet?
              </h2>
              <p className="mt-3 max-w-xl text-[15px] text-ink/70">
                Become a YDC Member for only {money(MEMBERSHIP_PRICE_CENTS)}/mo and save at
                every restaurant on this list — plus earn free months by referring friends.
              </p>
            </div>
            <div className="lg:justify-self-end">
              <Link href="/join" className="btn-dark">
                ♛ Become A Member — {money(MEMBERSHIP_PRICE_CENTS)}/mo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function LaunchNotice() {
  const when = LAUNCH_DATE.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
  const live = Date.now() >= LAUNCH_DATE.getTime();

  return (
    <div className="flex items-start gap-4 rounded-card bg-ink-black p-6 text-white">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-brand text-lg text-ink" aria-hidden>
        📅
      </span>
      <div>
        <h3 className="font-bold">
          {live
            ? "Your Dining Club is live in its first markets"
            : `Your Dining Club launches on or around ${when}`}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
          {live
            ? "Search below to find partner restaurants near you. New markets are added every month."
            : "We are preparing to launch in multiple markets. The search below covers the markets already onboarding partners. Thank you for your patience during our launch phase."}
        </p>
      </div>
    </div>
  );
}
