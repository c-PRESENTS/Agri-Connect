CREATE TABLE IF NOT EXISTS geocoding_cache (
  cache_key text PRIMARY KEY,
  query text NOT NULL,
  canonical_label text NOT NULL,
  country_code varchar(2),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  provider varchar(40) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS geocoding_cache_expiry_idx ON geocoding_cache(expires_at);

UPDATE users AS u
SET latitude = seed.latitude,
    longitude = seed.longitude
FROM (
  SELECT DISTINCT ON (farmer_id)
    farmer_id,
    (product_data->>'farmerLatitude')::double precision AS latitude,
    (product_data->>'farmerLongitude')::double precision AS longitude
  FROM commerce_products
  WHERE product_data ? 'farmerLatitude'
    AND product_data ? 'farmerLongitude'
  ORDER BY farmer_id, created_at
) AS seed
WHERE u.id=seed.farmer_id
  AND (u.latitude IS NULL OR u.longitude IS NULL);

CREATE TABLE IF NOT EXISTS local_needs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id varchar REFERENCES users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity double precision NOT NULL CHECK (quantity > 0),
  unit varchar(40) NOT NULL DEFAULT 'kg',
  price_range text NOT NULL DEFAULT 'Negotiable',
  location text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  urgency varchar(20) NOT NULL DEFAULT 'medium'
    CHECK (urgency IN ('high', 'medium', 'low')),
  buyer_name text NOT NULL,
  buyer_type varchar(30) NOT NULL DEFAULT 'individual'
    CHECK (buyer_type IN ('restaurant', 'retailer', 'individual', 'processor', 'school', 'hospital')),
  description text,
  deadline date,
  category varchar(80),
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS local_needs_active_created_idx ON local_needs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS local_needs_buyer_idx ON local_needs(buyer_id, status);

INSERT INTO local_needs
  (id, product_name, quantity, unit, price_range, location, latitude, longitude,
   urgency, buyer_name, buyer_type, description, deadline, category, status, created_at)
VALUES
  ('need-1', 'Organic Tomatoes', 500, 'kg', '£1.50-2.00/kg', 'Oxford Market', 51.752, -1.2577, 'high', 'The Organic Kitchen', 'restaurant', 'Need fresh organic tomatoes for weekly menu. Must be Grade A.', '2026-03-20', 'vegetables', 'active', now() - interval '2 hours'),
  ('need-2', 'Free Range Eggs', 2000, 'units', '£0.25-0.35/unit', 'Bristol Central', 51.4545, -2.5879, 'high', 'Sunrise Café Chain', 'restaurant', 'Weekly supply needed for 8 café locations across Bristol.', '2026-03-18', 'dairy', 'active', now() - interval '5 hours'),
  ('need-3', 'Heritage Apples', 300, 'kg', '£1.20-1.80/kg', 'Exeter Food Hub', 50.7184, -3.5339, 'medium', 'West Country Juicers', 'processor', 'Seeking heritage apple varieties for artisan juice production.', '2026-04-01', 'fruits', 'active', now() - interval '1 day'),
  ('need-4', 'Kale & Spinach Mix', 150, 'kg', '£2.00-3.00/kg', 'Cambridge', 52.2053, 0.1218, 'medium', 'FreshBox Delivery', 'retailer', 'Weekly subscription delivery box requirement.', '2026-03-22', 'vegetables', 'active', now() - interval '1 day'),
  ('need-5', 'Raw Honey', 50, 'kg', '£8-12/kg', 'Norwich', 52.6309, 1.2974, 'low', 'Norfolk Naturals', 'retailer', 'Seeking local raw honey for premium gift hampers.', '2026-04-15', 'specialty', 'active', now() - interval '2 days'),
  ('need-6', 'Potatoes (White)', 2000, 'kg', '£0.30-0.50/kg', 'Leeds', 53.8008, -1.5491, 'high', 'Northern Schools Catering', 'school', 'School meals program. Annual contract possible.', '2026-03-25', 'vegetables', 'active', now() - interval '3 hours'),
  ('need-7', 'Fresh Herbs Bundle', 80, 'kg', '£4-6/kg', 'Manchester', 53.4808, -2.2426, 'medium', 'Piccadilly Hotel', 'restaurant', 'Rosemary, thyme, basil, mint weekly supply needed.', '2026-03-21', 'herbs', 'active', now() - interval '6 hours'),
  ('need-8', 'Organic Milk', 1000, 'liter', '£0.80-1.10/liter', 'Sheffield', 53.3811, -1.4701, 'high', 'City Hospital Trust', 'hospital', 'Hospital patient nutrition program. Certified organic required.', '2026-03-19', 'dairy', 'active', now() - interval '8 hours'),
  ('need-9', 'Sweet Peppers', 200, 'kg', '£1.80-2.50/kg', 'Chelmsford', 51.7356, 0.4685, 'high', 'Chelmsford Food Market', 'retailer', 'Mixed colour peppers for weekend farmers market. Must be fresh picked.', '2026-03-20', 'vegetables', 'active', now() - interval '1 hour'),
  ('need-10', 'Strawberries', 100, 'kg', '£3.00-4.50/kg', 'Chelmsford', 51.7412, 0.4821, 'high', 'The Baking House Chelmsford', 'restaurant', 'Fresh strawberries for desserts and cakes. Minimum 30g fruit size.', '2026-03-19', 'fruits', 'active', now() - interval '3 hours'),
  ('need-11', 'Free Range Chicken', 80, 'units', '£8-12/unit', 'Chelmsford', 51.729, 0.458, 'medium', 'Springfield Hotel & Spa', 'restaurant', 'Whole free range chickens for hotel restaurant. Weekly recurring order.', '2026-03-22', 'meat', 'active', now() - interval '5 hours'),
  ('need-12', 'Salad Leaves Mix', 50, 'kg', '£4-6/kg', 'Chelmsford', 51.7443, 0.4733, 'medium', 'Great Baddow Community Hub', 'school', 'Mixed salad for school lunch program. Rocket, spinach, watercress.', '2026-03-21', 'vegetables', 'active', now() - interval '2 hours'),
  ('need-13', 'Courgettes', 120, 'kg', '£1.20-1.80/kg', 'Chelmsford', 51.732, 0.492, 'low', 'Moulsham Street Deli', 'retailer', 'Local courgettes for deli. Prefer mixed yellow and green varieties.', '2026-03-25', 'vegetables', 'active', now() - interval '4 hours')
ON CONFLICT (id) DO NOTHING;
