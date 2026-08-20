"use client";

import { useState } from "react";
import { REFERRAL } from "@/lib/business-model";

/**
 * The referral loop, surfaced where a happy member will see it: on the page that
 * just told them how much they saved.
 */
export function ReferralCard({
  code,
  link,
  pending,
  qualified,
  monthsEarned,
}: {
  code: string;
  link: string;
  pending: number;
  qualified: number;
  monthsEarned: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the code is on screen to type manually */
    }
  }

  return (
    <div className="overflow-hidden rounded-card bg-ink-black text-white">
      <div className="p-6">
        <span className="eyebrow-dark">🎁 Refer &amp; Earn</span>
        <h3 className="mt-4 text-xl font-bold">
          {monthsEarned > 0
            ? `You've earned ${monthsEarned} free month${monthsEarned === 1 ? "" : "s"}`
            : "Every friend who stays is a free month"}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">
          Share your link. When a friend joins and stays {REFERRAL.qualifyingDays} days,
          your next month is free. There is no cap.
        </p>

        <div className="mt-5 flex items-center gap-2 rounded-[10px] border border-white/15 bg-white/5 p-2">
          <code className="flex-1 truncate px-2 font-mono text-[13px] text-brand">{code}</code>
          <button onClick={copy} className="btn-primary shrink-0 px-4 py-2 text-[12px]">
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-white/[0.03]">
        <Stat value={pending} label="Pending" />
        <Stat value={qualified} label="Qualified" />
        <Stat value={monthsEarned} label="Free months" highlight />
      </div>
    </div>
  );
}

function Stat({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="px-3 py-4 text-center">
      <div className={`text-xl font-bold ${highlight ? "text-brand" : "text-white"}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/45">{label}</div>
    </div>
  );
}
