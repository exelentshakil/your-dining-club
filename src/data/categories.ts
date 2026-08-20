/**
 * The two category sets the club sells against.
 *
 * `imageSlug` keys into src/data/images.json, which holds a real photograph
 * fetched once from the Unsplash API — see scripts/fetch-images.mjs.
 */
export type Category = {
  slug: string;
  name: string;
  tagline: string;
  imageSlug: string;
};

/** Restaurant types — where the 5th-item-free offer applies. */
export const RESTAURANT_CATEGORIES: Category[] = [
  { slug: "sit-down", name: "Sit Down", tagline: "Fine & casual dining", imageSlug: "sit-down" },
  { slug: "fast-food", name: "Fast Food", tagline: "Quick & tasty meals", imageSlug: "fast-food" },
  { slug: "pizza", name: "Pizza", tagline: "Fresh woodfired pizza", imageSlug: "pizza" },
  { slug: "coffee-shops", name: "Coffee Shops", tagline: "Artisanal brews & café", imageSlug: "coffee-shops" },
  { slug: "breakfast-diners", name: "Breakfast Diners", tagline: "Pancakes & classic diners", imageSlug: "breakfast-diners" },
  { slug: "donut-shops", name: "Donut Shops", tagline: "Sweet donuts & pastries", imageSlug: "donut-shops" },
  { slug: "bar-lounge", name: "Bar / Lounge", tagline: "Cocktails & small bites", imageSlug: "bar-lounge" },
  { slug: "food-truck", name: "Food Truck", tagline: "Street food favorites", imageSlug: "food-truck" },
];

/** Everything else a member can save on. */
export const BUSINESS_CATEGORIES: Category[] = [
  { slug: "amusement-park", name: "Amusement Park", tagline: "Parks & attractions", imageSlug: "amusement-park" },
  { slug: "auto-dealership", name: "Auto Dealership", tagline: "Car purchases & offers", imageSlug: "auto-dealership" },
  { slug: "bakery", name: "Bakery", tagline: "Fresh bread & pastries", imageSlug: "bakery" },
  { slug: "beauty-hair-salon", name: "Beauty / Hair Salon", tagline: "Haircuts & styling", imageSlug: "beauty-hair-salon" },
  { slug: "book-store", name: "Book Store", tagline: "Books & magazines", imageSlug: "book-store" },
  { slug: "bowling-alley", name: "Bowling Alley", tagline: "Bowling & entertainment", imageSlug: "bowling-alley" },
  { slug: "butcher", name: "Butcher", tagline: "Quality meats & cuts", imageSlug: "butcher" },
  { slug: "car-mechanic", name: "Car Mechanic", tagline: "Repairs & oil changes", imageSlug: "car-mechanic" },
  { slug: "car-wash-detail", name: "Car Wash / Detail", tagline: "Cleaning & detailing", imageSlug: "car-wash-detail" },
  { slug: "chiropractic", name: "Chiropractic", tagline: "Adjustments & wellness", imageSlug: "chiropractic" },
  { slug: "compound-pharmacy", name: "Compound Pharmacy", tagline: "Specialty prescriptions", imageSlug: "compound-pharmacy" },
  { slug: "deli", name: "Deli", tagline: "Sandwiches & cheeses", imageSlug: "deli" },
  { slug: "dental", name: "Dental", tagline: "Checkups & teeth cleaning", imageSlug: "dental" },
  { slug: "dietary-support", name: "Dietary Support", tagline: "Nutrition & vitamins", imageSlug: "dietary-support" },
  { slug: "dispensary", name: "Dispensary", tagline: "Medicinal & CBD products", imageSlug: "dispensary" },
  { slug: "dry-cleaner", name: "Dry Cleaner", tagline: "Garment care & pressing", imageSlug: "dry-cleaner" },
  { slug: "electronics-phone", name: "Electronics / Phone", tagline: "Devices & tech support", imageSlug: "electronics-phone" },
  { slug: "family-entertainment", name: "Family Ent Centers", tagline: "Games & family arcades", imageSlug: "family-entertainment" },
  { slug: "florist", name: "Florist", tagline: "Arrangements & flowers", imageSlug: "florist" },
  { slug: "furniture-store", name: "Furniture Store", tagline: "Sofas, tables & decor", imageSlug: "furniture-store" },
  { slug: "gas-station", name: "Gas Stations", tagline: "Fuel & conveniences", imageSlug: "gas-station" },
  { slug: "golf-course", name: "Golf Course", tagline: "Tee times & greens", imageSlug: "golf-course" },
  { slug: "golf-miniature", name: "Golf – Miniature", tagline: "Family mini-golf", imageSlug: "golf-miniature" },
  { slug: "grocery-store", name: "Grocery Store", tagline: "Food & daily supplies", imageSlug: "grocery-store" },
  { slug: "gym", name: "Gym", tagline: "Fitness & workout equipment", imageSlug: "gym" },
  { slug: "home-improvement", name: "Home Improvement", tagline: "Tools, painting & building", imageSlug: "home-improvement" },
  { slug: "hotel-motel", name: "Hotel / Motel", tagline: "Accommodations & stays", imageSlug: "hotel-motel" },
  { slug: "liquor-store", name: "Liquor Store", tagline: "Wine, spirits & beers", imageSlug: "liquor-store" },
  { slug: "massage", name: "Massage", tagline: "Spas & deep tissue massage", imageSlug: "massage" },
  { slug: "nail-salon", name: "Nail Salon", tagline: "Manicures & pedicures", imageSlug: "nail-salon" },
  { slug: "pet-store", name: "Pet Store", tagline: "Pet grooming & supplies", imageSlug: "pet-store" },
  { slug: "pharmacy", name: "Pharmacy", tagline: "Medicines & wellness care", imageSlug: "pharmacy" },
];

export const ALL_CATEGORIES = [...RESTAURANT_CATEGORIES, ...BUSINESS_CATEGORIES];

export function categoryBySlug(slug: string): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.slug === slug);
}
