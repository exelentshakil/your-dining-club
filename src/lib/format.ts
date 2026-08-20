export function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(abs % 100 === 0 ? 0 : 2)}`;
}

export function offerLabel(kind: string, value: number): string {
  if (kind === "percent") return `${value}% off`;
  if (kind === "fixed") return `${money(value)} off`;
  return "2-for-1 mains";
}

export function distanceLabel(metres?: number): string | null {
  if (metres == null) return null;
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export function priceLabel(band: number): string {
  return "$".repeat(Math.max(1, Math.min(4, band)));
}
