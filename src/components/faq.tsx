import Image from "next/image";
import Link from "next/link";
import { img, creditFor } from "@/lib/images";
import {
  MEMBERSHIP_PRICE_CENTS,
  MEMBERS_REQUIRED_PER_TABLE,
  REFERRAL,
  monthlySavingsCents,
} from "@/lib/business-model";
import { BUSINESS_CATEGORIES, RESTAURANT_CATEGORIES } from "@/data/categories";
import { money } from "@/lib/format";

const totalCategories = RESTAURANT_CATEGORIES.length + BUSINESS_CATEGORIES.length;
/** "Once per day" at a $30 entrée — the figure the site quotes. */
const oncePerDayMonthly = monthlySavingsCents(7, 3000);

const QA: Array<[string, React.ReactNode]> = [
  [
    "How much is a Your Dining Club membership?",
    <>
      A YDC Membership is ONLY <strong>{money(MEMBERSHIP_PRICE_CENTS)} per month</strong>. There
      are no contracts, no hidden fees, and you can cancel online anytime with a
      single click. You can also earn one FREE month per referral to your friends
      and family.
    </>,
  ],
  [
    "How does the FREE item work at sit-down restaurants?",
    <>
      Purchase 2 drinks, 1 appetizer and 1 entrée. Your 5th menu item — of equal or
      lesser value than the entrée — is free. Show the code in the app when the
      bill arrives and the server applies it. Only{" "}
      {MEMBERS_REQUIRED_PER_TABLE} member per table is needed, so you can bring
      guests who aren&apos;t members.
    </>,
  ],
  [
    "How many FREE items can I get per visit?",
    <>
      One free item per qualifying purchase. A larger party can run more than one
      offer on the same check — a table of four that buys two qualifying rounds
      receives two free items. Use the savings calculator to see what that adds up
      to for your usual party size.
    </>,
  ],
  [
    "How does it work at fast food & pizza restaurants?",
    <>
      Quick-service partners set an equivalent offer that fits their menu — usually
      a free item with a qualifying combo or a second pizza of equal or lesser
      value. Each restaurant&apos;s exact offer is shown on its listing in the app
      before you go, so there are never surprises at the counter.
    </>,
  ],
  [
    "How often can I use my membership?",
    <>
      As often as you like. There are no monthly caps and no blackout dates. The
      only rule is one redemption per restaurant per day, which keeps the offer
      sustainable for our partners — dine somewhere else tomorrow and use it again.
    </>,
  ],
  [
    "Is there a referral program?",
    <>
      Yes, and it is uncapped. For every friend who joins with your link and stays{" "}
      <strong>{REFERRAL.qualifyingDays} days</strong>, you earn a{" "}
      <strong>FREE month</strong>. Refer twelve friends who stick and your year is
      free. There is no limit on how many months you can earn.
    </>,
  ],
  [
    "Is there a long-term contract?",
    <>
      No. It is month to month. Cancel in one click from your account and you keep
      access until the end of the period you have already paid for. We never ask
      for a reason and there is no cancellation fee.
    </>,
  ],
  [
    "How many different business categories can I save at?",
    <>
      <strong>{totalCategories} categories</strong> — {RESTAURANT_CATEGORIES.length}{" "}
      restaurant types plus {BUSINESS_CATEGORIES.length} other local business
      categories, from car mechanics and dentists to golf courses, salons and
      grocery stores. Your one membership covers all of them.
    </>,
  ],
  [
    "How much can I save per month just at restaurants using my membership once per day?",
    <>
      At a $30 average entrée, using the membership once a day comes to about{" "}
      <strong>{money(oncePerDayMonthly)} a month</strong> in free food — roughly{" "}
      {Math.round(oncePerDayMonthly / MEMBERSHIP_PRICE_CENTS)}× the cost of the
      membership itself, before you count anything you save at the other{" "}
      {BUSINESS_CATEGORIES.length} business categories.
    </>,
  ],
];

export function Faq() {
  const credit = creditFor("faq-dining");

  return (
    <section id="faq" className="bg-ink-wash py-20 sm:py-24">
      <div className="shell">
        <div className="text-center">
          <span className="eyebrow">? Frequently Asked</span>
          <h2 className="section-head mt-4">
            Questions &amp; <span className="accent">Answers</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-muted">
            Everything you need to know about your Your Dining Club membership.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          {/* Native <details> keeps the accordion working without JavaScript. */}
          <div className="space-y-3">
            {QA.map(([q, a], i) => (
              <details
                key={q}
                open={i === 0}
                className="group overflow-hidden rounded-card border border-ink-line bg-white shadow-card open:ring-1 open:ring-brand"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[14px] font-semibold transition group-open:bg-brand group-open:text-ink marker:hidden">
                  {q}
                  <span className="shrink-0 text-ink-muted transition group-open:rotate-180" aria-hidden>⌄</span>
                </summary>
                <p className="border-t border-ink-line px-5 py-4 text-[14px] leading-relaxed text-ink-soft">
                  {a}
                </p>
              </details>
            ))}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="relative h-56 overflow-hidden rounded-card ring-1 ring-ink-line">
              <Image
                src={img("faq-dining", { w: 700, h: 500 })}
                alt="Friends toasting at a restaurant table"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 360px"
              />
              {credit && (
                <span className="absolute bottom-2 right-3 text-[10px] text-white/75">
                  <a href={credit.href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    {credit.name}
                  </a>{" "}
                  / Unsplash
                </span>
              )}
            </div>

            <div className="rounded-card bg-ink-black p-6 text-white">
              <span className="eyebrow-dark">♛ Join Now</span>
              <h3 className="mt-4 text-xl font-bold">Start Saving Today</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                Only {money(MEMBERSHIP_PRICE_CENTS)}/month. Download the app and begin
                saving immediately.
              </p>
              <Link href="/join" className="btn-primary mt-5 w-full">Become A Member →</Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
