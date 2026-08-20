import { sql } from "../db";
import { hasDatabase } from "../env";
import { demoCities, demoRestaurants } from "../demo-data";
import { decodeCursor, encodeCursor } from "../cursor";
import type { Page, Restaurant, RestaurantQuery } from "../types";

const MAX_LIMIT = 48;

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToRestaurant(r: any): Restaurant {
  return {
    id: Number(r.id),
    slug: r.slug,
    name: r.name,
    category: r.category,
    cuisine: r.cuisine,
    blurb: r.blurb ?? "",
    address: r.address ?? "",
    city: r.city,
    region: r.region,
    lat: Number(r.lat),
    lng: Number(r.lng),
    priceBand: Number(r.price_band),
    offerKind: r.offer_kind,
    offerValue: Number(r.offer_value),
    offerTerms: r.offer_terms ?? "",
    avgSaveCents: Number(r.avg_save_cents),
    rating: Number(r.rating),
    popularity: Number(r.popularity),
    distanceM: r.distance_m == null ? undefined : Number(r.distance_m),
  };
}

/**
 * The one list query the whole product is built on.
 *
 * Two sort modes, each with an index that matches the keyset exactly:
 *   near me  -> (distance asc, id asc)   via the GiST earth-point index
 *   browse   -> (popularity desc, id desc) via restaurants_city_rank_idx
 *
 * Both are pure index seeks, so the cost of a page is independent of how deep
 * into the result set the caller has scrolled.
 */
export async function searchRestaurants(query: RestaurantQuery): Promise<Page<Restaurant>> {
  const limit = Math.min(Math.max(query.limit, 1), MAX_LIMIT);
  return hasDatabase ? searchInPostgres(query, limit) : searchInMemory(query, limit);
}

async function searchInPostgres(query: RestaurantQuery, limit: number): Promise<Page<Restaurant>> {
  const cursor = decodeCursor(query.cursor);
  const params: unknown[] = [];
  const push = (v: unknown) => `$${params.push(v)}`;

  const where: string[] = ["is_active"];
  if (query.city) where.push(`city = ${push(query.city)}`);
  if (query.category) where.push(`category = ${push(query.category)}`);
  if (query.cuisine) where.push(`cuisine = ${push(query.cuisine)}`);
  if (query.q) {
    // websearch_to_tsquery handles quoted phrases and "-word" without throwing
    // on user input the way plainto_/to_tsquery can.
    const q = push(query.q);
    where.push(`(search_vec @@ websearch_to_tsquery('simple', ${q}) OR name % ${q})`);
  }

  const geo = query.lat != null && query.lng != null;
  let orderBy: string;
  let distanceExpr = "NULL::double precision";

  if (geo) {
    const lat = push(query.lat);
    const lng = push(query.lng);
    const radiusM = push(Math.round((query.radiusKm ?? 25) * 1000));
    distanceExpr = `earth_distance(ll_to_earth(${lat}, ${lng}), ll_to_earth(lat, lng))`;
    where.push(`earth_box(ll_to_earth(${lat}, ${lng}), ${radiusM}) @> ll_to_earth(lat, lng)`);
    where.push(`${distanceExpr} <= ${radiusM}`);
    if (cursor) {
      where.push(`(${distanceExpr}, id) > (${push(cursor.rank)}::double precision, ${push(cursor.id)}::bigint)`);
    }
    orderBy = `${distanceExpr} ASC, id ASC`;
  } else {
    if (cursor) {
      where.push(`(popularity, id) < (${push(cursor.rank)}::integer, ${push(cursor.id)}::bigint)`);
    }
    orderBy = "popularity DESC, id DESC";
  }

  // limit + 1 detects "is there another page" without a second COUNT query.
  const rows = await sql(
    `SELECT id, slug, name, category, cuisine, blurb, address, city, region, lat, lng,
            price_band, offer_kind, offer_value, offer_terms, avg_save_cents,
            rating, popularity, ${distanceExpr} AS distance_m
       FROM restaurants
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT ${push(limit + 1)}`,
    params
  );

  const items = rows.slice(0, limit).map(rowToRestaurant);
  const hasMore = rows.length > limit;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeCursor({ rank: geo ? Math.round(last.distanceM ?? 0) : last.popularity, id: last.id })
        : null,
  };
}

