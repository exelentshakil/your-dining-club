import type { OfferKind, Restaurant } from "./types";

/**
 * Deterministic demo catalogue.
 *
 * With no DATABASE_URL attached the app serves this instead, so the product can
 * be run and reviewed end to end without infrastructure. It is generated from a
 * fixed seed, so the same slug always resolves to the same restaurant across
 * reloads and across machines. Production reads the identical shapes from
 * Postgres — see src/lib/data/restaurants.ts.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CITIES: Array<{ city: string; region: string; lat: number; lng: number }> = [
  { city: "New York", region: "NY", lat: 40.7128, lng: -74.006 },
  { city: "Brooklyn", region: "NY", lat: 40.6782, lng: -73.9442 },
  { city: "Los Angeles", region: "CA", lat: 34.0522, lng: -118.2437 },
  { city: "San Francisco", region: "CA", lat: 37.7749, lng: -122.4194 },
  { city: "Chicago", region: "IL", lat: 41.8781, lng: -87.6298 },
  { city: "Houston", region: "TX", lat: 29.7604, lng: -95.3698 },
  { city: "Austin", region: "TX", lat: 30.2672, lng: -97.7431 },
  { city: "Miami", region: "FL", lat: 25.7617, lng: -80.1918 },
  { city: "Seattle", region: "WA", lat: 47.6062, lng: -122.3321 },
  { city: "Denver", region: "CO", lat: 39.7392, lng: -104.9903 },
  { city: "Boston", region: "MA", lat: 42.3601, lng: -71.0589 },
  { city: "Atlanta", region: "GA", lat: 33.749, lng: -84.388 },
  { city: "Philadelphia", region: "PA", lat: 39.9526, lng: -75.1652 },
  { city: "Phoenix", region: "AZ", lat: 33.4484, lng: -112.074 },
  { city: "Nashville", region: "TN", lat: 36.1627, lng: -86.7816 },
  { city: "Portland", region: "OR", lat: 45.5152, lng: -122.6784 },
];

/** The eight YDC restaurant partner categories, weighted the way a real market
 *  looks — mostly sit-down and quick service, fewer food trucks. */
const CATEGORY_WEIGHTS: Array<[string, number]> = [
  ["sit-down", 30],
  ["fast-food", 18],
  ["pizza", 14],
  ["coffee-shops", 12],
  ["breakfast-diners", 9],
  ["bar-lounge", 8],
  ["donut-shops", 5],
  ["food-truck", 4],
];
const CATEGORY_TOTAL = CATEGORY_WEIGHTS.reduce((n, [, w]) => n + w, 0);

function pickCategory(roll: number): string {
  let acc = 0;
  const target = roll * CATEGORY_TOTAL;
  for (const [slug, weight] of CATEGORY_WEIGHTS) {
    acc += weight;
    if (target < acc) return slug;
  }
  return CATEGORY_WEIGHTS[0][0];
}

const CUISINES = [
  "Italian", "Japanese", "Mexican", "Thai", "Indian", "Steakhouse",
  "Mediterranean", "Vietnamese", "French", "Korean", "Seafood", "American",
  "Greek", "Spanish", "Caribbean", "Barbecue",
];

const FIRST = [
  "The Copper", "Little", "Golden", "Ember &", "Saffron", "Blue", "Wild",
  "The Salted", "Harvest", "Nomad", "Lantern", "The Gilded", "Olive &",
  "Marble", "Cedar", "Juniper", "The Velvet", "Smoke &", "Pearl", "Iron",
];

const SECOND = [
  "Spoon", "Table", "Fig", "Oak", "Kitchen", "Room", "House", "Larder",
  "Social", "Yard", "Bistro", "Cellar", "Grill", "Provisions", "Parlour",
  "Supper Club", "Counter", "Rooms", "Public House", "Canteen",
];

const STREETS = [
  "Market St", "Union Ave", "Hawthorne Blvd", "Cedar Ln", "Birch St",
  "Grand Ave", "Mill Rd", "Harbour Way", "Quarry St", "Aspen Ct",
];

const OFFER_MIX: Array<{ kind: OfferKind; value: number; terms: string }> = [
  { kind: "bogo", value: 0, terms: "Buy one main, get one free. Two guests, dine-in, any day." },
  { kind: "percent", value: 25, terms: "25% off the total bill, up to 4 guests, excludes alcohol." },
  { kind: "percent", value: 20, terms: "20% off the total bill, dine-in or takeaway." },
  { kind: "fixed", value: 3000, terms: "$30 off any bill over $80. One per table." },
  { kind: "bogo", value: 0, terms: "Buy one main, get one free. Sunday to Thursday." },
];

function slugify(name: string, city: string, id: number): string {
  const base = `${name} ${city}`
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${id}`;
}

let cache: Restaurant[] | null = null;

/** ~2,400 restaurants — enough rows that pagination and filtering are real. */
export function demoRestaurants(): Restaurant[] {
  if (cache) return cache;
  const rand = mulberry32(20260820);
  const out: Restaurant[] = [];

  for (let i = 0; i < 2400; i++) {
    const id = i + 1;
    const place = CITIES[Math.floor(rand() * CITIES.length)];
    const cuisine = CUISINES[Math.floor(rand() * CUISINES.length)];
    const category = pickCategory(rand());
    const name = `${FIRST[Math.floor(rand() * FIRST.length)]} ${SECOND[Math.floor(rand() * SECOND.length)]}`;
    const offer = OFFER_MIX[Math.floor(rand() * OFFER_MIX.length)];
    // Scatter within roughly 12km of the city centre.
    const lat = place.lat + (rand() - 0.5) * 0.22;
    const lng = place.lng + (rand() - 0.5) * 0.26;

    out.push({
      id,
      slug: slugify(name, place.city, id),
      name,
      category,
      cuisine,
      blurb: `${cuisine} cooking in ${place.city}, run by people who care more about the food than the fit-out.`,
      address: `${10 + Math.floor(rand() * 240)} ${STREETS[Math.floor(rand() * STREETS.length)]}`,
      city: place.city,
      region: place.region,
      lat,
      lng,
      priceBand: 1 + Math.floor(rand() * 4),
      offerKind: offer.kind,
      offerValue: offer.value,
      offerTerms: offer.terms,
      avgSaveCents: 1800 + Math.floor(rand() * 4600),
      rating: Math.round((3.8 + rand() * 1.2) * 10) / 10,
      popularity: Math.floor(rand() * 100000),
    });
  }

  cache = out;
  return out;
}

export function demoCities(): Array<{ city: string; region: string; count: number }> {
  const counts = new Map<string, { city: string; region: string; count: number }>();
  for (const r of demoRestaurants()) {
    const key = `${r.city}|${r.region}`;
    const hit = counts.get(key);
    if (hit) hit.count++;
    else counts.set(key, { city: r.city, region: r.region, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}
