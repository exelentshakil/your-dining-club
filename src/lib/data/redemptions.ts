import { randomBytes } from "node:crypto";
import { sql } from "../db";
import { hasDatabase } from "../env";
import { demoRestaurants } from "../demo-data";
import type { Page, Redemption, Restaurant } from "../types";
import { decodeCursor, encodeCursor } from "../cursor";

export type RedeemOutcome =
  | { status: "created"; redemption: Redemption }
  | { status: "replayed"; redemption: Redemption }
  | { status: "already_redeemed"; redemption: Redemption };

function newCode(): string {
  const raw = randomBytes(4).toString("hex").toUpperCase();
  return `YDC-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function savingsFor(r: Restaurant, partySize: number): number {
  if (r.offerKind === "fixed") return r.offerValue;
  if (r.offerKind === "percent") return Math.round((r.avgSaveCents * partySize * r.offerValue) / 100);
  // BOGO saves one main per pair at the table.
  return Math.round(r.avgSaveCents * Math.floor(partySize / 2));
}

/* ---------------------------------------------------------------------------
 * Demo-mode store. Same invariants as the SQL unique indexes, kept in process.
 * ------------------------------------------------------------------------- */
/** Demo rows carry the owner so the in-memory adapter filters exactly like the
 *  `WHERE member_id = $1` the SQL path uses. */
type OwnedRedemption = Redemption & { memberId: string };
type DemoStore = {
  rows: OwnedRedemption[];
  byDayKey: Map<string, OwnedRedemption>;
  byIdem: Map<string, OwnedRedemption>;
};
const g = globalThis as unknown as { ydcRedemptions?: DemoStore };
function store(): DemoStore {
  return (g.ydcRedemptions ??= { rows: [], byDayKey: new Map(), byIdem: new Map() });
}
function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Redeem an offer.
 *
 * The concurrency rule — one redemption per member, per venue, per day — is
 * enforced by a unique index, not by reading first and writing second. Two taps
 * from a flaky phone on a restaurant's wifi both reach the INSERT; one wins the
 * index race and the other comes back as `already_redeemed`. There is no window
 * in which both succeed, and no lock is held across a network round-trip.
 *
 * `idempotencyKey` is separate: it makes an honest client retry return the very
 * same code rather than being told it has already redeemed.
 */
export async function redeem(args: {
  memberId: string;
  restaurant: Restaurant;
  partySize: number;
  idempotencyKey: string;
}): Promise<RedeemOutcome> {
  const { memberId, restaurant, partySize, idempotencyKey } = args;
  const savedCents = savingsFor(restaurant, partySize);

  if (!hasDatabase) {
    const s = store();
    const replay = s.byIdem.get(idempotencyKey);
    if (replay && replay.memberId === memberId) return { status: "replayed", redemption: replay };

    const dayKey = `${memberId}:${restaurant.id}:${utcDay()}`;
    const existing = s.byDayKey.get(dayKey);
    if (existing) return { status: "already_redeemed", redemption: existing };

    const row: OwnedRedemption = {
      memberId,
      id: randomBytes(16).toString("hex"),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      city: restaurant.city,
      code: newCode(),
      partySize,
      savedCents,
      createdAt: new Date().toISOString(),
    };
    s.rows.unshift(row);
    s.byDayKey.set(dayKey, row);
    s.byIdem.set(idempotencyKey, row);
    return { status: "created", redemption: row };
  }

  const inserted = await sql<{ id: string; code: string; created_at: Date }>(
    `INSERT INTO redemptions (member_id, restaurant_id, code, party_size, saved_cents, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING
     RETURNING id, code, created_at`,
    [memberId, restaurant.id, newCode(), partySize, savedCents, idempotencyKey]
  );

  if (inserted[0]) {
    return {
      status: "created",
      redemption: toRedemption(inserted[0], restaurant, partySize, savedCents),
    };
  }

  // Lost the race, or this is a retry. Both land here; the idempotency key tells
  // us which so the member sees the right message.
  const replay = await sql<{ id: string; code: string; created_at: Date }>(
    `SELECT id, code, created_at FROM redemptions
      WHERE idempotency_key = $1 AND redeem_day = (now() AT TIME ZONE 'UTC')::date LIMIT 1`,
    [idempotencyKey]
  );
  if (replay[0]) {
    return { status: "replayed", redemption: toRedemption(replay[0], restaurant, partySize, savedCents) };
  }

  const sameDay = await sql<{ id: string; code: string; created_at: Date; party_size: number; saved_cents: number }>(
    `SELECT id, code, created_at, party_size, saved_cents FROM redemptions
      WHERE member_id = $1 AND restaurant_id = $2
        AND redeem_day = (now() AT TIME ZONE 'UTC')::date LIMIT 1`,
    [memberId, restaurant.id]
  );
  if (sameDay[0]) {
    return {
      status: "already_redeemed",
      redemption: toRedemption(sameDay[0], restaurant, sameDay[0].party_size, sameDay[0].saved_cents),
    };
  }

  throw new Error("redemption failed: conflict with no matching row");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toRedemption(row: any, r: Restaurant, partySize: number, savedCents: number): Redemption {
  return {
    id: String(row.id),
    restaurantId: r.id,
    restaurantName: r.name,
    restaurantSlug: r.slug,
    city: r.city,
    code: row.code,
    partySize,
    savedCents,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** Redemption history, newest first, keyset-paginated on (created_at, id). */
export async function listRedemptions(memberId: string, limit = 20, cursor?: string): Promise<Page<Redemption>> {
  if (!hasDatabase) {
    const rows = store().rows.filter((r) => r.memberId === memberId);
    const start = cursor ? Number(Buffer.from(cursor, "base64url").toString("utf8")) : 0;
    const items = rows.slice(start, start + limit);
    const next = start + limit < rows.length ? Buffer.from(String(start + limit)).toString("base64url") : null;
    return { items, nextCursor: next };
  }

  const key = decodeCursor(cursor);
  const params: unknown[] = [memberId];
  let where = "r.member_id = $1";
  if (key) {
    params.push(new Date(key.rank).toISOString());
    where += ` AND r.created_at < $${params.length}`;
  }
  params.push(limit + 1);

  const rows = await sql<any>(
    `SELECT r.id, r.code, r.party_size, r.saved_cents, r.created_at,
            v.id AS restaurant_id, v.name, v.slug, v.city
       FROM redemptions r
       JOIN restaurants v ON v.id = r.restaurant_id
      WHERE ${where}
      ORDER BY r.created_at DESC
      LIMIT $${params.length}`,
    params
  );

  const items: Redemption[] = rows.slice(0, limit).map((row) => ({
    id: String(row.id),
    restaurantId: Number(row.restaurant_id),
    restaurantName: row.name,
    restaurantSlug: row.slug,
    city: row.city,
    code: row.code,
    partySize: Number(row.party_size),
    savedCents: Number(row.saved_cents),
    createdAt: new Date(row.created_at).toISOString(),
  }));
  const hasMore = rows.length > limit;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor({ rank: new Date(last.createdAt).getTime(), id: 0 }) : null,
  };
}

export async function memberSavings(memberId: string): Promise<{ month: number; monthCents: number; lifetimeCents: number }> {
  if (!hasDatabase) {
    const rows = store().rows.filter((r) => r.memberId === memberId);
    const thisMonth = utcDay().slice(0, 7);
    const inMonth = rows.filter((r) => r.createdAt.slice(0, 7) === thisMonth);
    return {
      month: inMonth.length,
      monthCents: inMonth.reduce((n, r) => n + r.savedCents, 0),
      lifetimeCents: rows.reduce((n, r) => n + r.savedCents, 0),
    };
  }

  // Reads the rollup, not the redemption partitions. Constant cost per member
  // regardless of how long they have been a member.
  const rows = await sql<{ month_count: string; month_cents: string; lifetime_cents: string }>(
    `SELECT
       coalesce(sum(redemptions) FILTER (WHERE month = date_trunc('month', now())::date), 0)::text AS month_count,
       coalesce(sum(saved_cents) FILTER (WHERE month = date_trunc('month', now())::date), 0)::text AS month_cents,
       coalesce(sum(saved_cents), 0)::text AS lifetime_cents
     FROM member_month_stats WHERE member_id = $1`,
    [memberId]
  );
  return {
    month: Number(rows[0]?.month_count ?? 0),
    monthCents: Number(rows[0]?.month_cents ?? 0),
    lifetimeCents: Number(rows[0]?.lifetime_cents ?? 0),
  };
}
