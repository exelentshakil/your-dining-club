import Image from "next/image";
import Link from "next/link";
import { UNSPLASH_ATTRIBUTION_URL } from "@/lib/images";

export function SiteFooter() {
  return (
    <footer className="bg-ink-black text-white">
      <div className="shell grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/brand/logo.png"
            alt="Your Dining Club"
            width={48}
            height={48}
            className="h-12 w-12 rounded-[8px] object-contain"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
            America&apos;s premium dining membership. Purchase 2 drinks, 1 appetizer,
            1 entrée — and receive a 5th item FREE.
          </p>
          <div className="mt-5 flex gap-2">
            {["f", "in", "x", "p"].map((s) => (
              <span
                key={s}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white/70"
                aria-hidden
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <FooterCol
          title="Quick Links"
          links={[["Home", "/"], ["Q&A", "/#faq"], ["Become A Member", "/join"], ["Restaurants", "/restaurants"], ["Other Businesses", "/businesses"]]}
        />
        <FooterCol
          title="For Businesses"
          links={[["Business Applications", "/partners"], ["Lifetime Profit Sharing", "/partners#revenue"], ["Become a Partner", "/partners"]]}
        />
        <FooterCol
          title="Company"
          links={[["Investor Room", "/investors"], ["How It Scales", "/scale"], ["Photo Credits", "/credits"]]}
        />
      </div>

      <div className="shell flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} YourDiningClub.com — All Rights Reserved.</span>
        <span>
          Photography from{" "}
          <a href={UNSPLASH_ATTRIBUTION_URL} className="underline underline-offset-2 hover:text-white" target="_blank" rel="noreferrer">
            Unsplash
          </a>
          {" · "}
          <Link href="/credits" className="underline underline-offset-2 hover:text-white">full credits</Link>
        </span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm text-white/55">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="transition hover:text-brand">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
