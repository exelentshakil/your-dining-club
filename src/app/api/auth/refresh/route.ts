import { NextResponse } from "next/server";
import { getMemberById } from "@/lib/data/members";
import { getSession, writeSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-mints the session cookie from the database.
 *
 * Called only when the entitlement version in the cookie is behind the one in
 * the members row — i.e. once after a Stripe event changed the membership. Every
 * other request keeps reading entitlement straight off the signed cookie.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const member = await getMemberById(session.sub);
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  await writeSession({
    sub: member.id,
    email: member.email,
    name: member.name,
    ent: member.entitlement,
    ev: member.entitlementVer,
  });

  return NextResponse.json({ entitlement: member.entitlement, ev: member.entitlementVer }, {
    headers: { "cache-control": "no-store" },
  });
}
