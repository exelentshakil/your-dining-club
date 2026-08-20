# Architecture — sizing for 1,000,000 members

This document states the load the system is designed for, the arithmetic behind
each decision, and the point at which each decision stops working. Everything
here is implemented in the codebase; nothing is aspirational.

---

## 1. The shape of the load

A dining club looks like a marketplace but behaves like a catalogue. Members
browse constantly and write rarely, and the one write that matters — the
redemption — must be exactly correct under concurrency.

| Metric | Assumption | Derived |
| --- | --- | --- |
| Members | 1,000,000 | — |
| Restaurants | 80,000 | — |
| Redemptions / member / month | 2.1 | **2.1M rows/month**, ~70k/day |
| App opens / member / month | 6 | 6M sessions/month |
| List requests / session | 4 | **24M catalogue reads/month** |

Averages, and then the number that actually sets the sizing:

* Catalogue reads: 24M/month ≈ **9 req/s average**. Dinner-time concentration
  across US time zones puts the peak near **150 req/s**.
* Redemption writes: 2.1M/month ≈ **0.8 writes/s average**. Roughly 30% land in
  the 19:00–21:00 local window, which is smeared across four time zones, giving
  a peak near **15 writes/s**.

**The write path is not the problem.** Fifteen single-row inserts per second is
nothing for Postgres. The two things that actually break at this size are (a)
read amplification against the catalogue, and (b) any operation whose cost grows
with total row count. Every decision below targets one of those.

---

## 2. Storage

| Table | Rows at 1M members | Notes |
| --- | --- | --- |
| `members` | 1,000,000 | ~110 B/row + email unique index → ~250 MB |
| `memberships` | 1,000,000 | ~90 B/row + 3 partial indexes → ~220 MB |
| `restaurants` | 80,000 | Trivial; the tsvector and trigram indexes dominate at ~90 MB |
| `redemptions` | 2.1M / month, ~25M / year | ~120 B/row + 4 indexes ≈ **250 MB/month**, ~3 GB/year |
| `member_month_stats` | 12M / year | Rollup; small and index-only-scannable |

Nothing here is large by database standards. What matters is that the *hot*
working set stays small: the current month's redemption partition (~250 MB
including indexes) fits comfortably in shared buffers, so the write path never
touches disk for index maintenance.

---

## 3. Decisions

### 3.1 Keyset pagination everywhere

`OFFSET n` makes Postgres walk and discard `n` rows. In a city with 8,000
restaurants, page 300 costs 300× page 1 — and the members who scroll deepest are
the engaged ones you least want to punish.

Every list endpoint instead carries an opaque cursor holding the last row's sort
key, and every sort order has an index whose column order matches it exactly:

```
browse:  restaurants (city, popularity DESC, id DESC) WHERE is_active
near me: GiST (ll_to_earth(lat, lng)) WHERE is_active
history: redemptions (member_id, redeem_day DESC, created_at DESC)
```

`LIMIT n + 1` detects "is there another page" without a second `COUNT(*)` —
which would itself be a full scan.

**Breaks when:** a sort key needs to be user-selectable across many dimensions.
Each new sort order needs its own composite index, and index count is a write-path
tax. At around six sort orders it is cheaper to move browse into a search engine.

### 3.2 The redemption rule is a unique index

The business rule — one redemption per member, per venue, per day — is enforced
by the storage engine:

```sql
CREATE UNIQUE INDEX redemptions_once_per_venue_per_day
  ON redemptions (member_id, restaurant_id, redeem_day);
```

and the write is a single statement:

```sql
INSERT INTO redemptions (...) VALUES (...) ON CONFLICT DO NOTHING RETURNING id, code;
```

A `SELECT` followed by an `INSERT` has a window between the two in which a second
request can also see "not yet redeemed". At the table, with a member double-tapping
on bad restaurant wifi, that window is not theoretical. The unique index closes it
without an advisory lock and without holding anything across a network round trip.

`idempotency_key` is a *separate* unique index, and it is what distinguishes the
two cases the member experiences very differently:

| Situation | Result |
| --- | --- |
| Same request retried (dropped response) | `replayed` — the same code comes back |
| Genuinely redeeming twice at one venue today | `already_redeemed` — the original code, with an explanation |

**Breaks when:** the rule stops being expressible as a key — e.g. "three
redemptions per week across any venue". A rolling-window rule needs a counter,
and a counter needs either a row lock or a probabilistic structure.

### 3.3 Redemptions are range-partitioned by day-bucket

Monthly partitions on `redeem_day`. Two consequences:

* The hot partition stays ~250 MB, so its indexes stay resident. Insert cost is
  flat over years of operation rather than degrading as the table grows.
* Retiring old data is `ALTER TABLE … DETACH PARTITION` — instant — instead of a
  `DELETE` that leaves 25M dead tuples for autovacuum to chase.

`redeem_day` is the partition key *and* part of the uniqueness rule, which is what
makes the constraint in §3.2 legal: Postgres requires the partition key in every
unique index on a partitioned table. Deriving the day from a `date` column rather
than from `created_at` is precisely what makes both properties hold at once.

`ensure_redemption_partition()` is called at deploy time for the next four months
and there is a `DEFAULT` partition as a backstop, so a missed cron degrades
performance rather than rejecting writes.

**Breaks when:** monthly partitions exceed a few GB — at ~10× the current volume,
switch to weekly.

### 3.4 Entitlement rides in the session cookie

