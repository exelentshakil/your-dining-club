import manifest from "@/data/images.json";

export type ImageRecord = {
  id: string;
  raw: string;
  blurHash: string | null;
  color: string;
  alt: string;
  credit: { name: string; username: string; link: string };
};

const images = manifest as Record<string, ImageRecord>;

/** Unsplash requires this on every attribution link. */
const UTM = "utm_source=your_dining_club&utm_medium=referral";

/**
 * Builds a sized Unsplash CDN URL from the stored raw URL.
 *
 * The raw URL accepts Imgix parameters, so one cached record serves a 400px card
 * and a 1600px hero without another API call — which matters because the API
 * budget is 50 requests an hour and the manifest was filled once.
 */
export function img(slug: string, opts: { w?: number; h?: number; q?: number } = {}): string {
  const record = images[slug];
  if (!record) return "";
  const url = new URL(record.raw);
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("w", String(opts.w ?? 800));
  if (opts.h) url.searchParams.set("h", String(opts.h));
  url.searchParams.set("q", String(opts.q ?? 75));
  return url.toString();
}

export function imageRecord(slug: string): ImageRecord | null {
  return images[slug] ?? null;
}

export function creditFor(slug: string): { name: string; href: string } | null {
  const record = images[slug];
  if (!record) return null;
  return { name: record.credit.name, href: `${record.credit.link}?${UTM}` };
}

export function allCredits(): Array<{ slug: string; name: string; href: string }> {
  return Object.entries(images)
    .map(([slug, r]) => ({ slug, name: r.credit.name, href: `${r.credit.link}?${UTM}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const UNSPLASH_ATTRIBUTION_URL = `https://unsplash.com/?${UTM}`;
