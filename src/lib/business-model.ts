/**
 * Your Dining Club — the economics, in one place.
 *
 * Every number the marketing site, the calculator and the investor dashboard
 * quote is derived from these constants. Nothing is hard-coded into a headline,
 * so changing the rev-share band or the price updates every claim at once.
 *
 * The model in one sentence: members pay a flat monthly fee, and the businesses
 * that recruit those members are paid a monthly share of that fee for as long as
 * the member stays — which makes the partner network the acquisition channel
 * rather than a paid-media budget.
 */

/* ── Member side ─────────────────────────────────────────────────────────── */

export const MEMBERSHIP_PRICE_CENTS = 1_995;

/**
 * The core offer. Buy two drinks, one appetizer and one entrée, and the fifth
 * menu item — of equal or lesser value — is free.
 */
export const OFFER = {
  drinks: 2,
  appetizers: 1,
  entrees: 1,
  freeItems: 1,
  rule: "equal or lesser value",
} as const;

/** One member per table is enough to unlock the offer for the table. */
export const MEMBERS_REQUIRED_PER_TABLE = 1;

/** Party sizes the offer is designed around. */
export const SUPPORTED_PARTY_SIZES = [2, 4, 6] as const;

/** Referrals: every friend who stays this long earns the referrer a free month. */
export const REFERRAL = {
  qualifyingDays: 75,
  rewardMonths: 1,
  cap: null, // uncapped, by design — see docs/BUSINESS-MODEL.md
} as const;

/* ── Business partner side ───────────────────────────────────────────────── */

/**
 * Monthly revenue share paid to the partner whose unique partnership number a
 * member signed up under. Paid every month the member stays, with no cap.
 */
export const REV_SHARE_CENTS = { min: 750, max: 1_000, typical: 875 } as const;

/**
 * What a redemption actually costs a partner, as a share of the check. The
 * bottom of the range is the case where rev-share income offsets it entirely.
 */
export const REDEMPTION_COST = { min: 0.0, typical: 0.12, max: 0.15 } as const;

/** Direct mail included in the partnership. */
export const DIRECT_MAIL = {
  centsPerPiece: 2.99,
  homesPerMonth: 10_000,
  freeMonths: 12,
} as const;

/** Category exclusivity is the scarcity mechanic that makes partners commit. */
export const MAX_PARTNERS_PER_CATEGORY_PER_MARKET = 3;

/* ── Platform ────────────────────────────────────────────────────────────── */

export const LAUNCH_DATE = new Date("2026-07-15T00:00:00Z");

/** Stripe's US card rate, used so margin figures are honest rather than gross. */
export const PROCESSING = { percent: 0.029, fixedCents: 30 } as const;

/* ── Derived economics ───────────────────────────────────────────────────── */

export function processingCostCents(grossCents = MEMBERSHIP_PRICE_CENTS): number {
  return Math.round(grossCents * PROCESSING.percent) + PROCESSING.fixedCents;
}

/**
 * Contribution margin per member per month, after the partner revenue share and
 * card processing. This is the number an investor actually cares about.
 */
export function contributionMarginCents(revShareCents = REV_SHARE_CENTS.typical): number {
  return MEMBERSHIP_PRICE_CENTS - revShareCents - processingCostCents();
}

/**
 * Members acquired through a partner cost nothing up front — the partner is paid
 * out of revenue, monthly, only while the member stays. Payback is therefore
 * immediate and the "CAC" is a margin decision rather than a cash outlay.
 */
export function grossMarginPercent(revShareCents = REV_SHARE_CENTS.typical): number {
  return contributionMarginCents(revShareCents) / MEMBERSHIP_PRICE_CENTS;
}

/** What one member is worth over a given lifetime, in months. */
export function memberLtvCents(lifetimeMonths: number, revShareCents = REV_SHARE_CENTS.typical): number {
  return contributionMarginCents(revShareCents) * lifetimeMonths;
}

/** Average member lifetime implied by a monthly churn rate. */
export function lifetimeMonthsFromChurn(monthlyChurn: number): number {
  return monthlyChurn <= 0 ? Infinity : 1 / monthlyChurn;
}

/* ── Member savings maths ────────────────────────────────────────────────── */

/**
 * A visit saves the value of the free item, which is capped at "equal or lesser
 * value" — so the entrée price is the ceiling. One offer per table per visit.
 */
export function savingsPerVisitCents(avgEntreeCents: number): number {
  return avgEntreeCents;
}

export function monthlySavingsCents(visitsPerWeek: number, avgEntreeCents: number): number {
  // 4 weeks is the conservative month the site quotes; it understates a 4.33-week
  // month on purpose, because an overstated savings claim is a refund request.
  return savingsPerVisitCents(avgEntreeCents) * visitsPerWeek * 4;
}

export function netMonthlyBenefitCents(visitsPerWeek: number, avgEntreeCents: number): number {
  return monthlySavingsCents(visitsPerWeek, avgEntreeCents) - MEMBERSHIP_PRICE_CENTS;
}

/** How many visits a month it takes for the membership to pay for itself. */
export function breakEvenVisits(avgEntreeCents: number): number {
  return MEMBERSHIP_PRICE_CENTS / savingsPerVisitCents(avgEntreeCents);
}
