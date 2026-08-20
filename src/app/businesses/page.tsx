import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CategoryGrid } from "@/components/category-grid";
import { PageHero } from "@/components/page-hero";
import { BUSINESS_CATEGORIES } from "@/data/categories";

export const metadata: Metadata = { title: "Other Businesses" };
export const revalidate = 3600;

export default function BusinessesPage() {
  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="🏪 Local Businesses"
          title="Select From Other Types Of Businesses"
          subtitle={`Discover premium offers from ${BUSINESS_CATEGORIES.length} different categories of business partners. Select a category below to view the businesses' YDC Member offers.`}
        />

        <section className="bg-white py-16">
          <div className="shell">
            <CategoryGrid
              categories={BUSINESS_CATEGORIES}
              hrefFor={(c) => `/partners?category=${c.slug}`}
            />
          </div>
        </section>

        <section className="bg-brand py-14">
          <div className="shell grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="text-[30px] font-bold leading-tight text-ink sm:text-[36px]">
                Own a Local Business?
              </h2>
              <p className="mt-3 max-w-xl text-[15px] text-ink/70">
                Apply for a FREE Your Dining Club partnership to reach thousands of local
                members, increase transaction values, and earn monthly revenue sharing.
              </p>
            </div>
            <div className="lg:justify-self-end">
              <Link href="/partners" className="btn-dark">🏪 Apply For FREE Partnership</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
