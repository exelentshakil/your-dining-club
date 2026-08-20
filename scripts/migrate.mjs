#!/usr/bin/env node
/**
 * Applies db/migrations/*.sql in filename order, once each, then makes sure the
 * redemption partitions for the current month and the next three exist.
 *
 * Partition pre-creation matters: the first write of a new month must not be the
 * thing that discovers the partition is missing.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const applied = new Set(
  (await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name)
);

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`· ${file} (already applied)`);
    continue;
  }
  const sql = await readFile(join(migrationsDir, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`✓ ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`✗ ${file}\n${err.message}`);
    process.exit(1);
  }
}

for (let i = 0; i < 4; i++) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + i, 1);
  const month = d.toISOString().slice(0, 10);
  await client.query("SELECT ensure_redemption_partition($1::date)", [month]);
  console.log(`✓ partition for ${month.slice(0, 7)}`);
}

await client.end();
console.log("Migrations complete.");
