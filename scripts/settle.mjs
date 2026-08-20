#!/usr/bin/env node
/**
 * Nightly settlement.
 *
 *   1. Qualifies referrals whose waiting period has elapsed.
 *   2. Accrues the monthly revenue share owed to each business partner.
 *
 * Both steps are idempotent, because the thing that must never happen is paying
 * a partner twice for the same month or granting a free month twice for the same
 * referral. Re-running this job on the same day is a no-op.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const REV_SHARE_CENTS = Number(process.env.REV_SHARE_CENTS ?? 875);

const client = new pg.Client({ connectionString: url });
await client.connect();

// 1. Referrals that have served their time and whose referred member is still
//    paying. A member who churned before qualifying voids the reward.
const qualified = await client.query(
  `UPDATE referrals r
      SET status = 'qualified'
    FROM memberships m
   WHERE r.referred_id = m.member_id
     AND r.status = 'pending'
     AND r.qualifies_at <= now()
     AND m.status IN ('active', 'trialing')
   RETURNING r.id`
);

const voided = await client.query(
  `UPDATE referrals r
      SET status = 'void'
    FROM memberships m
   WHERE r.referred_id = m.member_id
     AND r.status = 'pending'
     AND r.qualifies_at <= now()
     AND m.status NOT IN ('active', 'trialing')
   RETURNING r.id`
);

// 2. This month's partner accrual. One row per partner per month; recomputing
//    the same month overwrites rather than adds, so the job is safe to re-run.
const payouts = await client.query(
  `INSERT INTO partner_payouts (partner_code, month, active_members, amount_cents)
   SELECT m.partner_code,
          date_trunc('month', now())::date,
          count(*),
          count(*) * $1::bigint
     FROM members m
     JOIN memberships s ON s.member_id = m.id
    WHERE m.partner_code IS NOT NULL
      AND s.status IN ('active', 'trialing')
    GROUP BY m.partner_code
   ON CONFLICT (partner_code, month) DO UPDATE
     SET active_members = EXCLUDED.active_members,
         amount_cents = EXCLUDED.amount_cents
   WHERE partner_payouts.status = 'accrued'`,
  [REV_SHARE_CENTS]
);

await client.end();
console.log(
  `settle: referrals qualified=${qualified.rowCount} voided=${voided.rowCount} · partner accruals=${payouts.rowCount}`
);
