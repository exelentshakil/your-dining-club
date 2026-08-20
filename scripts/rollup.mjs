#!/usr/bin/env node
/**
 * Rollup job — run every few minutes from cron / a scheduled worker.
 *
 * Folds yesterday's and today's redemption partitions into the member and
 * restaurant stat tables. This is why the account page can show lifetime savings
 * without touching a single redemption row, and why a restaurant that suddenly
 * goes viral does not serialise every write behind one counter.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const windowDays = Number(process.env.ROLLUP_DAYS ?? 2);

const memberRows = await client.query(
  `INSERT INTO member_month_stats (member_id, month, redemptions, saved_cents)
   SELECT member_id, date_trunc('month', redeem_day)::date, count(*), sum(saved_cents)
     FROM redemptions
    WHERE redeem_day >= (now() AT TIME ZONE 'UTC')::date - $1::integer
    GROUP BY 1, 2
   ON CONFLICT (member_id, month) DO UPDATE
     SET redemptions = EXCLUDED.redemptions, saved_cents = EXCLUDED.saved_cents`,
  [windowDays]
);

const venueRows = await client.query(
  `INSERT INTO restaurant_day_stats (restaurant_id, day, redemptions, saved_cents)
   SELECT restaurant_id, redeem_day, count(*), sum(saved_cents)
     FROM redemptions
    WHERE redeem_day >= (now() AT TIME ZONE 'UTC')::date - $1::integer
    GROUP BY 1, 2
   ON CONFLICT (restaurant_id, day) DO UPDATE
     SET redemptions = EXCLUDED.redemptions, saved_cents = EXCLUDED.saved_cents`,
  [windowDays]
);

// Popularity drives the default browse sort, so it is refreshed from a 90-day
// trailing window rather than incremented live on every redemption.
const pop = await client.query(
  `UPDATE restaurants r
      SET popularity = coalesce(s.total, 0)
     FROM (SELECT restaurant_id, sum(redemptions)::integer AS total
             FROM restaurant_day_stats
            WHERE day >= (now() AT TIME ZONE 'UTC')::date - 90
            GROUP BY restaurant_id) s
    WHERE s.restaurant_id = r.id AND r.popularity IS DISTINCT FROM coalesce(s.total, 0)`
);

await client.end();
console.log(
  `rollup: members=${memberRows.rowCount} venues=${venueRows.rowCount} popularity=${pop.rowCount}`
);
