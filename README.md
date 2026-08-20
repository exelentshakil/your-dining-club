# Your Dining Club

A working rebuild of the Your Dining Club membership product — $19.95/month, buy
2 drinks + 1 appetizer + 1 entrée and the 5th menu item is free — architected so
the shape of the system does not change between 10,000 members and 1,000,000.

Brand tokens (Poppins, `#FDB913` amber, `#E5342A` accent, black pill CTAs, 12px
cards) come from yourdiningclub.com and live in `tailwind.config.ts`. The logo in
`public/brand/logo.png` is the real one. All 44 photographs are real images pulled
once from the **Unsplash API**. Photographer attribution is not shown in
the UI at this dev stage — the manifest keeps the credit data, and it belongs
back on the site before a public launch (Unsplash requires it).

## Run it

```bash
npm install
npm run dev
```

It boots with **no configuration**. Without `DATABASE_URL` it serves a
deterministic in-memory catalogue of 2,400 partner restaurants and keeps members,
referrals, redemptions and partner applications in process. Without Stripe keys,
joining activates a membership locally. Every rule works in that mode — including
the redemption race, idempotent retries, referral attribution and category
exclusivity.

## Pages

| Route | What it is |
|---|---|
| `/` | Marketing site: hero, how it works, live savings calculator, FAQ |
| `/restaurants` | The 8 restaurant categories, with live partner counts + location search |
| `/restaurants/browse` | Keyset-paginated partner listing, filterable by category, city, radius |
| `/restaurants/[slug]` | A partner's offer, with the redemption flow |
| `/businesses` | The 32 other business categories |
| `/partners` | Partner benefits, an earnings calculator, and the application form |
| `/investors` | **The data room** — unit economics, the flywheel, an interactive 36-month model |
| `/account` | Membership, savings to date, referral link, redemption history |
| `/scale` | The technical architecture, in plain language |

## Turning on Stripe

Stripe is wired end to end and inert until you add keys. Nothing about your key
passes through a chat window — put it in `.env.local` yourself:

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...
```

Then create the $19.95/month product and price:

```bash
npm run stripe:setup
```

It prints a `STRIPE_PRICE_ID` — paste that into `.env.local`. The script is
idempotent (it finds the price by lookup key), so re-running it never creates a
duplicate. For webhooks locally:

```bash
stripe listen --forward-to localhost:3419/api/stripe/webhook
```

Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`. From that point
`/join` runs real Checkout, the webhook mirrors subscription state locally, and
`/account` can cancel at period end.

## With Postgres

```bash
# .env.local
DATABASE_URL=postgres://user:pass@localhost:5432/yourdiningclub
```

```bash
npm run db:migrate                          # schema + redemption partitions
SEED_RESTAURANTS=80000 npm run db:seed      # catalogue
npm run db:rollup                           # stats rollups (cron: every few minutes)
npm run db:settle                           # referrals + partner payouts (cron: nightly)
```

## Other commands

| Command | What it does |
|---|---|
| `npm run images:fetch` | Fills any missing category photo from the Unsplash API (cached; re-runs cost 0 calls) |
| `npm run loadtest` | Latency harness that walks real keyset cursors |

## The business model

`src/lib/business-model.ts` is the single source of truth: price, revenue-share
band, referral terms, redemption cost, category exclusivity. Every headline,
calculator and projection reads from it, so no marketing claim can drift from the
number the code uses. The reasoning is in **`docs/BUSINESS-MODEL.md`**, including
the four places the model is fragile.

## The scale decisions

Full detail in **`docs/ARCHITECTURE.md`**. In brief:

**Keyset pagination, never OFFSET.** Every list sorts on exactly the column order
of an index and pages with an opaque cursor, so page 500 costs what page 1 costs.

**The redemption rule is a unique index.** `(member_id, restaurant_id, redeem_day)`
plus `INSERT … ON CONFLICT DO NOTHING`. Two concurrent taps race to the index and
exactly one wins — no read-then-write window. A separate idempotency key makes an
honest retry return the same code rather than a rejection.

**Redemptions are partitioned by day-bucket, monthly.** The hot partition stays
small enough to keep its indexes resident; retiring a quarter is a `DETACH`.

**Entitlement rides in the signed cookie.** "Is this person a member" is an HMAC
verify, not a query. A Stripe event bumps `entitlement_ver`, forcing exactly one
refresh.

**Counters are rolled up, never incremented live**, so a restaurant that goes
viral cannot serialise every write behind one hot row.

**No Server Component reads cookies.** One `cookies()` call turns its whole route
dynamic, which would take the highest-traffic pages off the CDN — so the nav and
the redeem panel resolve the viewer client-side from a non-sensitive hint cookie.
`npm run build` is the assertion: `/`, `/investors`, `/businesses` print `○` and
`/restaurants/[slug]` prints `●`.

> **Do not run `npm run build` while `npm run dev` is running.** They share
> `.next`, and the build empties the dev server's CSS chunks. Stop dev first.

## Before this ships

Real gaps, listed rather than hidden:

1. **`/api/auth/start` trusts the email it is given.** It issues a session for any
   address typed into the form. It is a demo stand-in and the only file that needs
   to change — swap it for a magic-link or OTP step; everything downstream already
   reads `getSession()`.
2. **The rate limiter is per-instance.** Correct for one process, not a fleet.
   Point `src/lib/rate-limit.ts` at Redis; the call signature is already right.
3. **Free months are tracked but not yet granted in Stripe.** `scripts/settle.mjs`
   qualifies referrals; issuing the actual credit needs a Stripe coupon or a
   balance transaction on the customer.
4. **Partner payouts are accrued, not paid.** `partner_payouts` accumulates what
   is owed; disbursement (Stripe Connect or ACH) is not built.
5. **No restaurant-side terminal.** Staff read a code off the member's phone;
   confirming redemption from the merchant side needs its own surface and auth.
6. **No test suite.** The redemption race, the cursor walk, referral attribution
   and webhook idempotency are the four things that most deserve one.
