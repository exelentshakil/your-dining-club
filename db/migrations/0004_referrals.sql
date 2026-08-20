-- Referral and partner attribution.
--
-- Two different attributions ride on a single signup and they must not be
-- conflated: `referrer_member_id` is the friend who earns a free month, and
-- `partner_code` is the business that earns revenue share every month. A signup
-- can carry either, both, or neither.

ALTER TABLE members ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES members(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS partner_code text;

CREATE UNIQUE INDEX IF NOT EXISTS members_referral_code_idx
  ON members (referral_code) WHERE referral_code IS NOT NULL;
-- "Who did this member bring in" — the account page reads this on every load.
CREATE INDEX IF NOT EXISTS members_referred_by_idx
  ON members (referred_by) WHERE referred_by IS NOT NULL;
-- Partner revenue-share settlement runs off this.
CREATE INDEX IF NOT EXISTS members_partner_code_idx
  ON members (partner_code) WHERE partner_code IS NOT NULL;

/**
 * A referral becomes payable once the referred member has stayed the qualifying
 * period. The row is created at signup and settled by a batch job, so the
 * qualification clock is data rather than a scheduled timer that can be lost.
 */
CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  referred_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  qualifies_at    timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'qualified', 'granted', 'void')),
  granted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- A member can only ever be referred once.
  CONSTRAINT referrals_referred_once UNIQUE (referred_id)
);

-- The settlement sweep: "which pending referrals have come due".
CREATE INDEX IF NOT EXISTS referrals_due_idx
  ON referrals (qualifies_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS referrals_by_referrer_idx
  ON referrals (referrer_id, created_at DESC);

/**
 * Monthly revenue share owed to each business partner. One row per partner per
 * month, built by the settlement job from the members carrying that partner code.
 */
CREATE TABLE IF NOT EXISTS partner_payouts (
  partner_code    text NOT NULL,
  month           date NOT NULL,
  active_members  integer NOT NULL DEFAULT 0,
  amount_cents    bigint NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'accrued'
                  CHECK (status IN ('accrued', 'paid')),
  paid_at         timestamptz,
  PRIMARY KEY (partner_code, month)
);
