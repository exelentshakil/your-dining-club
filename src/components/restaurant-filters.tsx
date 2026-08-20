"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function RestaurantFilters({
  cities,
  cuisines,
}: {
  cities: Array<{ city: string; region: string; count: number }>;
  cuisines: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [locating, setLocating] = useState(false);

  // The URL is the single source of truth for the query. That keeps every list
  // view shareable, back-button-correct, and cacheable by the CDN on its key.
  function apply(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.push(`/restaurants/browse?${next.toString()}`));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        apply({
          lat: pos.coords.latitude.toFixed(4),
          lng: pos.coords.longitude.toFixed(4),
          city: null,
        });
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  }

  const nearMe = params.get("lat") && params.get("lng");

  return (
    <div className="card p-4">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
      >
        <input
          className="field flex-1"
          placeholder="Search a restaurant, cuisine or city"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search restaurants"
        />
        <button type="submit" className="btn-primary" disabled={pending}>
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={nearMe ? () => apply({ lat: null, lng: null }) : useMyLocation}
          className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition ${
            nearMe ? "border-ink bg-ink text-brand" : "border-ink-line text-ink-soft hover:border-ink/40"
          }`}
        >
          {locating ? "Locating…" : nearMe ? "Near me · on" : "Near me"}
        </button>

        <select
          className="rounded-pill border border-ink-line bg-white px-3 py-1.5 text-xs text-ink-soft"
          value={params.get("city") ?? ""}
          onChange={(e) => apply({ city: e.target.value || null, lat: null, lng: null })}
          aria-label="Filter by city"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={`${c.city}-${c.region}`} value={c.city}>
              {c.city}, {c.region} ({c.count})
            </option>
          ))}
        </select>

        <select
          className="rounded-pill border border-ink-line bg-white px-3 py-1.5 text-xs text-ink-soft"
          value={params.get("cuisine") ?? ""}
          onChange={(e) => apply({ cuisine: e.target.value || null })}
          aria-label="Filter by cuisine"
        >
          <option value="">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {(params.get("q") || params.get("city") || params.get("cuisine") || nearMe) && (
          <button
            type="button"
            className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
            onClick={() => {
              setQ("");
              startTransition(() => router.push("/restaurants/browse"));
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
