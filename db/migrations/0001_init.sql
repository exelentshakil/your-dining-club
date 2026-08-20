-- =============================================================================
-- Your Dining Club — core schema, sized for 1,000,000 paying members.
--
-- Scale assumptions this schema is built against (see docs/ARCHITECTURE.md):
--   1,000,000 members  ·  ~80,000 restaurants  ·  ~2 redemptions/member/month
--   => ~2,000,000 redemption rows per month, ~24M/year.
--
-- Design rules applied throughout:
--   * No unbounded table scans on any user-facing path.
--   * No OFFSET pagination — every list endpoint is keyset-paginated.
--   * Redemptions are range-partitioned by day-bucket so the hot partition
--     stays small and old months can be detached/archived in O(1).
--   * Uniqueness (not SELECT-then-INSERT) enforces the "one redemption per
--     venue per day" rule, so concurrent taps can never double-spend.
--   * Counters live in rollup tables, never as UPDATEs on a shared hot row.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy name search
CREATE EXTENSION IF NOT EXISTS cube;       -- required by earthdistance
CREATE EXTENSION IF NOT EXISTS earthdistance; -- radius search without PostGIS

-- -----------------------------------------------------------------------------
-- Members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext NOT NULL,
  full_name       text,
  home_city       text,
  home_lat        double precision,
  home_lng        double precision,
  -- Bumped whenever entitlement changes. The session cookie carries this value,
  -- so an entitlement check is a string compare, not a database round-trip.
  entitlement_ver integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT members_email_key UNIQUE (email)
);

-- -----------------------------------------------------------------------------
-- Memberships (Stripe is the source of truth; this is the local read replica)
-- -----------------------------------------------------------------------------
CREATE TYPE membership_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete'
);

