import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { catalogueSize } from "@/lib/data/restaurants";
import { hasDatabase, hasStripe } from "@/lib/env";

export const metadata: Metadata = { title: "How this is built to scale" };
export const revalidate = 3600;

export default async function ScalePage() {
  const size = await catalogueSize();

  return (
    <>
      <SiteNav />
      <main className="shell py-14">
        <span className="eyebrow">Engineering notes</span>
        <h1 className="mt-3 max-w-3xl text-[32px] font-bold leading-tight sm:text-[41px]">
          What it takes to serve a million members without the database noticing.
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
          A dining club is a read-heavy catalogue with a small, sharp write path.
          Almost everything a member does is browsing; the one thing that must
          never be wrong is the redemption. The design follows from that split.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Metric value="1,000,000" label="Members the schema is sized for" />
          <Metric value={size ? size.toLocaleString() : "—"} label="Restaurants in this instance" />
          <Metric value="~2M / month" label="Redemption rows at full scale" />
        </div>

        <div className="mt-12 space-y-4">
          <Note
            title="No OFFSET anywhere"
            body="Every list endpoint is keyset-paginated on the same column order as its index. Page 500 of a large city costs what page 1 costs — an index seek, not a scan of everything skipped."
          />
          <Note
            title="The redemption rule lives in a unique index"
            body="One redemption per member, per venue, per day is enforced by a unique constraint on (member_id, restaurant_id, redeem_day) and an INSERT … ON CONFLICT DO NOTHING. Two taps race to the index; exactly one wins. No read-then-write window, no lock held across the network."
          />
          <Note
            title="Redemptions are partitioned by day-bucket"
            body="Monthly range partitions keep the hot partition small and its indexes in memory, and make archiving last quarter an O(1) DETACH rather than a delete that vacuums for a week."
          />
          <Note
            title="Entitlement rides in the cookie"
            body="The signed session carries the membership status and an entitlement version. Checking whether someone is a member is an HMAC verify, not a database round-trip. A Stripe change bumps the version, which forces exactly one refresh."
          />
          <Note
            title="Counters are rolled up, never incremented live"
            body="Lifetime savings and restaurant popularity come from stat tables written by a batch job. A restaurant that goes viral does not serialise every write in the system behind one hot row."
          />
          <Note
            title="The catalogue is CDN-cacheable"
            body="Browse responses are public and identical for everyone, so they carry s-maxage and stale-while-revalidate. Personalised responses carry no-store. The split is what keeps origin traffic roughly flat as membership grows."
          />
          <Note
            title="Stripe webhooks are idempotent by construction"
            body="Every event id is claimed in a table before it is applied. Stripe retries — especially during a renewal burst across a million subscriptions — become no-ops rather than double writes."
          />
        </div>

        <div className="card mt-12 p-6 text-sm text-ink-soft">
          <h2 className="text-base font-semibold text-ink">This instance right now</h2>
          <ul className="mt-3 space-y-1">
            <li>Database: {hasDatabase ? "Postgres (DATABASE_URL set)" : "demo mode — in-memory catalogue"}</li>
            <li>Billing: {hasStripe ? "Stripe checkout live" : "demo mode — memberships activate locally"}</li>
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-5">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
