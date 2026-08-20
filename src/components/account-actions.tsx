"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Fires once when the cookie's entitlement version is behind the database. */
export function SessionRefresher({ stale }: { stale: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!stale) return;
    void fetch("/api/auth/refresh", { method: "POST" }).then(() => router.refresh());
  }, [stale, router]);
  return null;
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

export function CancelButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
        onClick={() => setConfirming(true)}
      >
        Cancel membership
      </button>
    );
  }

  return (
    <span className="flex items-center gap-3 text-xs">
      <span className="text-ink-soft">Cancel at period end?</span>
      <button
        className="font-semibold text-red-600 underline underline-offset-2 disabled:opacity-50"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch("/api/subscription/cancel", { method: "POST" });
          await fetch("/api/auth/refresh", { method: "POST" });
          router.refresh();
          setBusy(false);
          setConfirming(false);
        }}
      >
        {busy ? "Cancelling…" : "Yes, cancel"}
      </button>
      <button className="text-ink-muted underline underline-offset-2" onClick={() => setConfirming(false)}>
        Keep it
      </button>
    </span>
  );
}
