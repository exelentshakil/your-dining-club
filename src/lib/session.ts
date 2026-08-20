import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";
import { ENTITLEMENT_HINT_COOKIE, SESSION_COOKIE } from "./cookie-names";

export { SESSION_COOKIE, ENTITLEMENT_HINT_COOKIE } from "./cookie-names";
const MAX_AGE_S = 60 * 60 * 24 * 30;

export type Entitlement = "active" | "trialing" | "past_due" | "canceled" | "none";

export type Session = {
  /** member id */
  sub: string;
  email: string;
  name: string | null;
  /** Entitlement snapshot. Carried in the cookie so the hot path never asks the
   *  database "is this person still a member?" on every single request. */
  ent: Entitlement;
  /** Entitlement version. A change in Stripe bumps members.entitlement_ver and
   *  the mismatch forces exactly one refresh — the cheap half of stale-token
   *  invalidation without a session table. */
  ev: number;
  exp: number;
};

function b64(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", env.sessionSecret).update(payloadB64).digest("base64url");
}

export function sealSession(session: Omit<Session, "exp"> & { exp?: number }): string {
  const full: Session = { ...session, exp: session.exp ?? Math.floor(Date.now() / 1000) + MAX_AGE_S };
  const payload = b64(JSON.stringify(full));
  return `${payload}.${signPayload(payload)}`;
}

export function openSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;

  const expected = Buffer.from(signPayload(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (typeof parsed.exp !== "number" || parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return openSession(jar.get(SESSION_COOKIE)?.value);
}

export async function writeSession(session: Omit<Session, "exp">): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sealSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  jar.set(ENTITLEMENT_HINT_COOKIE, session.ent, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ENTITLEMENT_HINT_COOKIE);
}

export function isMember(session: Session | null): boolean {
  return session?.ent === "active" || session?.ent === "trialing";
}
