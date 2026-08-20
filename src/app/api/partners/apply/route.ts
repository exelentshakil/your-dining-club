import { NextResponse } from "next/server";
import { z } from "zod";
import { submitApplication } from "@/lib/data/partners";
import { check, clientKey, rateHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  decisionMaker: z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    position: z.string().trim().min(1).max(60),
    cellPhone: z.string().trim().min(7).max(24),
  }),
  contact: z.object({
    firstName: z.string().trim().max(60).optional(),
    lastName: z.string().trim().max(60).optional(),
    position: z.string().trim().max(60).optional(),
    cellPhone: z.string().trim().max(24).optional(),
  }),
  businessEmail: z.string().email().max(160),
  businessPhone: z.string().trim().min(7).max(24),
  businessName: z.string().trim().min(1).max(120),
  businessType: z.string().trim().min(1).max(80),
  categorySlug: z.string().trim().max(60).optional(),
  yearsInBusiness: z.coerce.number().int().min(0).max(200).optional(),
  address: z.object({
    street: z.string().trim().min(1).max(160),
    city: z.string().trim().min(1).max(80),
    region: z.string().trim().min(2).max(2),
    postalCode: z.string().trim().min(3).max(12),
  }),
  online: z.object({
    website: z.string().trim().max(200).optional(),
    facebook: z.string().trim().max(200).optional(),
    instagram: z.string().trim().max(200).optional(),
    other: z.string().trim().max(200).optional(),
  }),
  stats: z.object({
    locations: z.coerce.number().int().min(1).max(9999).optional(),
    dailyCustomers: z.coerce.number().int().min(0).max(1000000).optional(),
    posSystem: z.string().trim().max(80).optional(),
    avgTransaction: z.coerce.number().min(0).max(100000).optional(),
    otherAdvertising: z.string().trim().max(160).optional(),
  }),
  pitch: z.string().trim().max(4000).optional(),
});

export async function POST(req: Request) {
  // Applications are a human-speed action; anything faster is a bot.
  const verdict = check(clientKey(req, "partner-apply"), 5, 10 * 60_000);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Too many applications from this connection. Try again shortly." },
      { status: 429, headers: { ...rateHeaders(verdict), "retry-after": "600" } }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const result = await submitApplication({
    businessName: d.businessName,
    businessType: d.businessType,
    categorySlug: d.categorySlug ?? null,
    contactEmail: d.businessEmail.toLowerCase(),
    contactPhone: d.businessPhone,
    city: d.address.city,
    region: d.address.region.toUpperCase(),
    postalCode: d.address.postalCode,
    locations: d.stats.locations ?? null,
    avgTicketCents: d.stats.avgTransaction != null ? Math.round(d.stats.avgTransaction * 100) : null,
    payload: d,
  });

  if (result.status === "category_full") {
    return NextResponse.json(
      {
        error: "category_full",
        message: `Your category is already at capacity in ${d.address.city}. We keep a waitlist — our team will be in touch if a spot opens.`,
      },
      { status: 409, headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