The most frequent question in the system is "is this person a member?". Answering
it from the database means one query per request, per member — at peak, that is
more traffic than everything else combined, and all of it to return the same
answer.

The session is a signed cookie (HMAC-SHA256) carrying `ent` (status) and `ev`
(entitlement version). Checking membership is a signature verify: no I/O.

Invalidation is the hard half, and it is handled without a session table: a Stripe
event bumps `members.entitlement_ver`. The next time a page compares the cookie's
`ev` against the member row, the mismatch triggers exactly one refresh
(`/api/auth/refresh`). The comparison happens on `/account`, which is where a
billing change is visible anyway.

**Trade-off, stated plainly:** between a Stripe event and that refresh, the cookie
is stale — a just-cancelled member can redeem for the remainder of the window.
For a subscription that was already paid through period end, that is the correct
business outcome. For a *fraud* cancellation it is not, which is why the window is
bounded by the 30-day cookie lifetime and why the redemption path can be
tightened to a live check if abuse ever justifies the cost.

### 3.5 Counters are rolled up, never incremented live

`UPDATE restaurants SET popularity = popularity + 1` on every redemption puts
every write to a popular restaurant in a queue behind one row lock. On a Friday
night at the city's busiest venue, that is the whole system's throughput limit.

Instead `scripts/rollup.mjs` folds recent partitions into `member_month_stats` and
`restaurant_day_stats` and refreshes `restaurants.popularity` from a 90-day window.
Aggregates are therefore minutes stale — correct for "saved this month", and
irrelevant for a popularity sort.

### 3.6 Cache boundaries follow the personalisation boundary

| Response | Treatment | Why |
| --- | --- | --- |
| `/api/restaurants` | `public, s-maxage=60, stale-while-revalidate=600` | Identical for everyone |
| `/`, `/scale` | Statically prerendered, `revalidate = 3600` | Changes rarely |
| `/restaurants/[slug]` | Top 48 prerendered, rest ISR at `revalidate = 300` | Restaurant traffic is heavily skewed; the head absorbs most of it without an 80,000-page build |
| Restaurant record | `unstable_cache`, 300s, tag `restaurants` | Data is shared even where a page is not |
| `/account`, `/join`, `/restaurants` | Dynamic | Genuinely per-viewer or per-query |
| Anything with a code | `no-store` | Personal and single-use |

Getting the marketing and restaurant pages *actually* static took one structural
decision: **no Server Component reads cookies.** A single `cookies()` call opts
its entire route out of static rendering, so the personalised parts of the nav
and the redeem panel resolve on the client from a non-sensitive hint cookie
(`ydc_member`). The hint decides only which UI to draw — `/api/redeem` verifies
the signed session itself and answers 401/402 no matter what the client believed.
`npm run build` is the check: `/` and `/scale` must print `○`, and
`/restaurants/[slug]` must print `●`. If one of them turns into `ƒ`, a cookie
read leaked into a server render.

At a 90% CDN hit rate the 150 req/s peak arrives at the origin as ~15 req/s. This
single boundary is what keeps origin load roughly flat as membership grows.

### 3.7 Connection management

Postgres tops out in the low hundreds of backends. Forty app instances × `max: 8`
= 320 client connections, multiplexed by a transaction-mode pooler (PgBouncer or
Supavisor) onto ~40 server backends. `DATABASE_URL` in production points at the
pooler, not at 5432.

`statement_timeout` and `query_timeout` are both 3s. Nothing on a user-facing path
should run longer, and a query that does should fail fast rather than occupy a
connection while the queue behind it grows.

### 3.8 Stripe webhooks are idempotent by construction

At 1M subscriptions, renewals generate a monthly burst of events, and Stripe
retries anything that is not a 2xx. Every event id is claimed in `stripe_events`
before it is applied:

```sql
INSERT INTO stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id;
```

No row returned means it is a replay; the handler exits. Unhandled event types are
acknowledged rather than rejected — returning non-2xx for an event you simply do
not care about is how a healthy endpoint gets put into exponential backoff.

---

## 4. Failure modes considered

| Failure | Behaviour |
| --- | --- |
| Member double-taps redeem | Unique index rejects the second; same code returned |
| Response lost on flaky wifi, client retries | Idempotency key returns the identical code |
| Stripe webhook delivered twice | Event claim makes the replay a no-op |
| Stripe is down during signup | Checkout fails visibly; no local membership is granted |
| Rollup job fails for a day | Aggregates go stale; redemption and browse are unaffected |
| Partition cron missed | `DEFAULT` partition absorbs writes; performance degrades, nothing is lost |
| Database unreachable | Cached catalogue pages continue to serve from the CDN; redemption fails loudly |

---

## 5. What breaks next

The system as built is comfortable at 1M members. The next constraints, in the
order they arrive:

1. **~3M members** — the write path is still fine, but `restaurants` browse
   diversity makes the popularity sort feel stale. Move ranking to a per-city
   materialised view refreshed every few minutes.
2. **~5M members** — single-writer Postgres is still adequate, but read replicas
   become worthwhile for the account and history pages. The data layer is already
   the only thing that touches SQL, so routing reads is a change in one directory.
3. **~10M members / 20M redemptions per month** — weekly partitions, and
   `redemptions` becomes a candidate for its own database. It shares nothing with
   the catalogue except a foreign key.
4. **International** — `redeem_day` is UTC. The moment "one per day" needs to mean
   the member's local day, the partition key needs a time zone policy. This is the
   single assumption in the schema most likely to need revisiting.
