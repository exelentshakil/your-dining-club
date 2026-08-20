"use client";

import { useEffect, useRef, useState } from "react";
import { RestaurantCard } from "./restaurant-card";
import type { Page, Restaurant } from "@/lib/types";

/**
 * Appends pages using the opaque keyset cursor returned by the API. The client
 * never sends a page number, so a member deep in a large city costs the database
 * exactly what the first page costs.
 */
export function ResultsList({
  initial,
  query,
}: {
  initial: Page<Restaurant>;
  query: Record<string, string>;
}) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Server-rendered first page changed (filters applied) — reset local state.
  useEffect(() => {
    setItems(initial.items);
    setCursor(initial.nextCursor);
    setError(null);
  }, [initial]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setLoading((busy) => {
          if (busy) return busy;
          void loadMore();
          return true;
        });
      },
      { rootMargin: "600px" }
    );
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, items]);

  async function loadMore() {
    if (!cursor) return;
    try {
      const params = new URLSearchParams({ ...query, cursor, limit: "24" });
      const res = await fetch(`/api/restaurants?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const page = (await res.json()) as Page<Restaurant>;
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more");
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card mt-6 p-10 text-center">
        <p className="font-semibold">No restaurants match that yet.</p>
        <p className="mt-1 text-sm text-ink-muted">
          Try a wider radius, or clear a filter.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <RestaurantCard key={r.id} r={r} />
        ))}
      </div>

      <div ref={sentinel} className="h-px" />

      <div className="py-8 text-center text-sm text-ink-muted">
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : loading ? (
          "Loading more…"
        ) : cursor ? (
          <button className="btn-secondary" onClick={() => { setLoading(true); void loadMore(); }}>
            Load more
          </button>
        ) : (
          `That's all ${items.length} matches.`
        )}
      </div>
    </>
  );
}
