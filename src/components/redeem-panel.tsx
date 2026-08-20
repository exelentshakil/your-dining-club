"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Redemption } from "@/lib/types";
import { money } from "@/lib/format";
import { ENTITLEMENT_HINT_COOKIE } from "@/lib/cookie-names";

type Outcome = { status: "created" | "replayed" | "already_redeemed"; redemption: Redemption };

type Viewer = "unknown" | "member" | "lapsed" | "anonymous";

function readViewer(): Viewer {
  const match = document.cookie.match(new RegExp(`(?:^|; )${ENTITLEMENT_HINT_COOKIE}=([^;]*)`));
  if (!match) return "anonymous";
  const value = decodeURIComponent(match[1]);
  return value === "active" || value === "trialing" ? "member" : "lapsed";
}

/**
 * Resolves who is looking on the client, from the non-sensitive hint cookie.
 *
 * That is what keeps the restaurant page — the most numerous and most crawled
 * route in the product — statically renderable and CDN-cacheable. The hint only
 * decides which panel to draw; /api/redeem independently verifies the signed
 * session and returns 401/402 regardless of what the client believed.
 */
export function RedeemPanel({ slug, estimateCents }: { slug: string; estimateCents: number }) {
  const router = useRouter();
  const [viewer, setViewer] = useState<Viewer>("unknown");
  useEffect(() => setViewer(readViewer()), []);
  const [partySize, setPartySize] = useState(2);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generated once per attempt and reused across retries, so a dropped response
  // on restaurant wifi returns the same code instead of a "already redeemed".
  const idemKey = useRef<string | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    idemKey.current ??= crypto.randomUUID();

    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, partySize, idempotencyKey: idemKey.current }),
      });
      const body = await res.json();

      if (!res.ok) {
        if (res.status === 402) router.push("/join");
        setError(body.error ?? "Could not redeem right now.");
        return;
      }
      setOutcome(body as Outcome);
    } catch {
      setError("Network hiccup — tap again, your code is reserved.");
    } finally {
      setBusy(false);
    }
  }, [slug, partySize, router]);

  if (outcome) {
    const { redemption, status } = outcome;
    return (
      <div className="card overflow-hidden">
        <div className="bg-ink p-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand/70">
            {status === "already_redeemed" ? "Already redeemed today" : "Show this to staff"}
          </p>
          <p className="mt-3 font-mono text-3xl font-bold text-brand">{redemption.code}</p>
          <p className="mt-2 text-xs text-white/50">
            Table of {redemption.partySize} · {new Date(redemption.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="space-y-2 p-5 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Estimated saving</span>
            <span className="font-semibold text-emerald-600">{money(redemption.savedCents)}</span>
          </div>
          {status === "already_redeemed" && (
            <p className="rounded-[10px] bg-brand-50 p-3 text-xs text-ink-soft">
              You already used this restaurant today — here is the same code again.
              It resets at midnight UTC.
            </p>
          )}
          {status === "replayed" && (
            <p className="rounded-[10px] bg-ink-wash p-3 text-xs text-ink-muted">
              Same code as your last tap. Nothing was double-counted.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (viewer === "unknown") {
    return <div className="card h-[268px] animate-pulse" aria-hidden />;
  }

  if (viewer === "anonymous") {
    return (
      <div className="card p-6">
        <h3 className="font-semibold">Sign in to redeem</h3>
        <p className="mt-2 text-sm text-ink-soft">
          Members get this offer every day. It takes about a minute to join.
        </p>
        <a href="/join" className="btn-primary mt-5 w-full">Join for $19.95/mo</a>
        <a href="/join?mode=signin" className="btn-secondary mt-2 w-full">I already have an account</a>
      </div>
    );
  }

  if (viewer === "lapsed") {
    return (
      <div className="card p-6">
        <h3 className="font-semibold">Your membership is not active</h3>
        <p className="mt-2 text-sm text-ink-soft">
          Reactivate to keep redeeming — it stays cancellable in one click.
        </p>
        <a href="/join" className="btn-primary mt-5 w-full">Activate membership</a>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold">Redeem at the table</h3>
      <p className="mt-2 text-sm text-ink-soft">
        Tap when you are ready to pay. Estimated saving{" "}
        <span className="font-semibold text-ink">{money(estimateCents)}</span>.
      </p>

      <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        Party size
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 6, 8].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPartySize(n)}
            className={`h-10 w-10 rounded-full border text-sm font-semibold transition ${
              partySize === n ? "border-ink bg-ink text-brand" : "border-ink-line text-ink-soft hover:border-ink/40"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button className="btn-primary mt-6 w-full" onClick={submit} disabled={busy}>
        {busy ? "Generating code…" : "Redeem now"}
      </button>
      <p className="mt-3 text-center text-[11px] text-ink-muted">
        One redemption per restaurant per day.
      </p>
    </div>
  );
}
