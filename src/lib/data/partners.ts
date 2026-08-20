import { randomUUID } from "node:crypto";
import { sql } from "../db";
import { hasDatabase } from "../env";
import { MAX_PARTNERS_PER_CATEGORY_PER_MARKET } from "../business-model";

export type PartnerApplication = {
  businessName: string;
  businessType: string;
  categorySlug: string | null;
  contactEmail: string;
  contactPhone: string | null;
  city: string;
  region: string;
  postalCode: string | null;
  locations: number | null;
  avgTicketCents: number | null;
  payload: Record<string, unknown>;
};

type Stored = PartnerApplication & { id: string; status: string; createdAt: string };

const g = globalThis as unknown as { ydcPartnerApps?: Stored[] };
const store = () => (g.ydcPartnerApps ??= []);

export type SubmitResult =
  | { status: "received"; id: string; slotsLeft: number }
  | { status: "duplicate"; id: string }
  | { status: "category_full"; slotsLeft: 0 };

/**
 * Records an application.
 *
 * Category exclusivity is checked before the insert so the applicant is told
 * immediately when their category is already taken in their market — that is the
 * scarcity the sales pitch rests on, and it has to be true.
 */
export async function submitApplication(app: PartnerApplication): Promise<SubmitResult> {
  if (!hasDatabase) {
    const rows = store();
    const existing = rows.find(
      (r) => r.contactEmail === app.contactEmail && ["new", "reviewing"].includes(r.status)
    );
    if (existing) return { status: "duplicate", id: existing.id };

    const taken = rows.filter(
      (r) =>
        r.categorySlug === app.categorySlug &&
        r.city === app.city &&
        r.region === app.region &&
        ["approved", "reviewing"].includes(r.status)
    ).length;
    if (app.categorySlug && taken >= MAX_PARTNERS_PER_CATEGORY_PER_MARKET) {
      return { status: "category_full", slotsLeft: 0 };
    }

    const row: Stored = {
      ...app,
      id: randomUUID(),
      status: "new",
      createdAt: new Date().toISOString(),
    };
    rows.unshift(row);
    return {
      status: "received",
      id: row.id,
      slotsLeft: Math.max(0, MAX_PARTNERS_PER_CATEGORY_PER_MARKET - taken - 1),
    };
  }

  if (app.categorySlug) {
    const taken = await sql<{ count: string }>(
      `SELECT count(*)::text AS count FROM partner_applications
        WHERE region = $1 AND city = $2 AND category_slug = $3
          AND status IN ('approved', 'reviewing')`,
      [app.region, app.city, app.categorySlug]
    );
    if (Number(taken[0]?.count ?? 0) >= MAX_PARTNERS_PER_CATEGORY_PER_MARKET) {
      return { status: "category_full", slotsLeft: 0 };
    }
  }

  // The partial unique index on contact_email makes a resubmission a no-op
  // rather than a second row in the sales queue.
  const rows = await sql<{ id: string }>(
    `INSERT INTO partner_applications
       (business_name, business_type, category_slug, contact_email, contact_phone,
        city, region, postal_code, locations, avg_ticket_cents, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      app.businessName, app.businessType, app.categorySlug, app.contactEmail,
      app.contactPhone, app.city, app.region, app.postalCode, app.locations,
      app.avgTicketCents, JSON.stringify(app.payload),
    ]
  );

  if (!rows[0]) {
    const existing = await sql<{ id: string }>(
      `SELECT id FROM partner_applications
        WHERE contact_email = $1 AND status IN ('new','reviewing') LIMIT 1`,
      [app.contactEmail]
    );
    return { status: "duplicate", id: existing[0]?.id ?? "" };
  }

  return { status: "received", id: rows[0].id, slotsLeft: MAX_PARTNERS_PER_CATEGORY_PER_MARKET - 1 };
}

export async function applicationCount(): Promise<number> {
  if (!hasDatabase) return store().length;
  const rows = await sql<{ count: string }>(
    `SELECT count(*)::text AS count FROM partner_applications`
  );
  return Number(rows[0]?.count ?? 0);
}
