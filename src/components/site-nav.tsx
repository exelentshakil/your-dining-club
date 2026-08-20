import Image from "next/image";
import Link from "next/link";
import { NavAuth } from "./nav-auth";

/**
 * Deliberately free of `cookies()` — a Server Component that reads cookies opts
 * its whole route out of static rendering. The personalised half lives in
 * <NavAuth />, a client component.
 */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-black/90 backdrop-blur">
      <nav className="shell flex h-[68px] items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Your Dining Club home">
          <Image
            src="/brand/logo.png"
            alt="Your Dining Club"
            width={40}
            height={40}
            className="h-10 w-10 rounded-[8px] object-contain"
            priority
          />
        </Link>

        <div className="hidden items-center gap-6 text-[13px] font-medium text-white/70 lg:flex">
          <Link href="/#how" className="transition hover:text-white">About YDC</Link>
          <Link href="/#faq" className="transition hover:text-white">Q&amp;A</Link>
          <Link href="/join" className="transition hover:text-white">Become A Member</Link>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-brand-400"
          >
            <span aria-hidden>🍴</span> Restaurants
          </Link>
          <Link
            href="/businesses"
            className="inline-flex items-center gap-2 rounded-pill border border-flame px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-flame/15"
          >
            <span aria-hidden>🏪</span> Other Businesses
          </Link>
          <Link href="/investors" className="transition hover:text-white">Investors</Link>
        </div>

        <div className="flex items-center gap-2">
          <NavAuth />
        </div>
      </nav>
    </header>
  );
}
