"use client";

import { useId, useMemo, useState } from "react";

/**
 * Chart primitives, hand-rolled in SVG.
 *
 * Palette validated against the six checks for a light surface (see the dataviz
 * validator): amber/blue/magenta clear the lightness band, the chroma floor and
 * the normal-vision floor. Adjacent CVD separation lands in the 6–8 band, which
 * is legal only with secondary encoding — so every series here is direct-labeled
 * and stacked segments carry a 2px surface gap. Do not drop those.
 */
export const SERIES = {
  amber: "#D9970A",
  blue: "#2563A8",
  magenta: "#C2407E",
} as const;

const AXIS = "#C9CDD3";
const GRID = "#EDEFF2";

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

/* ── Line chart: several series, one shared axis ──────────────────────────── */

export type Series = { key: string; label: string; color: string; values: number[] };

export function LineChart({
  series,
  labels,
  formatValue,
  height = 260,
  yLabel,
}: {
  series: Series[];
  labels: string[];
  formatValue: (n: number) => string;
  height?: number;
  yLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const pad = { top: 16, right: 16, bottom: 28, left: 62 };
  const width = 720;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = useMemo(
    () => niceMax(Math.max(...series.flatMap((s) => s.values), 0)),
    [series]
  );
  const min = useMemo(
    () => Math.min(0, ...series.flatMap((s) => s.values)),
    [series]
  );
  const span = max - min || 1;

  const x = (i: number) => pad.left + (i / Math.max(1, labels.length - 1)) * plotW;
  const y = (v: number) => pad.top + plotH - ((v - min) / span) * plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * span);

  return (
    <figure className="m-0">
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[560px]"
          role="img"
          aria-label={series.map((s) => s.label).join(", ")}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * width;
            const i = Math.round(((px - pad.left) / plotW) * (labels.length - 1));
            setHover(i >= 0 && i < labels.length ? i : null);
          }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={pad.left} y={pad.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Recessive grid */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-muted text-[10px]">
                {formatValue(t)}
              </text>
            </g>
          ))}
          <line x1={pad.left} x2={width - pad.right} y1={y(min)} y2={y(min)} stroke={AXIS} strokeWidth={1} />

          {/* X labels — every 6th month keeps them from colliding */}
          {labels.map((l, i) =>
            i % 6 === 0 || i === labels.length - 1 ? (
              <text key={l} x={x(i)} y={height - 8} textAnchor="middle" className="fill-ink-muted text-[10px]">
                {l}
              </text>
            ) : null
          )}

          {hover != null && (
            <line
              x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH}
              stroke={AXIS} strokeWidth={1} strokeDasharray="3 3"
            />
          )}

          <g clipPath={`url(#${clipId})`}>
            {series.map((s) => (
              <polyline
                key={s.key}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              />
            ))}
          </g>

          {/* Hover markers get a 2px surface ring so overlapping series stay legible */}
          {hover != null &&
            series.map((s) => (
              <circle
                key={s.key}
                cx={x(hover)}
                cy={y(s.values[hover])}
                r={5}
                fill={s.color}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ))}
        </svg>

        {hover != null && (
          <div
            className="pointer-events-none absolute top-2 rounded-[10px] border border-ink-line bg-white/97 px-3 py-2 text-[11px] shadow-lift"
            style={{ left: `${Math.min(78, (hover / Math.max(1, labels.length - 1)) * 100)}%` }}
          >
            <div className="font-bold text-ink">{labels[hover]}</div>
            {series.map((s) => (
              <div key={s.key} className="mt-1 flex items-center gap-2 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="text-ink-muted">{s.label}</span>
                <span className="ml-auto font-semibold text-ink">{formatValue(s.values[hover])}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Identity is never colour alone: a legend is always present for ≥2 series. */}
      {series.length > 1 && (
        <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-soft">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
              {s.label}
              <strong className="text-ink">{formatValue(s.values[s.values.length - 1])}</strong>
            </span>
          ))}
          {yLabel && <span className="ml-auto text-ink-muted">{yLabel}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/* ── Area chart: one series, so no legend — the title names it ────────────── */

export function AreaChart({
  values,
  labels,
  color = SERIES.amber,
  formatValue,
  height = 220,
}: {
  values: number[];
  labels: string[];
  color?: string;
  formatValue: (n: number) => string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();

  const pad = { top: 14, right: 14, bottom: 26, left: 58 };
  const width = 720;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...values, 0));

  const x = (i: number) => pad.left + (i / Math.max(1, values.length - 1)) * plotW;
  const y = (v: number) => pad.top + plotH - (v / (max || 1)) * plotH;

  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad.left},${pad.top + plotH} ${line} ${pad.left + plotW},${pad.top + plotH}`;

  return (
    <figure className="m-0 overflow-x-auto">
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[560px]"
          role="img"
          aria-label="Members over time"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * width;
            const i = Math.round(((px - pad.left) / plotW) * (values.length - 1));
            setHover(i >= 0 && i < values.length ? i : null);
          }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(max * t)} y2={y(max * t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y(max * t) + 4} textAnchor="end" className="fill-ink-muted text-[10px]">
                {formatValue(max * t)}
              </text>
            </g>
          ))}

          <polygon points={area} fill={`url(#${gradId})`} />
          <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />

          {labels.map((l, i) =>
            i % 6 === 0 || i === labels.length - 1 ? (
              <text key={l} x={x(i)} y={height - 7} textAnchor="middle" className="fill-ink-muted text-[10px]">
                {l}
              </text>
            ) : null
          )}

          {hover != null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke={AXIS} strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(values[hover])} r={5} fill={color} stroke="#FFFFFF" strokeWidth={2} />
            </>
          )}
        </svg>

        {hover != null && (
          <div
            className="pointer-events-none absolute top-1 rounded-[10px] border border-ink-line bg-white/97 px-3 py-1.5 text-[11px] shadow-lift"
            style={{ left: `${Math.min(80, (hover / Math.max(1, values.length - 1)) * 100)}%` }}
          >
            <span className="text-ink-muted">{labels[hover]}: </span>
            <strong className="text-ink">{formatValue(values[hover])}</strong>
          </div>
        )}
      </div>
    </figure>
  );
}

/* ── Composition bar: one value split into named parts ────────────────────── */

export function CompositionBar({
  parts,
  total,
  formatValue,
}: {
  parts: Array<{ label: string; value: number; color: string; note?: string }>;
  total: number;
  formatValue: (n: number) => string;
}) {
  return (
    <div>
      {/* 2px gaps between segments are the surface spacer the spec requires. */}
      <div className="flex h-12 w-full gap-[2px] overflow-hidden rounded-[8px]">
        {parts.map((p) => (
          <div
            key={p.label}
            className="grid place-items-center text-[11px] font-bold text-white first:rounded-l-[8px] last:rounded-r-[8px]"
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
            title={`${p.label}: ${formatValue(p.value)}`}
          >
            {p.value / total > 0.14 ? `${Math.round((p.value / total) * 100)}%` : ""}
          </div>
        ))}
      </div>

      <dl className="mt-4 space-y-2.5">
        {parts.map((p) => (
          <div key={p.label} className="flex items-baseline gap-3 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
            <dt className="text-ink-soft">
              {p.label}
              {p.note && <span className="ml-1.5 text-ink-muted">({p.note})</span>}
            </dt>
            <dd className="ml-auto font-bold text-ink">{formatValue(p.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