/** Mirrors the SQL semantics exactly, over the in-memory demo catalogue. */
function searchInMemory(query: RestaurantQuery, limit: number): Page<Restaurant> {
  const cursor = decodeCursor(query.cursor);
  const geo = query.lat != null && query.lng != null;
  const radiusM = (query.radiusKm ?? 25) * 1000;
  const needle = query.q?.trim().toLowerCase();

  let rows = demoRestaurants().filter((r) => {
    if (query.city && r.city !== query.city) return false;
    if (query.category && r.category !== query.category) return false;
    if (query.cuisine && r.cuisine !== query.cuisine) return false;
    if (needle) {
      const hay = `${r.name} ${r.cuisine} ${r.city}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  if (geo) {
    rows = rows
      .map((r) => ({ ...r, distanceM: haversineM(query.lat!, query.lng!, r.lat, r.lng) }))
      .filter((r) => r.distanceM! <= radiusM)
      .sort((a, b) => a.distanceM! - b.distanceM! || a.id - b.id);
    if (cursor) {
      rows = rows.filter(
        (r) => Math.round(r.distanceM!) > cursor.rank || (Math.round(r.distanceM!) === cursor.rank && r.id > cursor.id)
      );
    }
  } else {
    rows = [...rows].sort((a, b) => b.popularity - a.popularity || b.id - a.id);
    if (cursor) {
      rows = rows.filter((r) => r.popularity < cursor.rank || (r.popularity === cursor.rank && r.id < cursor.id));
    }
  }

  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeCursor({ rank: geo ? Math.round(last.distanceM ?? 0) : last.popularity, id: last.id })
        : null,
  };
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  if (!hasDatabase) return demoRestaurants().find((r) => r.slug === slug) ?? null;
  const rows = await sql(
    `SELECT id, slug, name, category, cuisine, blurb, address, city, region, lat, lng,
            price_band, offer_kind, offer_value, offer_terms, avg_save_cents,
            rating, popularity, NULL::double precision AS distance_m
       FROM restaurants WHERE slug = $1 AND is_active LIMIT 1`,
    [slug]
  );
  return rows[0] ? rowToRestaurant(rows[0]) : null;
}

/**
 * City facets. This is the query most likely to become a full scan as the
 * catalogue grows, so in production it is served from a refreshed materialised
 * view rather than aggregated live — and the route that calls it caches for an
 * hour on top of that.
 */
export async function listCities(): Promise<Array<{ city: string; region: string; count: number }>> {
  if (!hasDatabase) return demoCities();
  const rows = await sql<{ city: string; region: string; count: string }>(
    `SELECT city, region, count(*)::text AS count
       FROM restaurants WHERE is_active
      GROUP BY city, region ORDER BY count(*) DESC LIMIT 60`
  );
  return rows.map((r) => ({ city: r.city, region: r.region, count: Number(r.count) }));
}

/** Count of active partners per YDC category — drives the category grid badges. */
export async function categoryCounts(): Promise<Record<string, number>> {
  if (!hasDatabase) {
    const out: Record<string, number> = {};
    for (const r of demoRestaurants()) out[r.category] = (out[r.category] ?? 0) + 1;
    return out;
  }
  const rows = await sql<{ category: string; count: string }>(
    `SELECT category, count(*)::text AS count FROM restaurants WHERE is_active GROUP BY category`
  );
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.count)]));
}

export async function listCuisines(): Promise<string[]> {
  if (!hasDatabase) return [...new Set(demoRestaurants().map((r) => r.cuisine))].sort();
  const rows = await sql<{ cuisine: string }>(
    `SELECT cuisine FROM restaurants WHERE is_active GROUP BY cuisine ORDER BY cuisine`
  );
  return rows.map((r) => r.cuisine);
}

export async function catalogueSize(): Promise<number> {
  if (!hasDatabase) return demoRestaurants().length;
  // reltuples is an estimate maintained by ANALYZE. An exact count(*) on a large
  // table is a full scan, and nobody needs the last digit of a headline stat.
  const rows = await sql<{ estimate: string }>(
    `SELECT reltuples::bigint::text AS estimate FROM pg_class WHERE relname = 'restaurants'`
  );
  return Number(rows[0]?.estimate ?? 0);
}
