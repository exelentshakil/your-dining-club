import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantFilters } from "@/components/restaurant-filters";
import { ResultsList } from "@/components/results-list";
import { listCities, listCuisines, searchRestaurants } from "@/lib/data/restaurants";
import { RESTAURANT_CATEGORIES, categoryBySlug } from "@/data/categories";

export const metadata: Metadata = { title: "Browse Restaurants" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const city = one(sp.city);
  const category = one(sp.category);
  const cuisine = one(sp.cuisine);
  const lat = one(sp.lat) ? Number(one(sp.lat)) : undefined;
  const lng = one(sp.lng) ? Number(one(sp.lng)) : undefined;

  const [page, cities, cuisines] = await Promise.all([
    searchRestaurants({ q, city, category, cuisine, lat, lng, radiusKm: 30, limit: 24 }),
    listCities(),
    listCuisines(),
  ]);

  // Same shape the client sends back for page 2+, so the cursor walk stays on
  // the same index as the server-rendered first page.
  const forwardQuery: Record<string, string> = {};
  if (q) forwardQuery.q = q;
  if (city) forwardQuery.city = city;
  if (category) forwardQuery.category = category;
  if (cuisine) forwardQuery.cuisine = cuisine;
  if (lat != null && lng != null) {
    forwardQuery.lat = String(lat);
    forwardQuery.lng = String(lng);
    forwardQuery.radiusKm = "30";
  }

  const near = lat != null && lng != null;
  const cat = category ? categoryBySlug(category) : undefined;

  const heading = cat
    ? `${cat.name}${city ? ` in ${city}` : ""}`
    : city
      ? `Restaurants in ${city}`
      : near
        ? "Restaurants near you"
        : "Every partner restaurant";

  return (
    <>
      <SiteNav />
      <main className="shell py-10">
        <nav className="text-xs text-ink-muted">
          <Link href="/restaurants" className="hover:text-ink">Restaurants</Link>
          <span className="px-2">/</span>
          <span className="text-ink">{cat ? cat.name : "Browse"}</span>
        </nav>

        <h1 className="mt-4 text-[32px] font-bold sm:text-[41px]">{heading}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {near ? "Sorted by distance." : "Sorted by how often members go back."} Your
          membership works at all of them.
        </p>

        {/* Category chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip href="/restaurants/browse" active={!category}>All</Chip>
          {RESTAURANT_CATEGORIES.map((c) => (
            <Chip
              key={c.slug}
              href={`/restaurants/browse?category=${c.slug}${city ? `&city=${encodeURIComponent(city)}` : ""}`}
              active={category === c.slug}
            >
              {c.name}
            </Chip>
          ))}
        </div>

        <div className="mt-5">
          <Suspense fallback={<div className="card h-[132px] animate-pulse" />}>
            <RestaurantFilters cities={cities} cuisines={cuisines} />
          </Suspense>
        </div>

        <ResultsList key={JSON.stringify(forwardQuery)} initial={page} query={forwardQuery} />
      </main>
      <SiteFooter />
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-pill border px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-ink bg-ink text-brand"
          : "border-ink-line text-ink-soft hover:border-ink/40 hover:bg-ink-wash"
      }`}
    >
      {children}
    </Link>
  );
}
