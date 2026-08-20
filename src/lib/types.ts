export type OfferKind = "bogo" | "percent" | "fixed";

export type Restaurant = {
  id: number;
  slug: string;
  name: string;
  /** One of the eight YDC restaurant partner categories (see src/data/categories.ts). */
  category: string;
  cuisine: string;
  blurb: string;
  address: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  priceBand: number;
  offerKind: OfferKind;
  offerValue: number;
  offerTerms: string;
  avgSaveCents: number;
  rating: number;
  popularity: number;
  /** Metres from the search origin. Only present on radius queries. */
  distanceM?: number;
};

export type RestaurantQuery = {
  q?: string;
  city?: string;
  category?: string;
  cuisine?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit: number;
  /** Opaque keyset cursor from the previous page. */
  cursor?: string;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

export type Redemption = {
  id: string;
  restaurantId: number;
  restaurantName: string;
  restaurantSlug: string;
  city: string;
  code: string;
  partySize: number;
  savedCents: number;
  createdAt: string;
};

export type MemberSummary = {
  memberId: string;
  email: string;
  name: string | null;
  status: "active" | "trialing" | "past_due" | "canceled" | "none";
  currentPeriodEnd: string | null;
  monthRedemptions: number;
  monthSavedCents: number;
  lifetimeSavedCents: number;
};
