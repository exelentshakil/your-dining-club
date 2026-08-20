"use client";

import { useMemo, useState } from "react";
import {
  MEMBERSHIP_PRICE_CENTS,
  breakEvenVisits,
  monthlySavingsCents,
} from "@/lib/business-model";
import { money } from "@/lib/format";

/**
 * Interactive savings model.
 *
 * The offer buys one free item per redemption, and one redemption covers a pair
 * of diners, so a party of four can run two offers on the same check. That is
 * where `offersPerCheck` comes from — it is the only assumption in here that is
 * not a direct restatement of the published offer.
 */
const FREQUENCIES = [2, 5, 10, 15, 20, 25, 30];
const PARTY_SIZES = [2, 4, 6];
const ENTREE_PRICES = [1500, 2000, 2500, 3000, 3500, 4000, 5000];

export function SavingsCalculator() {
  const [partySize, setPartySize] = useState(2);
  const [entreeCents, setEntreeCents] = useState(3000);
  const [highlight, setHighlight] = useState(5);

  const offersPerCheck = Math.floor(partySize / 2);
  const checkSavings = entreeCents * offersPerCheck;

  const rows = useMemo(
    () =>
      FREQUENCIES.map((perWeek) => ({
        perWeek,
        check: checkSavings,
        weekly: checkSavings * perWeek,
        monthly: monthlySavingsCents(perWeek, checkSavings),
      })),
    [checkSavings]
  );

  const selected = rows.find((r) => r.perWeek === highlight) ?? rows[1];
  const net = selected.monthly - MEMBERSHIP_PRICE_CENTS;
  const breakEven = breakEvenVisits(checkSavings);

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-lift ring-1 ring-ink-line">
      {/* Controls */}
      <div className="flex flex-col gap-4 bg-ink-black p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Your Dining Club Savings Calculator</h3>
          <p className="mt-1 text-[13px] text-white/55">
            Purchase 2 Drinks &bull; 1 Appetizer &bull; 1 Entrée &rarr; Get a 5th item{" "}
            <span className="font-semibold text-brand">FREE</span> (equal or lesser value)
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Control label="Party Size">
            <select
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className="w-full rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-brand"
              aria-label="Party size"
            >
              {PARTY_SIZES.map((n) => (
                <option key={n} value={n} className="text-ink">{n} People</option>
              ))}
            </select>
          </Control>
          <Control label="Avg. Entrée Cost">
            <select
              value={entreeCents}
              onChange={(e) => setEntreeCents(Number(e.target.value))}
              className="w-full rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-brand"
              aria-label="Average entrée cost"
            >
              {ENTREE_PRICES.map((c) => (
                <option key={c} value={c} className="text-ink">{money(c)}</option>
              ))}
            </select>
          </Control>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-brand text-left text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
              <th className="px-4 py-3">Times / Week</th>
              <th className="px-4 py-3">Party Size</th>
              <th className="px-4 py-3">Avg. Entrée Cost</th>
              <th className="px-4 py-3">Check Savings</th>
              <th className="px-4 py-3">Weekly Savings</th>
              <th className="px-4 py-3">Monthly Savings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = r.perWeek === highlight;
              return (
                <tr
                  key={r.perWeek}
                  onMouseEnter={() => setHighlight(r.perWeek)}
                  onFocus={() => setHighlight(r.perWeek)}
                  tabIndex={0}
                  className={`cursor-pointer border-b border-ink-line/70 transition ${
                    active ? "bg-brand-50" : "hover:bg-ink-wash"
                  }`}
                >
                  <td className="px-4 py-3.5 font-bold">{r.perWeek}x / wk</td>
                  <td className="px-4 py-3.5 text-ink-muted">{partySize} ppl</td>
                  <td className="px-4 py-3.5 text-ink-muted">{money(entreeCents)}</td>
                  <td className="px-4 py-3.5 font-semibold text-flame">{money(r.check)}</td>
                  <td className="px-4 py-3.5 font-semibold text-flame">{money(r.weekly)}</td>
                  <td className="px-4 py-3.5 text-base font-bold text-flame">{money(r.monthly)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Live summary */}
      <div className="grid gap-4 border-t border-ink-line bg-ink-wash p-5 sm:grid-cols-3 sm:p-6">
        <Summary
          label={`At ${selected.perWeek}x per week you save`}
          value={money(selected.monthly)}
          tone="flame"
        />
        <Summary label="Membership cost" value={`${money(MEMBERSHIP_PRICE_CENTS)} / mo`} />
        <Summary
          label="Net in your pocket"
          value={net >= 0 ? `+${money(net)}` : money(net)}
          tone={net >= 0 ? "green" : undefined}
        />
      </div>

      <p className="flex items-start gap-2 border-t border-ink-line bg-white px-5 py-4 text-[12px] leading-relaxed text-ink-muted sm:px-6">
        <span aria-hidden className="mt-[1px] text-brand-600">ⓘ</span>
        <span>
          Estimates based on your selections. A party of {partySize} runs{" "}
          {offersPerCheck} offer{offersPerCheck === 1 ? "" : "s"} per check. Only one
          member per table is needed. The membership pays for itself after{" "}
          <strong className="text-ink">
            {breakEven < 1 ? "a single visit" : `${Math.ceil(breakEven)} visits`}
          </strong>{" "}
          a month. Membership is {money(MEMBERSHIP_PRICE_CENTS)}/month — cancel anytime.
        </span>
      </p>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="min-w-[140px] flex-1">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
        {label}
      </span>
      {children}
    </label>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "flame" | "green" }) {
  const color = tone === "flame" ? "text-flame" : tone === "green" ? "text-emerald-600" : "text-ink";
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
