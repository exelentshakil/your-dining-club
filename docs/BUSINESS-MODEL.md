# The business model, as implemented

Every number in this document is a constant in `src/lib/business-model.ts`. The
site, the calculators and the investor projections all read from that file, so
there is no figure in the marketing copy that is not also the figure the code uses.

---

## The two sides

**Members** pay **$19.95/month**. In exchange: buy 2 drinks, 1 appetizer and
1 entrée at a partner restaurant, and the 5th menu item — equal or lesser value —
is free. Unlimited use, no blackout dates, one redemption per restaurant per day,
one member per table.

**Businesses** join free and are paid **$7.50–$10.00 per member, per month**, for
every member who signs up under their partnership number, for as long as that
member stays. No cap.

That second sentence is the whole company. Everything below follows from it.

---

## Why the revenue share is the point, not the cost

| Line | Per member / month |
|---|---|
| Membership revenue | **$19.95** |
| Partner revenue share (typical) | −$8.75 |
| Card processing (2.9% + 30¢) | −$0.88 |
| **Contribution margin** | **$10.32 (52%)** |

A conventional subscription business spends money on advertising to acquire a
member and then waits months to earn it back. Here the acquisition cost is a
revenue share:

- **It is paid out of revenue, not ahead of it.** There is no cash outlay before
  the member exists.
- **Payback is zero months.** The member is contribution-positive on their first
  invoice.
- **It self-cancels.** When a member churns, the cost stops the same month the
  revenue does. There is no stranded CAC.
- **It aligns the seller.** The partner is not paid for a signup, they are paid
  for a *retained* member. Their incentive is the same as ours.

At 4.5% monthly churn the average member stays ~22 months, so LTV is roughly
**$229** on an effective acquisition cost of zero cash.

---

## Why businesses actually sell for us

Three mechanisms, in the order they bite:

1. **Category exclusivity.** Only 3 businesses per category are admitted per
   market. Every member a partner enrolls is a member their direct competitor
   cannot have. Scarcity turns a listing into a salesforce.
   *(`MAX_PARTNERS_PER_CATEGORY_PER_MARKET`, enforced in `src/lib/data/partners.ts`.)*
2. **The discount costs less than it looks.** A free fifth item is priced at food
   cost, not menu price, and it arrives attached to a paying table of four. Set
   against revenue share, effective redemption cost trends to zero — the
   calculator on `/partners` shows exactly where a given business crosses over.
3. **The income compounds.** Enrolling 25 members a month for a year means 300
   members paying that partner $2,625 every month. That is not a discount
   programme, it is a second revenue line.

---

## Why members stay

- **The offer rewards frequency, not deal-hunting.** A coupon book is spent; this
  is used. Habit is what suppresses churn.
- **Break-even is one visit.** At a $30 entrée the membership pays for itself the
  first time it is used in a month. Everything after is surplus.
- **Referrals make it free.** Every friend who joins and stays 75 days earns a
  free month, uncapped. Twelve retained referrals is a free year — which turns
  the member base into a second, zero-cost acquisition channel on top of partners.
- **40 categories, not 8.** Once restaurants saturate a member's routine, the
  other 32 business categories keep the membership earning its keep.

---

## The market unit

A market is a template, not a negotiation:

```
40 categories × 3 partners = 120 sellable partner slots per market
```

Same categories, same price, same playbook in every city. Expansion is therefore
a hiring and operations problem rather than a product problem — the part of this
business that converts capital into growth linearly. `/investors` runs that
arithmetic month by month against adjustable assumptions.

---

## What the flywheel looks like

1. Partner joins free, holding category exclusivity in their market.
2. Partner enrols members to earn recurring revenue share.
3. Members redeem, giving the partner full-price tables they would not have had.
4. Members refer members, earning free months — growth at no cost.
5. The network densifies: the membership is worth more, churn falls, partner
   income rises, and the next partner is easier to sign.

Each turn lowers the cost of the next one.

---

## Where the model is fragile

Stated plainly, because an investor will find these anyway:

- **Partner enrolment rate is the whole model.** `membersPerPartnerPerMonth` is
  the single most sensitive input in the projection. If partners will not sell,
  nothing else in this document matters. It is the first thing to prove in market one.
- **Churn and the referral programme fight each other.** Free months granted for
  referrals suppress revenue in the month they are redeemed. The model above
  counts referral growth as free; it is not — it is deferred revenue.
- **Category exclusivity caps a market.** 120 slots is a ceiling on partner count
  and therefore on organic enrolment capacity per city. Growth past that requires
  new markets, not deeper penetration.
- **Revenue share is a floor on price.** At $19.95 with $8.75 out, there is little
  room to discount the membership without breaking partner economics.
- **`redeem_day` is UTC.** "One per day" means a UTC day. International expansion
  needs a time zone policy before it needs anything else.
