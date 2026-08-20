#!/usr/bin/env node
/**
 * Pulls one real photograph per category from the Unsplash API and writes
 * src/data/images.json.
 *
 * Unsplash demo keys allow 50 requests/hour and we need 44, so this script is
 * built to spend that budget exactly once: anything already in the manifest is
 * skipped, and a rate-limit response stops the run with progress saved. Re-running
 * costs nothing and fills only what is missing.
 *
 * The manifest stores Unsplash CDN URLs (not copies of the files) plus the
 * photographer credit that the Unsplash API Guidelines require us to display.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "src", "data", "images.json");

const key = process.env.UNSPLASH_ACCESS_KEY;
if (!key) {
  console.error("UNSPLASH_ACCESS_KEY is not set.");
  process.exit(1);
}

/** slug -> the search phrase that actually returns the right picture. */
const QUERIES = {
  // Hero / editorial
  "hero-dining": "friends dining together restaurant celebration",
  "faq-dining": "friends toasting dinner table restaurant",
  "partner-owner": "restaurant owner chef kitchen portrait",
  "member-savings": "couple dining restaurant candlelight",

  // Restaurant categories
  "sit-down": "fine dining restaurant table setting",
  "fast-food": "cheeseburger and fries",
  pizza: "wood fired pizza",
  "coffee-shops": "coffee shop latte art",
  "breakfast-diners": "pancakes breakfast diner",
  "donut-shops": "glazed donuts",
  "bar-lounge": "cocktail bar lounge",
  "food-truck": "food truck street food",

  // Other business categories
  "amusement-park": "amusement park roller coaster",
  "auto-dealership": "car dealership showroom",
  bakery: "bakery bread and pastries",
  "beauty-hair-salon": "hair salon styling",
  "book-store": "bookstore shelves",
  "bowling-alley": "bowling alley lanes",
  butcher: "butcher shop meat counter",
  "car-mechanic": "auto mechanic garage repair",
  "car-wash-detail": "car wash detailing",
  chiropractic: "chiropractor back adjustment",
  "compound-pharmacy": "pharmacy compounding prescription",
  deli: "deli sandwich counter",
  dental: "dental clinic dentist chair",
  "dietary-support": "vitamins supplements nutrition",
  dispensary: "cannabis plant shop counter",
  "dry-cleaner": "dry cleaning shirts garments",
  "electronics-phone": "smartphone electronics store",
  "family-entertainment": "arcade games family entertainment",
  florist: "florist flower shop",
  "furniture-store": "furniture showroom sofa",
  "gas-station": "gas station fuel pump",
  "golf-course": "golf course green fairway",
  "golf-miniature": "miniature golf course",
  "grocery-store": "grocery store fresh produce",
  gym: "gym fitness weights training",
  "home-improvement": "home improvement tools painting",
  "hotel-motel": "hotel room interior",
  "liquor-store": "liquor store wine bottles",
  massage: "massage spa therapy",
  "nail-salon": "nail salon manicure",
  "pet-store": "pet store dog supplies",
  pharmacy: "pharmacy medicine shelves",
};

let manifest = {};
try {
  manifest = JSON.parse(await readFile(outPath, "utf8"));
} catch {
  /* first run */
}

const missing = Object.keys(QUERIES).filter((slug) => !manifest[slug]);
console.log(`${Object.keys(manifest).length} cached · ${missing.length} to fetch`);
if (missing.length === 0) {
  console.log("Manifest complete — no API calls needed.");
  process.exit(0);
}

let fetched = 0;
for (const slug of missing) {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", QUERIES[slug]);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });

  if (res.status === 403) {
    console.warn(`\nRate limit reached after ${fetched}. Progress saved — rerun in an hour.`);
    break;
  }
  if (!res.ok) {
    console.warn(`  ${slug}: HTTP ${res.status} — skipped`);
    continue;
  }

  const body = await res.json();
  const photo = body.results?.[0];
  if (!photo) {
    console.warn(`  ${slug}: no results for "${QUERIES[slug]}"`);
    continue;
  }

  manifest[slug] = {
    id: photo.id,
    // The raw URL takes Imgix params, so one stored URL serves every size we need.
    raw: photo.urls.raw,
    blurHash: photo.blur_hash ?? null,
    color: photo.color ?? "#1F2937",
    alt: photo.alt_description ?? QUERIES[slug],
    credit: {
      name: photo.user.name,
      username: photo.user.username,
      link: photo.user.links.html,
    },
  };

  fetched++;
  const remaining = res.headers.get("x-ratelimit-remaining");
  process.stdout.write(`\r  ${fetched}/${missing.length} fetched (quota left: ${remaining})   `);
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nWrote ${Object.keys(manifest).length} images to src/data/images.json`);
