"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MEMBERSHIP_PRICE_CENTS, REFERRAL } from "@/lib/business-model";
import { money } from "@/lib/format";

export function JoinForm({ mode }: { mode: "join" | "signin" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attribution rides in the URL: ?ref= from a friend, ?partner= from a business.
  const ref = params.get("ref");
  const partner = params.get("partner");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const auth = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          ref: ref || undefined,
          partner: partner || undefined,
        }),
      });
      const authBody = await auth.json();
      if (!auth.ok) throw new Error(authBody.error ?? "Could not sign you in.");

      if (mode === "signin") {
        router.push("/account");
        router.refresh();
        return;
      }

      const checkout = await fetch("/api/checkout", { method: "POST" });
      const checkoutBody = await checkout.json();
      if (!checkout.ok) throw new Error(checkoutBody.error ?? "Could not start checkout.");

      // Stripe returns an absolute URL; demo mode returns an internal path.
      if (checkoutBody.redirectUrl?.startsWith("http")) {
        window.location.href = checkoutBody.redirectUrl;
      } else {
        router.push(checkoutBody.redirectUrl ?? "/account");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <h1 className="text-2xl font-bold">
        {mode === "signin" ? "Welcome back" : "Join Your Dining Club"}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {mode === "signin"
          ? "Enter the email on your membership."
          : `${money(MEMBERSHIP_PRICE_CENTS)} a month. Cancel in one click, any time.`}
      </p>

      {mode === "join" && ref && (
        <p className="mt-5 rounded-card border border-brand-200 bg-brand-50 p-3.5 text-[13px] leading-relaxed text-ink-soft">
          🎁 You were invited by a member. Stay {REFERRAL.qualifyingDays} days and they
          earn a free month — and you get your own invite link straight away.
        </p>
      )}
      {mode === "join" && partner && (
        <p className="mt-3 rounded-card border border-ink-line bg-ink-wash p-3.5 text-[13px] leading-relaxed text-ink-soft">
          🏪 Signing up through partner <strong className="text-ink">{partner}</strong>.
        </p>
      )}

      {mode === "join" && (
        <>
          <label htmlFor="name" className="label mt-6 block">Name</label>
          <input
            id="name"
            className="field mt-1.5"
            placeholder="Alex Rivera"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </>
      )}

      <label htmlFor="email" className="label mt-5 block">Email</label>
      <input
        id="email"
        type="email"
        required
        className="field mt-1.5"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      {error && <p className="mt-4 text-sm text-flame">{error}</p>}

      <button type="submit" className="btn-dark mt-6 w-full" disabled={busy}>
        {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Continue to payment"}
      </button>

      <p className="mt-4 text-center text-xs text-ink-muted">
        {mode === "signin" ? (
          <>New here? <a href="/join" className="underline underline-offset-2">Join the club</a></>
        ) : (
          <>Already a member? <a href="/join?mode=signin" className="underline underline-offset-2">Sign in</a></>
        )}
      </p>
    </form>
  );
}
