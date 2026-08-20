import { randomBytes } from "node:crypto";

/**
 * Referral codes are shown to humans and typed by humans, so the alphabet drops
 * the characters people confuse (0/O, 1/I/L) rather than relying on them getting
 * it right.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newReferralCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function normalizeCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== 8) return null;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

/** Partner codes are issued by the operator, so validation is shape-only here. */
export function normalizePartnerCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
  return cleaned.length >= 4 ? cleaned : null;
}

export function referralLink(siteUrl: string, code: string): string {
  return `${siteUrl.replace(/\/$/, "")}/join?ref=${encodeURIComponent(code)}`;
}
