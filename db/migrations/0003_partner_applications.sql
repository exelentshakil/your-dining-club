-- Business partnership applications.
--
-- Volume here is low (hundreds per market, not millions), so this table is
-- optimised for the operator reading it rather than for write throughput: the
-- whole submission is kept as jsonb alongside the few columns the pipeline
-- actually filters on.
CREATE TABLE IF NOT EXISTS partner_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   text NOT NULL,
  business_type   text NOT NULL,
  category_slug   text,
  contact_email   citext NOT NULL,
  contact_phone   text,
  city            text NOT NULL,
  region          text NOT NULL,
  postal_code     text,
  locations       integer,
  avg_ticket_cents integer,
  status          text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'reviewing', 'approved', 'declined')),
  payload         jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- The operator queue: newest first, filtered by status.
CREATE INDEX IF NOT EXISTS partner_apps_queue_idx
  ON partner_applications (status, created_at DESC);

-- Category exclusivity is the product's scarcity mechanic, so "how many partners
-- already hold this category in this market" has to be a fast, exact answer.
CREATE INDEX IF NOT EXISTS partner_apps_market_category_idx
  ON partner_applications (region, city, category_slug)
  WHERE status IN ('approved', 'reviewing');

-- One live application per business email; a resubmission updates rather than
-- creating a duplicate for the sales team to chase twice.
CREATE UNIQUE INDEX IF NOT EXISTS partner_apps_email_open_idx
  ON partner_applications (contact_email)
  WHERE status IN ('new', 'reviewing');
