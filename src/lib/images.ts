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

// Photographer attribution (creditFor/allCredits/UNSPLASH_ATTRIBUTION_URL) is
// not displayed at this stage of development — removed from the UI, not from
// the manifest. Unsplash's guidelines require attribution before this ships
// publicly; re-add before launch. The manifest below still carries the credit
// data needed to do that.
