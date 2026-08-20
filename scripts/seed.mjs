#!/usr/bin/env node
/**
 * Seeds the restaurant catalogue.
 *
 *   SEED_RESTAURANTS=80000 npm run db:seed
 *
 * Default 5,000 for a quick local setup; pass the real number to feel what the
 * indexes do. Rows are inserted in 1,000-row multi-value statements — one round
 * trip per batch instead of one per row, which is the difference between a
 * minute and an hour at 80k.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const TOTAL = Number(process.env.SEED_RESTAURANTS ?? 5000);
const BATCH = 1000;

const CITIES = [
  ["New York", "NY", 40.7128, -74.006], ["Brooklyn", "NY", 40.6782, -73.9442],
  ["Los Angeles", "CA", 34.0522, -118.2437], ["San Francisco", "CA", 37.7749, -122.4194],
  ["Chicago", "IL", 41.8781, -87.6298], ["Houston", "TX", 29.7604, -95.3698],
  ["Austin", "TX", 30.2672, -97.7431], ["Miami", "FL", 25.7617, -80.1918],
  ["Seattle", "WA", 47.6062, -122.3321], ["Denver", "CO", 39.7392, -104.9903],
  ["Boston", "MA", 42.3601, -71.0589], ["Atlanta", "GA", 33.749, -84.388],
  ["Philadelphia", "PA", 39.9526, -75.1652], ["Phoenix", "AZ", 33.4484, -112.074],
  ["Nashville", "TN", 36.1627, -86.7816], ["Portland", "OR", 45.5152, -122.6784],
];
const CATEGORY_WEIGHTS = [["sit-down",30],["fast-food",18],["pizza",14],["coffee-shops",12],
  ["breakfast-diners",9],["bar-lounge",8],["donut-shops",5],["food-truck",4]];
const CATEGORY_TOTAL = CATEGORY_WEIGHTS.reduce((n, [, w]) => n + w, 0);
function pickCategory(roll) {
  let acc = 0;
  const target = roll * CATEGORY_TOTAL;
  for (const [slug, weight] of CATEGORY_WEIGHTS) { acc += weight; if (target < acc) return slug; }
  return CATEGORY_WEIGHTS[0][0];
}

const CUISINES = ["Italian", "Japanese", "Mexican", "Thai", "Indian", "Steakhouse",
  "Mediterranean", "Vietnamese", "French", "Korean", "Seafood", "American",
  "Greek", "Spanish", "Caribbean", "Barbecue"];
const FIRST = ["The Copper", "Little", "Golden", "Ember &", "Saffron", "Blue", "Wild",
  "The Salted", "Harvest", "Nomad", "Lantern", "The Gilded", "Olive &", "Marble",
  "Cedar", "Juniper", "The Velvet", "Smoke &", "Pearl", "Iron"];
const SECOND = ["Spoon", "Table", "Fig", "Oak", "Kitchen", "Room", "House", "Larder",
  "Social", "Yard", "Bistro", "Cellar", "Grill", "Provisions", "Parlour",
  "Supper Club", "Counter", "Rooms", "Public House", "Canteen"];
const OFFERS = [
  ["bogo", 0, "Buy one main, get one free. Two guests, dine-in, any day."],
  ["percent", 25, "25% off the total bill, up to 4 guests, excludes alcohol."],
  ["percent", 20, "20% off the total bill, dine-in or takeaway."],
  ["fixed", 3000, "$30 off any bill over $80. One per table."],
  ["bogo", 0, "Buy one main, get one free. Sunday to Thursday."],
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260820);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const client = new pg.Client({ connectionString: url });
await client.connect();

console.log(`Seeding ${TOTAL.toLocaleString()} restaurants…`);
const started = Date.now();

for (let offset = 0; offset < TOTAL; offset += BATCH) {
  const size = Math.min(BATCH, TOTAL - offset);
  const values = [];
  const params = [];

  for (let i = 0; i < size; i++) {
    const id = offset + i + 1;
    const [city, region, clat, clng] = pick(CITIES);
    const cuisine = pick(CUISINES);
    const name = `${pick(FIRST)} ${pick(SECOND)}`;
    const [kind, value, terms] = pick(OFFERS);
    const slug = `${name} ${city}`.toLowerCase().replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + `-${id}`;

    const base = params.length;
    params.push(
      slug, name, pickCategory(rand()), cuisine,
      `${cuisine} cooking in ${city}, run by people who care more about the food than the fit-out.`,
      `${10 + Math.floor(rand() * 240)} Market St`, city, region,
      clat + (rand() - 0.5) * 0.22, clng + (rand() - 0.5) * 0.26,
      1 + Math.floor(rand() * 4), kind, value, terms,
      1800 + Math.floor(rand() * 4600),
      Math.round((3.8 + rand() * 1.2) * 10) / 10,
      Math.floor(rand() * 100000)
    );
    values.push(`(${Array.from({ length: 17 }, (_, k) => `$${base + k + 1}`).join(",")})`);
  }

  await client.query(
    `INSERT INTO restaurants
       (slug, name, category, cuisine, blurb, address, city, region, lat, lng,
        price_band, offer_kind, offer_value, offer_terms, avg_save_cents, rating, popularity)
     VALUES ${values.join(",")}
     ON CONFLICT (slug) DO NOTHING`,
    params
  );

  process.stdout.write(`\r  ${Math.min(offset + size, TOTAL).toLocaleString()} / ${TOTAL.toLocaleString()}`);
}

// The planner needs fresh statistics before any of these indexes get chosen.
process.stdout.write("\n  ANALYZE…\n");
await client.query("ANALYZE restaurants");

await client.end();
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
