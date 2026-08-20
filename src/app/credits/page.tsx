import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { allCredits, UNSPLASH_ATTRIBUTION_URL } from "@/lib/images";

export const metadata: Metadata = { title: "Photo Credits" };
export const revalidate = 86400;

export default function CreditsPage() {
  const credits = allCredits();

  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="📷 Credits"
          title="Photography"
          subtitle={`Every photograph on this site is licensed from Unsplash. ${credits.length} images, credited below as the Unsplash API Guidelines require.`}
        />
        <section className="bg-white py-16">
          <div className="shell">
            <ul className="grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
              {credits.map((c) => (
                <li key={c.slug} className="flex justify-between gap-3 border-b border-ink-line py-2">
                  <span className="text-ink-muted">{c.slug}</span>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-ink underline underline-offset-2 hover:text-brand-700"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[13px] text-ink-muted">
              All images courtesy of{" "}
              <a href={UNSPLASH_ATTRIBUTION_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Unsplash
              </a>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
