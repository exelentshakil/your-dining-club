/**
 * Keyset cursors.
 *
 * OFFSET pagination re-walks every skipped row, so page 500 of a 80k-restaurant
 * city costs 500x page 1. A cursor encodes the last row's sort key instead, and
 * every page is a single index seek. Cursors are opaque to the client but are
 * not secrets — they carry only sort-key values that the row already exposes.
 */
export type Keyset = { rank: number; id: number };

export function encodeCursor(k: Keyset): string {
  return Buffer.from(`${k.rank}:${k.id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | undefined | null): Keyset | null {
  if (!raw) return null;
  try {
    const [rank, id] = Buffer.from(raw, "base64url").toString("utf8").split(":");
    const parsed = { rank: Number(rank), id: Number(id) };
    if (!Number.isFinite(parsed.rank) || !Number.isFinite(parsed.id)) return null;
    return parsed;
  } catch {
    return null;
  }
}
