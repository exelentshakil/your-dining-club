import { randomUUID } from "node:crypto";
import { sql } from "../db";
import { hasDatabase } from "../env";
import { REFERRAL } from "../business-model";
import { newReferralCode } from "../referral";
import type { Entitlement } from "../session";

export type MemberRecord = {
  id: string;
  email: string;
  name: string | null;
  entitlement: Entitlement;
  entitlementVer: number;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  /** This member's own code, for inviting friends. */
  referralCode: string;
  /** The business whose partnership number this member signed up under. */
  partnerCode: string | null;
};

export type SignupAttribution = {
  /** Referral code of the member who invited them. */
  referredByCode?: string | null;
  /** Business partnership number, which earns revenue share. */
  partnerCode?: string | null;
};

type DemoMembers = Map<string, MemberRecord>;
const g = globalThis as unknown as { ydcMembers?: DemoMembers };
function demoMembers(): DemoMembers {
  return (g.ydcMembers ??= new Map());
}

/**
 * Sign-in / sign-up in one call. The email unique constraint does the work, so
 * two simultaneous joins from the same address cannot create two members.
 */
export async function upsertMember(
  email: string,
  name?: string | null,
  attribution: SignupAttribution = {}
): Promise<MemberRecord> {
  const normalised = email.trim().toLowerCase();

  if (!hasDatabase) {
    const existing = demoMembers().get(normalised);
    if (existing) {
      if (name && !existing.name) existing.name = name;
      return existing;
    }
    const created: MemberRecord = {
      id: randomUUID(),
      email: normalised,
      name: name ?? null,
      entitlement: "none",
      entitlementVer: 1,
      currentPeriodEnd: null,
      stripeCustomerId: null,
      referralCode: newReferralCode(),
      partnerCode: attribution.partnerCode ?? null,
    };
    demoMembers().set(normalised, created);

    // Attribution only counts on first signup, so a member cannot be re-credited
    // by revisiting someone else's link later.
    if (attribution.referredByCode) {
      const referrer = [...demoMembers().values()].find(
        (m) => m.referralCode === attribution.referredByCode && m.id !== created.id
      );
      if (referrer) {
        demoReferrals().push({
          referrerId: referrer.id,
          referredId: created.id,
          qualifiesAt: new Date(Date.now() + REFERRAL.qualifyingDays * 86_400_000).toISOString(),
          status: "pending",
        });
      }
    }
    return created;
  }

  const rows = await sql<any>(
    `WITH upsert AS (
       INSERT INTO members (email, full_name, referral_code, partner_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         full_name = coalesce(members.full_name, EXCLUDED.full_name)
       RETURNING id, email, full_name, entitlement_ver, referral_code, partner_code,
                 (xmax = 0) AS is_new
     )
     SELECT u.*, m.status, m.current_period_end, m.stripe_customer_id
       FROM upsert u LEFT JOIN memberships m ON m.member_id = u.id`,
    [normalised, name ?? null, newReferralCode(), attribution.partnerCode ?? null]
  );

  const member = rowToMember(rows[0]);

  // xmax = 0 distinguishes an INSERT from an ON CONFLICT UPDATE, so attribution
  // is recorded once at true signup and never re-credited on a later sign-in.
  if (rows[0]?.is_new && attribution.referredByCode) {
    await sql(
      `INSERT INTO referrals (referrer_id, referred_id, qualifies_at)
       SELECT r.id, $2, now() + ($3 || ' days')::interval
         FROM members r
        WHERE r.referral_code = $1 AND r.id <> $2
       ON CONFLICT (referred_id) DO NOTHING`,
      [attribution.referredByCode, member.id, String(REFERRAL.qualifyingDays)]
    );
  }

  return member;
}

/* Demo-mode referral ledger. */
type DemoReferral = {
  referrerId: string;
  referredId: string;
  qualifiesAt: string;
  status: "pending" | "qualified" | "granted" | "void";
};
const gr = globalThis as unknown as { ydcReferrals?: DemoReferral[] };
function demoReferrals(): DemoReferral[] {
  return (gr.ydcReferrals ??= []);
}

export type ReferralSummary = {
  code: string;
  pending: number;
  qualified: number;
  monthsEarned: number;
};

