"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_ASSUMPTIONS,
  SLOTS_PER_MARKET,
  breakEvenMonth,
  monthReaching,
  project,
  type Assumptions,
} from "@/lib/projection";
import { AreaChart, CompositionBar, LineChart, SERIES } from "./charts";
import { money } from "@/lib/format";

/** Sign goes outside the currency symbol: "-$222k", never "$-222k". */
const compact = (cents: number) => {
  const dollars = cents / 100;
  const sign = dollars < 0 ? "-" : "";
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};
const countFmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}k` : String(Math.round(n));

export function InvestorModel() {
  const [a, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [showTable, setShowTable] = useState(false);

  const points = useMemo(() => project(a, 36), [a]);
  const labels = points.map((p) => `M${p.month}`);
  const last = points[points.length - 1];
  const be = breakEvenMonth(points);
  const millionth = monthReaching(points, 1_000_000);

  const set = <K extends keyof Assumptions>(k: K, v: Assumptions[K]) => setA((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      {/* Headline outcomes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Members at month 36" value={countFmt(last.members)} tone="amber" />
        <Kpi label="MRR at month 36" value={compact(last.mrrCents)} tone="amber" />
        <Kpi
          label="Contribution margin / mo"
          value={compact(last.contributionCents)}
          hint={`${Math.round((last.contributionCents / last.mrrCents) * 100)}% of revenue`}
        />
        <Kpi
          label="EBITDA break-even"
          value={be ? `Month ${be.month}` : "Beyond 36 mo"}
          hint={be ? `${countFmt(be.members)} members` : "Adjust assumptions"}
          tone={be ? "green" : "flame"}
        />
      </div>

      {/* Assumptions */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold">Assumptions</h3>
          <button
            onClick={() => setA(DEFAULT_ASSUMPTIONS)}
            className="text-[12px] text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Reset to base case
          </button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Slider label="New markets / month" value={a.marketsPerMonth} min={0} max={8} step={1}
            display={String(a.marketsPerMonth)} onChange={(v) => set("marketsPerMonth", v)} />
          <Slider label="Category slots filled" value={a.partnerFillRate} min={0.1} max={1} step={0.05}
            display={`${Math.round(a.partnerFillRate * 100)}%`} onChange={(v) => set("partnerFillRate", v)} />
          <Slider label="Members per partner / month" value={a.membersPerPartnerPerMonth} min={1} max={30} step={1}
            display={String(a.membersPerPartnerPerMonth)} onChange={(v) => set("membersPerPartnerPerMonth", v)} />
          <Slider label="Monthly churn" value={a.monthlyChurn} min={0.01} max={0.15} step={0.005}
            display={`${(a.monthlyChurn * 100).toFixed(1)}%`} onChange={(v) => set("monthlyChurn", v)} />
          <Slider label="Market ramp" value={a.marketRampMonths} min={1} max={18} step={1}
            display={`${a.marketRampMonths} mo`} onChange={(v) => set("marketRampMonths", v)} />
          <Slider label="Opex per market / month" value={a.marketOpexCents} min={500_000} max={5_000_000} step={100_000}
            display={compact(a.marketOpexCents)} onChange={(v) => set("marketOpexCents", v)} />
        </div>

        <p className="mt-5 border-t border-ink-line pt-4 text-[12px] leading-relaxed text-ink-muted">
          Each market holds <strong className="text-ink">{SLOTS_PER_MARKET}</strong> partner
          slots ({SLOTS_PER_MARKET / 3} categories × 3 businesses). At{" "}
          {Math.round(a.partnerFillRate * 100)}% fill, a mature market carries{" "}
          <strong className="text-ink">{Math.round(SLOTS_PER_MARKET * a.partnerFillRate)}</strong>{" "}
          paying partners, each enrolling {a.membersPerPartnerPerMonth} members a month.
          {millionth && (
            <>
              {" "}The base case crosses <strong className="text-ink">1,000,000 members</strong> in
              month {millionth.month}.
            </>
          )}
        </p>
      </div>

      {/* Growth */}
      <div className="card p-6">
        <h3 className="text-base font-bold">Member base</h3>
        <p className="mb-4 mt-1 text-[13px] text-ink-muted">
          Net of churn, over 36 months. Growth is capacity-driven: partners open, partners enroll.
        </p>
        <AreaChart values={points.map((p) => p.members)} labels={labels} formatValue={countFmt} />
      </div>

      {/* Economics */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">Monthly economics</h3>
            <p className="mb-4 mt-1 text-[13px] text-ink-muted">
              All three series are dollars per month on one axis — revenue, what is left after
              partner share and processing, and what is left after operating cost.
            </p>
          </div>
          <button
            onClick={() => setShowTable((s) => !s)}
            className="rounded-pill border border-ink-line px-3.5 py-1.5 text-[12px] font-semibold text-ink-soft transition hover:border-ink/40"
            aria-expanded={showTable}
          >
            {showTable ? "Hide table" : "View as table"}
          </button>
        </div>

        <LineChart
          labels={labels}
          formatValue={compact}
          series={[
            { key: "mrr", label: "MRR", color: SERIES.amber, values: points.map((p) => p.mrrCents) },
            { key: "contribution", label: "Contribution margin", color: SERIES.blue, values: points.map((p) => p.contributionCents) },
            { key: "ebitda", label: "EBITDA", color: SERIES.magenta, values: points.map((p) => p.ebitdaCents) },
          ]}
        />

        {showTable && (
          <div className="mt-5 max-h-72 overflow-auto rounded-card border border-ink-line">
            <table className="w-full min-w-[560px] text-left text-[12px]">
              <thead className="sticky top-0 bg-ink-wash">
                <tr className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  {["Month", "Markets", "Partners", "Members", "MRR", "Contribution", "EBITDA"].map((h) => (
                    <th key={h} className="px-3 py-2 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {points.filter((p) => p.month % 3 === 0).map((p) => (
                  <tr key={p.month} className="border-t border-ink-line">
                    <td className="px-3 py-2 font-semibold">M{p.month}</td>
                    <td className="px-3 py-2 text-ink-muted">{p.markets}</td>
                    <td className="px-3 py-2 text-ink-muted">{p.partners.toLocaleString()}</td>
                    <td className="px-3 py-2">{p.members.toLocaleString()}</td>
                    <td className="px-3 py-2">{compact(p.mrrCents)}</td>
                    <td className="px-3 py-2">{compact(p.contributionCents)}</td>
                    <td className={`px-3 py-2 font-semibold ${p.ebitdaCents >= 0 ? "text-emerald-600" : "text-flame"}`}>
                      {compact(p.ebitdaCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Unit economics, shown separately because it does not move with the model ── */

export function UnitEconomics({
  price, revShare, processing, contribution,
}: { price: number; revShare: number; processing: number; contribution: number }) {
  return (
    <CompositionBar
      total={price}
      formatValue={money}
      parts={[
        { label: "Partner revenue share", value: revShare, color: SERIES.blue, note: "the acquisition cost" },
        { label: "Card processing", value: processing, color: SERIES.magenta, note: "Stripe" },
        { label: "Contribution margin", value: contribution, color: SERIES.amber, note: "kept" },
      ]}
    />
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "amber" | "green" | "flame" }) {
  const color = tone === "amber" ? "text-brand-600" : tone === "green" ? "text-emerald-600" : tone === "flame" ? "text-flame" : "text-ink";
  return (
    <div className="card p-5">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{label}</div>
      <div className={`mt-1.5 text-[28px] font-bold leading-none ${color}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[12px] text-ink-muted">{hint}</div>}
    </div>
  );
}

function Slider({
  label, value, min, max, step, display, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[13px] font-medium text-ink-soft">
        {label}
        <strong className="text-ink">{display}</strong>
      </span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-line accent-brand"
      />
    </label>
  );
}