CREATE TABLE IF NOT EXISTS memberships (
  member_id            uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  stripe_customer_id   text,
  stripe_subscription_id text,
  status               membership_status NOT NULL DEFAULT 'incomplete',
  price_cents          integer NOT NULL DEFAULT 1995,
  current_period_end   timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS memberships_stripe_customer_idx
  ON memberships (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS memberships_stripe_subscription_idx
  ON memberships (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
-- Dunning sweep: "who lapsed today" must not scan 1M rows.
CREATE INDEX IF NOT EXISTS memberships_renewal_idx
  ON memberships (current_period_end) WHERE status IN ('active', 'trialing', 'past_due');

-- -----------------------------------------------------------------------------
-- Restaurants
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
  id            bigserial PRIMARY KEY,
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  cuisine       text NOT NULL,
  blurb         text,
  address       text,
  city          text NOT NULL,
  region        text NOT NULL,
  postal_code   text,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  price_band    smallint NOT NULL DEFAULT 2 CHECK (price_band BETWEEN 1 AND 4),
  offer_kind    text NOT NULL DEFAULT 'bogo',          -- bogo | percent | fixed
  offer_value   integer NOT NULL DEFAULT 0,            -- percent points, or cents
  offer_terms   text,
  avg_save_cents integer NOT NULL DEFAULT 2400,
  photo_url     text,
  rating        numeric(2,1) NOT NULL DEFAULT 4.5,
  -- Denormalised popularity, refreshed from the rollup job. Drives default sort
  -- so the common "browse my city" query is a single index range scan.
  popularity    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Full-text search vector, maintained by the database rather than the app.
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS search_vec tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(cuisine, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS restaurants_search_idx  ON restaurants USING gin (search_vec);
CREATE INDEX IF NOT EXISTS restaurants_name_trgm_idx ON restaurants USING gin (name gin_trgm_ops);
-- Radius search: bounding-box probe on an earth-point GiST index.
CREATE INDEX IF NOT EXISTS restaurants_geo_idx
  ON restaurants USING gist (ll_to_earth(lat, lng)) WHERE is_active;
-- Default browse: (city, popularity DESC, id DESC) matches the keyset cursor
-- exactly, so page 1 and page 500 cost the same.
CREATE INDEX IF NOT EXISTS restaurants_city_rank_idx
  ON restaurants (city, popularity DESC, id DESC) WHERE is_active;
CREATE INDEX IF NOT EXISTS restaurants_cuisine_rank_idx
  ON restaurants (cuisine, popularity DESC, id DESC) WHERE is_active;

-- -----------------------------------------------------------------------------
-- Redemptions — partitioned by day-bucket, monthly ranges.
--
-- redeem_day is the partition key *and* part of the uniqueness rule, which is
-- what makes "one redemption per member per venue per day" enforceable inside a
-- partitioned table (Postgres requires the partition key in every unique index).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS redemptions (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  redeem_day      date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  member_id       uuid NOT NULL,
  restaurant_id   bigint NOT NULL,
  code            text NOT NULL,
  party_size      smallint NOT NULL DEFAULT 2 CHECK (party_size BETWEEN 1 AND 12),
  saved_cents     integer NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, redeem_day)
) PARTITION BY RANGE (redeem_day);

-- The business rule, enforced by the storage engine: two concurrent taps race to
-- the same unique key and exactly one wins. No advisory locks, no read-modify-write.
CREATE UNIQUE INDEX IF NOT EXISTS redemptions_once_per_venue_per_day
  ON redemptions (member_id, restaurant_id, redeem_day);
-- Client retries (flaky signal at the table) collapse onto the same row.
CREATE UNIQUE INDEX IF NOT EXISTS redemptions_idempotency
  ON redemptions (idempotency_key, redeem_day);
-- "My redemption history", newest first — keyset paginated.
CREATE INDEX IF NOT EXISTS redemptions_member_recent
  ON redemptions (member_id, redeem_day DESC, created_at DESC);
-- Restaurant-side settlement reporting.
CREATE INDEX IF NOT EXISTS redemptions_restaurant_day
  ON redemptions (restaurant_id, redeem_day DESC);

-- Creates the partition covering a given month, idempotently. Called by
-- scripts/migrate.mjs at deploy time and by a monthly cron in production.
CREATE OR REPLACE FUNCTION ensure_redemption_partition(p_month date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  start_day date := date_trunc('month', p_month)::date;
  end_day   date := (date_trunc('month', p_month) + interval '1 month')::date;
  part_name text := format('redemptions_%s', to_char(start_day, 'YYYY_MM'));
BEGIN
  IF to_regclass(part_name) IS NULL THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF redemptions FOR VALUES FROM (%L) TO (%L)',
      part_name, start_day, end_day
    );
  END IF;
END;
$$;

-- Catch-all so a clock skew or a missed cron never rejects a write.
CREATE TABLE IF NOT EXISTS redemptions_default PARTITION OF redemptions DEFAULT;

-- -----------------------------------------------------------------------------
-- Rollups — read-optimised aggregates. Written by a batch job, never on the
-- request path, so a viral restaurant cannot serialise every write behind one row.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_month_stats (
  member_id     uuid NOT NULL,
  month         date NOT NULL,
  redemptions   integer NOT NULL DEFAULT 0,
  saved_cents   bigint  NOT NULL DEFAULT 0,
  PRIMARY KEY (member_id, month)
);

CREATE TABLE IF NOT EXISTS restaurant_day_stats (
  restaurant_id bigint NOT NULL,
  day           date NOT NULL,
  redemptions   integer NOT NULL DEFAULT 0,
  saved_cents   bigint  NOT NULL DEFAULT 0,
  PRIMARY KEY (restaurant_id, day)
);

-- -----------------------------------------------------------------------------
-- Stripe webhook idempotency. Stripe retries; the ledger makes replays free.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_events (
  id           text PRIMARY KEY,
  type         text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Rate limiting. UNLOGGED: this data is worthless after a crash and skipping WAL
-- keeps the limiter from becoming the bottleneck it is supposed to prevent.
-- Production swaps this for Redis via the same interface (src/lib/rate-limit.ts).
-- -----------------------------------------------------------------------------
CREATE UNLOGGED TABLE IF NOT EXISTS rate_limits (
  bucket       text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  hits         integer NOT NULL
);
