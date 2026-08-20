import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/data/categories";
import { img } from "@/lib/images";

/**
 * The category tiles used on /restaurants and /businesses.
 *
 * Every tile is a real photograph fetched once from the Unsplash API, sized down
 * through Imgix params rather than by Next's optimizer — see src/lib/images.ts.
 */
export function CategoryGrid({
  categories,
  counts,
  hrefFor,
  columns = 4,
}: {
  categories: Category[];
  counts?: Record<string, number>;
  hrefFor: (c: Category) => string;
  columns?: 3 | 4;
}) {
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 ${
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
      }`}
    >
      {categories.map((c, i) => {
        const count = counts?.[c.slug];
        return (
          <Link
            key={c.slug}
            id={c.slug}
            href={hrefFor(c)}
            className="group relative block h-44 overflow-hidden rounded-card ring-1 ring-ink-line/60 transition hover:-translate-y-1 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Image
              src={img(c.imageSlug, { w: 600, h: 450 })}
              alt={c.name}
              fill
              // The first row is above the fold on most viewports.
              loading={i < 4 ? "eager" : "lazy"}
              className="object-cover transition duration-500 group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "linear-gradient(175deg, rgba(10,10,10,0.10) 25%, rgba(10,10,10,0.88) 100%)" }}
            />

            <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-[10px] bg-brand text-base shadow-pill">
              <CategoryIcon slug={c.slug} />
            </span>

            {count != null && (
              <span className="absolute right-3 top-3 rounded-pill bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                {count.toLocaleString()} partners
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="text-[15px] font-bold text-white">{c.name}</h3>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.11em] text-white/60">
                {c.tagline}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/** Small glyph per category — avoids shipping an icon library for 40 tiles. */
const ICONS: Record<string, string> = {
  "sit-down": "🍽", "fast-food": "🍔", pizza: "🍕", "coffee-shops": "☕",
  "breakfast-diners": "🥞", "donut-shops": "🍩", "bar-lounge": "🍸", "food-truck": "🚚",
  "amusement-park": "🎢", "auto-dealership": "🚗", bakery: "🥐", "beauty-hair-salon": "✂",
  "book-store": "📚", "bowling-alley": "🎳", butcher: "🥩", "car-mechanic": "🔧",
  "car-wash-detail": "🧽", chiropractic: "🦴", "compound-pharmacy": "⚗", deli: "🥪",
  dental: "🦷", "dietary-support": "🥗", dispensary: "🌿", "dry-cleaner": "👔",
  "electronics-phone": "📱", "family-entertainment": "🕹", florist: "💐",
  "furniture-store": "🛋", "gas-station": "⛽", "golf-course": "⛳",
  "golf-miniature": "🏌", "grocery-store": "🛒", gym: "🏋", "home-improvement": "🔨",
  "hotel-motel": "🏨", "liquor-store": "🍷", massage: "💆", "nail-salon": "💅",
  "pet-store": "🐾", pharmacy: "💊",
};

function CategoryIcon({ slug }: { slug: string }) {
  return <span aria-hidden>{ICONS[slug] ?? "◆"}</span>;
}