/** What the account page shows about a member's invitations. */
export async function referralSummary(memberId: string, code: string): Promise<ReferralSummary> {
  if (!hasDatabase) {
    const mine = demoReferrals().filter((r) => r.referrerId === memberId);
    const qualified = mine.filter((r) => r.status === "qualified" || r.status === "granted").length;
    return {
      code,
      pending: mine.filter((r) => r.status === "pending").length,
      qualified,
      monthsEarned: qualified * REFERRAL.rewardMonths,
    };
  }

  const rows = await sql<{ pending: string; qualified: string }>(
    `SELECT count(*) FILTER (WHERE status = 'pending')::text AS pending,
            count(*) FILTER (WHERE status IN ('qualified','granted'))::text AS qualified
       FROM referrals WHERE referrer_id = $1`,
    [memberId]
  );
  const qualified = Number(rows[0]?.qualified ?? 0);
  return {
    code,
    pending: Number(rows[0]?.pending ?? 0),
    qualified,
    monthsEarned: qualified * REFERRAL.rewardMonths,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToMember(row: any): MemberRecord {
  return {
    id: String(row.id),
    email: row.email,
    name: row.full_name ?? null,
    entitlement: (row.status as Entitlement) ?? "none",
    entitlementVer: Number(row.entitlement_ver ?? 1),
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end).toISOString() : null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    referralCode: row.referral_code ?? "",
    partnerCode: row.partner_code ?? null,
  };
}

export async function getMemberById(id: string): Promise<MemberRecord | null> {
  if (!hasDatabase) {
    for (const m of demoMembers().values()) if (m.id === id) return m;
    return null;
  }
  const rows = await sql<any>(
    `SELECT m.id, m.email, m.full_name, m.entitlement_ver, m.referral_code, m.partner_code,
            s.status, s.current_period_end, s.stripe_customer_id
       FROM members m LEFT JOIN memberships s ON s.member_id = m.id
      WHERE m.id = $1`,
    [id]
  );
  return rows[0] ? rowToMember(rows[0]) : null;
}

/**
 * Applied from the Stripe webhook. Bumping entitlement_ver is what makes every
 * already-issued session cookie for this member re-check itself exactly once.
 */
export async function applyMembership(args: {
  memberId: string;
  status: Entitlement;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  if (!hasDatabase) {
    for (const m of demoMembers().values()) {
      if (m.id === args.memberId) {
        m.entitlement = args.status;
        m.entitlementVer += 1;
        m.currentPeriodEnd = args.currentPeriodEnd?.toISOString() ?? m.currentPeriodEnd;
        m.stripeCustomerId = args.stripeCustomerId ?? m.stripeCustomerId;
      }
    }
    return;
  }

  await sql(
    `INSERT INTO memberships (member_id, status, stripe_customer_id, stripe_subscription_id,
                              current_period_end, cancel_at_period_end, updated_at)
     VALUES ($1, $2::membership_status, $3, $4, $5, coalesce($6, false), now())
     ON CONFLICT (member_id) DO UPDATE SET
       status = EXCLUDED.status,
       stripe_customer_id = coalesce(EXCLUDED.stripe_customer_id, memberships.stripe_customer_id),
       stripe_subscription_id = coalesce(EXCLUDED.stripe_subscription_id, memberships.stripe_subscription_id),
       current_period_end = coalesce(EXCLUDED.current_period_end, memberships.current_period_end),
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       updated_at = now()`,
    [
      args.memberId,
      args.status === "none" ? "canceled" : args.status,
      args.stripeCustomerId ?? null,
      args.stripeSubscriptionId ?? null,
      args.currentPeriodEnd ?? null,
      args.cancelAtPeriodEnd ?? false,
    ]
  );

  await sql(`UPDATE members SET entitlement_ver = entitlement_ver + 1 WHERE id = $1`, [args.memberId]);
}

export async function findMemberByStripeCustomer(customerId: string): Promise<MemberRecord | null> {
  if (!hasDatabase) {
    for (const m of demoMembers().values()) if (m.stripeCustomerId === customerId) return m;
    return null;
  }
  const rows = await sql<any>(
    `SELECT m.id, m.email, m.full_name, m.entitlement_ver, m.referral_code, m.partner_code,
            s.status, s.current_period_end, s.stripe_customer_id
       FROM memberships s JOIN members m ON m.id = s.member_id
      WHERE s.stripe_customer_id = $1`,
    [customerId]
  );
  return rows[0] ? rowToMember(rows[0]) : null;
}

/** Stripe replays webhooks. Returns false when this event was already applied. */
export async function claimStripeEvent(id: string, type: string): Promise<boolean> {
  if (!hasDatabase) {
    const seen = (globalThis as unknown as { ydcEvents?: Set<string> });
    seen.ydcEvents ??= new Set();
    if (seen.ydcEvents.has(id)) return false;
    seen.ydcEvents.add(id);
    return true;
  }
  const rows = await sql(
    `INSERT INTO stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [id, type]
  );
  return rows.length > 0;
}
