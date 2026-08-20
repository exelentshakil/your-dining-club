import {
  MEMBERSHIP_PRICE_CENTS,
  REV_SHARE_CENTS,
  MAX_PARTNERS_PER_CATEGORY_PER_MARKET,
  processingCostCents,
} from "./business-model";
import { ALL_CATEGORIES } from "@/data/categories";

/**
 * The growth model.
 *
 * The whole thesis is that partners — not paid media — acquire the members, and
 * that partners are capacity-constrained by category exclusivity. So the model
 * runs in that order: markets open, partners fill the category slots in each
 * market, and each active partner enrolls members every month. Nothing here is a
 * curve fitted to a target; it is the mechanics multiplied out.
 */

export type Assumptions = {
  /** Markets already operating at month zero. */
  startingMarkets: number;
  /** New markets opened per month. */
  marketsPerMonth: number;
  /** Share of the available category slots that actually get sold in a market. */
  partnerFillRate: number;
  /** Members each active partner enrolls per month. */
  membersPerPartnerPerMonth: number;
  /** Monthly member churn. */
  monthlyChurn: number;
  /** Months a new market takes to reach its full partner count. */
  marketRampMonths: number;
  /** Fixed operating cost per active market per month, in cents. */
  marketOpexCents: number;
  /** Platform-wide fixed cost per month, in cents. */
  platformOpexCents: number;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  startingMarkets: 1,
  marketsPerMonth: 2,
  partnerFillRate: 0.55,
  membersPerPartnerPerMonth: 9,
  monthlyChurn: 0.045,
  marketRampMonths: 6,
  marketOpexCents: 1_800_000, // $18k per market per month
  platformOpexCents: 12_000_000, // $120k per month
};

/** Category slots available in one market — the hard ceiling on partners. */
export const SLOTS_PER_MARKET = ALL_CATEGORIES.length * MAX_PARTNERS_PER_CATEGORY_PER_MARKET;

export type MonthPoint = {
  month: number;
  markets: number;
  partners: number;
  members: number;
  newMembers: number;
  churnedMembers: number;
  mrrCents: number;
  revShareCents: number;
  processingCents: number;
  contributionCents: number;
  opexCents: number;
  ebitdaCents: number;
};

export function project(a: Assumptions, months = 36): MonthPoint[] {
  const out: MonthPoint[] = [];
  /** Age of each open market, so ramping partners is per-cohort rather than global. */
  const marketAges: number[] = Array.from({ length: a.startingMarkets }, () => a.marketRampMonths);
  let members = 0;

  for (let m = 1; m <= months; m++) {
    for (let i = 0; i < a.marketsPerMonth; i++) marketAges.push(0);
    for (let i = 0; i < marketAges.length; i++) marketAges[i] += 1;

    // A market's partner count ramps linearly to its filled-slot ceiling.
    const partners = marketAges.reduce((total, age) => {
      const ramp = Math.min(1, age / Math.max(1, a.marketRampMonths));
      return total + SLOTS_PER_MARKET * a.partnerFillRate * ramp;
    }, 0);

    const newMembers = partners * a.membersPerPartnerPerMonth;
    const churnedMembers = members * a.monthlyChurn;
    members = members + newMembers - churnedMembers;

    const mrrCents = members * MEMBERSHIP_PRICE_CENTS;
    const revShareCents = members * REV_SHARE_CENTS.typical;
    const processingCents = members * processingCostCents();
    const contributionCents = mrrCents - revShareCents - processingCents;
    const opexCents = marketAges.length * a.marketOpexCents + a.platformOpexCents;

    out.push({
      month: m,
      markets: marketAges.length,
      partners: Math.round(partners),
      members: Math.round(members),
      newMembers: Math.round(newMembers),
      churnedMembers: Math.round(churnedMembers),
      mrrCents: Math.round(mrrCents),
      revShareCents: Math.round(revShareCents),
      processingCents: Math.round(processingCents),
      contributionCents: Math.round(contributionCents),
      opexCents,
      ebitdaCents: Math.round(contributionCents - opexCents),
    });
  }

  return out;
}

/** First month contribution margin covers operating cost. */
export function breakEvenMonth(points: MonthPoint[]): MonthPoint | null {
  return points.find((p) => p.ebitdaCents >= 0) ?? null;
}

/** Month the member base first crosses a threshold. */
export function monthReaching(points: MonthPoint[], memberTarget: number): MonthPoint | null {
  return points.find((p) => p.members >= memberTarget) ?? null;
}
