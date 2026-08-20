-- Restaurants belong to one of the eight YDC partner categories. The browse grid
-- is driven entirely by this column, so it gets its own keyset-shaped index
-- rather than relying on a filter over the city index.
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'sit-down';

CREATE INDEX IF NOT EXISTS restaurants_category_rank_idx
  ON restaurants (category, popularity DESC, id DESC) WHERE is_active;

-- Category + city together is the single most common browse in the app
-- ("pizza near me in Austin"), so it gets the composite it actually needs.
CREATE INDEX IF NOT EXISTS restaurants_category_city_rank_idx
  ON restaurants (category, city, popularity DESC, id DESC) WHERE is_active;
