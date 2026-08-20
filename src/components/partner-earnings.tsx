"use client";

import { useState } from "react";
import { REV_SHARE_CENTS, REDEMPTION_COST, DIRECT_MAIL } from "@/lib/business-model";
import { money } from "@/lib/format";

/**
 * What a partner actually earns.
 *
 * The point this makes — and the reason it belongs on the page — is that revenue
 * share is recurring while redemption cost is per-visit. Past a modest number of
 * enrolled members the recurring side covers the discount entirely, which is what
 * "redemption cost as low as 0%" means in practice.
 */
export function PartnerEarnings() {
  const [membersPerMonth, setMembersPerMonth] = useState(25);
  const [monthsIn, setMonthsIn] = useState(12);
  const [avgCheck, setAvgCheck] = useState(6500);
  const [redemptionsPerMonth, setRedemptionsPerMonth] = useState(120);

  // Members accumulate: each month's cohort keeps paying while it stays.
  const enrolled = membersPerMonth * monthsIn;
  const monthlyRevShare = enrolled * REV_SHARE_CENTS.typical;
  const annualRevShare = monthlyRevShare * 12;

  const monthlyDiscountCost = Math.round(redemptionsPerMonth * avgCheck * REDEMPTION_COST.typical);
  const netMonthly = monthlyRevShare - monthlyDiscountCost;
  const effectiveCostPct =
    redemptionsPerMonth * avgCheck === 0
      ? 0
      : Math.max(0, (monthlyDiscountCost - monthlyRevShare) / (redemptionsPerMonth * avgCheck));

  const mailValue = Math.round(DIRECT_MAIL.centsPerPiece * DIRECT_MAIL.homesPerMonth);

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-lift ring-1 ring-ink-line">
      <div className="bg-ink-black p-6">
        <h3 className="text-lg font-bold text-white">What Your Partnership Pays You</h3>
        <p className="mt-1 text-[13px] text-white/55">
          Revenue share is {money(REV_SHARE_CENTS.min)}–{money(REV_SHARE_CENTS.max)} per member,
          per month, for as long as they stay. There is no cap.
        </p>
      </div>

      <div className="grid gap-5 p-6 lg:grid-cols-2">
        <Slider
          label="New members you enroll per month"
          value={membersPerMonth}
          min={5}
          max={200}
          step={5}
          onChange={setMembersPerMonth}
          display={String(membersPerMonth)}
        />
        <Slider
          label="Months in the program"
          value={monthsIn}
          min={1}
          max={36}
          step={1}
          onChange={setMonthsIn}
          display={`${monthsIn} mo`}
        />
        <Slider
          label="YDC redemptions per month"
          value={redemptionsPerMonth}
          min={0}
          max={800}
          step={10}
          onChange={setRedemptionsPerMonth}
          display={String(redemptionsPerMonth)}
        />
        <Slider
          label="Average check"
          value={avgCheck}
          min={1500}
          max={20000}
          step={500}
          onChange={setAvgCheck}
          display={money(avgCheck)}
        />
      </div>

      <div className="grid gap-px bg-ink-line sm:grid-cols-3">
        <Figure label="Enrolled members paying you" value={enrolled.toLocaleString()} />
        <Figure label="Revenue share / month" value={money(monthlyRevShare)} tone="green" />
        <Figure label="Revenue share / year" value={money(annualRevShare)} tone="green" />
      </div>

      <div className="space-y-3 bg-ink-wash p-6">
        <Line label="Discount you give members each month" value={`− ${money(monthlyDiscountCost)}`} />
        <Line label="Revenue share you receive" value={`+ ${money(monthlyRevShare)}`} tone="green" />
        <div className="border-t border-ink-line pt-3">
          <Line
            label="Net monthly position"
            value={`${netMonthly >= 0 ? "+" : ""}${money(netMonthly)}`}
            tone={netMonthly >= 0 ? "green" : "flame"}
            strong
          />
        </div>
        <p className="pt-1 text-[12px] leading-relaxed text-ink-muted">
          Effective redemption cost:{" "}
          <strong className="text-ink">{(effectiveCostPct * 100).toFixed(1)}%</strong> of
          discounted revenue
          {effectiveCostPct === 0 && " — revenue share covers the discount entirely"}. Add the{" "}
          {money(mailValue)}/month of direct mail included free for the first{" "}
          {DIRECT_MAIL.freeMonths} months.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; display: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[13px] font-medium text-ink-soft">
        {label}
        <strong className="text-ink">{display}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-line accent-brand"
      />
    </label>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div className="bg-white p-5">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${tone === "green" ? "text-emerald-600" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function Line({
  label, value, tone, strong,
}: { label: string; value: string; tone?: "green" | "flame"; strong?: boolean }) {
  const color = tone === "green" ? "text-emerald-600" : tone === "flame" ? "text-flame" : "text-ink";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={`${strong ? "text-lg font-bold" : "font-semibold"} ${color}`}>{value}</span>
    </div>
  );
}
