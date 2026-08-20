import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CancelButton, SessionRefresher, SignOutButton } from "@/components/account-actions";
import { getSession, isMember } from "@/lib/session";
import { getMemberById, referralSummary } from "@/lib/data/members";
import { ReferralCard } from "@/components/referral-card";
import { referralLink } from "@/lib/referral";
import { env } from "@/lib/env";
import { listRedemptions, memberSavings } from "@/lib/data/redemptions";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "My club" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/join?mode=signin");

  const member = await getMemberById(session.sub);
  const [history, savings, referrals] = await Promise.all([
    listRedemptions(session.sub, 20),
    memberSavings(session.sub),
    member ? referralSummary(member.id, member.referralCode) : null,
  ]);

  const active = isMember(session);
  // Cookie behind the database means Stripe changed something since sign-in.
  const stale = member != null && member.entitlementVer !== session.ev;

  return (
    <>
      <SiteNav />
      <SessionRefresher stale={stale} />
      <main className="shell py-10">
        {sp.welcome === "1" && (
          <div className="card mb-6 border-brand-200 bg-brand-50 p-5">
            <p className="font-semibold">You are in. Welcome to the club.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Find somewhere to eat tonight and tap redeem when the bill arrives.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">My club</span>
            <h1 className="mt-2 text-[32px] font-bold sm:text-[41px]">
              {session.name ?? session.email}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{session.email}</p>
          </div>
          <div className="flex items-center gap-4">
            {active && <CancelButton />}
            <SignOutButton />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Membership"
            value={active ? "Active" : "Inactive"}
            hint={
              member?.currentPeriodEnd
                ? `Renews ${new Date(member.currentPeriodEnd).toLocaleDateString()}`
                : active
                  ? "Billed monthly"
                  : "Reactivate any time"
            }
            accent={active}
          />
          <Stat label="Saved this month" value={money(savings.monthCents)} hint={`${savings.month} redemption${savings.month === 1 ? "" : "s"}`} />
          <Stat label="Saved all time" value={money(savings.lifetimeCents)} hint="Since you joined" />
        </div>

        {!active && (
          <div className="card mt-6 p-6">
            <h2 className="font-semibold">Your membership is not active</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Reactivate to start redeeming again — $19.95 a month, cancel whenever.
            </p>
            <Link href="/join" className="btn-primary mt-5">Activate membership</Link>
          </div>
        )}

        {referrals && member?.referralCode && (
          <div className="mt-6">
            <ReferralCard
              code={member.referralCode}
              link={referralLink(env.siteUrl, member.referralCode)}
              pending={referrals.pending}
              qualified={referrals.qualified}
              monthsEarned={referrals.monthsEarned}
            />
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recent redemptions</h2>
          {history.items.length === 0 ? (
            <div className="card mt-4 p-10 text-center">
              <p className="font-semibold">Nothing redeemed yet.</p>
              <p className="mt-1 text-sm text-ink-muted">
                Your first dinner covers most of the month.
              </p>
              <Link href="/restaurants" className="btn-primary mt-5">Find a restaurant</Link>
            </div>
          ) : (
            <ul className="card mt-4 divide-y divide-ink-line">
              {history.items.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <Link href={`/restaurants/${h.restaurantSlug}`} className="font-semibold hover:underline">
                      {h.restaurantName}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {h.city} · table of {h.partySize} ·{" "}
                      {new Date(h.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-ink-muted">{h.code}</div>
                    <div className="text-sm font-semibold text-emerald-600">−{money(h.savedCents)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-emerald-600" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{hint}</div>
    </div>
  );
}
