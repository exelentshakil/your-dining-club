"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

/**
 * State → city → browse. The city list is passed in from the server rather than
 * fetched, because it is small, cacheable and identical for every visitor.
 */
export function LocationSearch({
  cities,
  basePath,
}: {
  cities: Array<{ city: string; region: string; count: number }>;
  basePath: string;
}) {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");

  const regions = useMemo(
    () => [...new Set(cities.map((c) => c.region))].sort(),
    [cities]
  );
  const citiesInRegion = useMemo(
    () => cities.filter((c) => c.region === region).sort((a, b) => a.city.localeCompare(b.city)),
    [cities, region]
  );

  return (
    <form
      className="card p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (city) params.set("city", city);
        router.push(`${basePath}?${params.toString()}`);
      }}
    >
      <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-ink">
        <span aria-hidden>📍</span> Find Restaurants and Other Businesses By Location
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="label">State</span>
          <select
            className="field mt-1.5"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setCity("");
            }}
          >
            <option value="">Select State</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">City</span>
          <select
            className="field mt-1.5 disabled:bg-ink-wash disabled:text-ink-muted"
            value={city}
            disabled={!region}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">{region ? "Select city" : "Select state first"}</option>
            {citiesInRegion.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city} ({c.count})
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn-primary h-[46px]" disabled={!city}>
          🔍 Search
        </button>
      </div>
    </form>
  );
}
