"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ENTITLEMENT_HINT_COOKIE } from "@/lib/cookie-names";

type Hint = "unknown" | "member" | "signed-in" | "anonymous";

function readHint(): Hint {
  const match = document.cookie.match(new RegExp(`(?:^|; )${ENTITLEMENT_HINT_COOKIE}=([^;]*)`));
  if (!match) return "anonymous";
  const value = decodeURIComponent(match[1]);
  return value === "active" || value === "trialing" ? "member" : "signed-in";
}

/**
 * The only personalised part of the nav, resolved on the client from a
 * non-sensitive hint cookie. Keeping this out of the server render is what lets
 * the marketing pages stay statically generated and CDN-cacheable.
 */
export function NavAuth() {
  const [hint, setHint] = useState<Hint>("unknown");
  useEffect(() => setHint(readHint()), []);

  if (hint === "unknown") {
    return <div className="h-9 w-[120px] rounded-pill bg-white/10 sm:w-[150px]" aria-hidden />;
  }

  if (hint === "member") {
    return (
      <Link
        href="/account"
        className="rounded-pill border border-white/25 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/10"
      >
        My Club
      </Link>
    );
  }

  return (
    <>
      <Link
        href={hint === "anonymous" ? "/join?mode=signin" : "/account"}
        className="hidden px-3 text-[13px] text-white/70 transition hover:text-white sm:inline"
      >
        {hint === "anonymous" ? "Sign in" : "Account"}
      </Link>
      <Link href="/join" className="btn-primary px-4 py-2 text-[13px] sm:px-5">
        <span>Join $19.95<span className="hidden sm:inline">/mo</span></span>
      </Link>
    </>
  );
}
