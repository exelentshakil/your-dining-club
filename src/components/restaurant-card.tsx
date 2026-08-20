import Link from "next/link";
import type { Restaurant } from "@/lib/types";
import { distanceLabel, offerLabel, priceLabel } from "@/lib/format";
import { categoryBySlug } from "@/data/categories";

/** Deterministic tile art: no image CDN round-trip, no layout shift, no cost. */
function tile(r: Restaurant) {
  const hue = (r.id * 47) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue} 62% 88%), hsl(${(hue + 38) % 360} 70% 78%))`,
  };
}

export function RestaurantCard({ r }: { r: Restaurant }) {
  const distance = distanceLabel(r.distanceM);

  return (
    <Link
      href={`/restaurants/${r.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-36 w-full" style={tile(r)}>
        <span className="absolute left-3 top-3 rounded-pill bg-ink px-3 py-1 text-[11px] font-semibold text-brand">
          {offerLabel(r.offerKind, r.offerValue)}
        </span>
        <span className="absolute bottom-3 right-3 rounded-pill bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink">
          ★ {r.rating.toFixed(1)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold leading-snug group-hover:underline">{r.name}</h3>
          <span className="shrink-0 text-xs text-ink-muted">{priceLabel(r.priceBand)}</span>
        </div>
        <p className="text-xs text-ink-muted">
          {categoryBySlug(r.category)?.name ?? r.cuisine} · {r.city}, {r.region}
          {distance ? ` · ${distance}` : ""}
        </p>
        <p className="mt-auto pt-2 text-xs text-ink-soft">
          Members save about{" "}
          <span className="font-semibold text-ink">${(r.avgSaveCents / 100).toFixed(0)}</span> a visit
        </p>
      </div>
    </Link>
  );
}
