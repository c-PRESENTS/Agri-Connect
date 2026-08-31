-- Migration 0041: move all development catalogue ownership to one real seller.
--
-- The development catalogue previously used farmer-1 through farmer-10 and
-- catalog_seed users. Product/order IDs are preserved; only seller ownership
-- and seller snapshots are normalised.

CREATE TEMP TABLE _canonical_catalog_owner ON COMMIT DROP AS
SELECT id
FROM users
WHERE lower(email) = lower('harsh.gavand.tech@gmail.com');

DO $$
BEGIN
  IF (SELECT count(*) FROM _canonical_catalog_owner) <> 1 THEN
    RAISE EXCEPTION 'Migration 0041 requires exactly one user with email harsh.gavand.tech@gmail.com';
  END IF;
END $$;

CREATE TEMP TABLE _legacy_catalog_sellers (
  id varchar PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO _legacy_catalog_sellers (id) VALUES
  ('farmer-1'), ('farmer-2'), ('farmer-3'), ('farmer-4'), ('farmer-5'),
  ('farmer-6'), ('farmer-7'), ('farmer-8'), ('farmer-9'), ('farmer-10'),
  ('user-highland-estates'), ('user-cotswold-dairy'),
  ('user-somerset-orchards'), ('user-yorkshire-grains'),
  ('user-kent-berries'), ('user-devon-pasture')
ON CONFLICT (id) DO NOTHING;

INSERT INTO _legacy_catalog_sellers (id)
SELECT u.id
FROM users u
WHERE u.auth_method = 'catalog_seed'
  AND u.id <> (SELECT id FROM _canonical_catalog_owner)
ON CONFLICT (id) DO NOTHING;

-- Make the canonical account an active seller. Catalogue product ratings are
-- not seller reviews, so do not manufacture seller reputation from them.
UPDATE users target
SET role = 'farmer',
    seller_enabled = true,
    is_verified = true,
    profile_complete = true,
    account_status = 'active',
    name = COALESCE(NULLIF(target.name, ''), NULLIF(concat_ws(' ', target.first_name, target.last_name), ''), target.email),
    rating = 0,
    review_count = 0,
    updated_at = now()
WHERE target.id = (SELECT id FROM _canonical_catalog_owner);

-- The regional-marketplace tables may exist without their reference rows on
-- development databases created through schema push. Seed the canonical Mumbai
-- hierarchy idempotently.
INSERT INTO market_regions
  (id, parent_id, code, name, country_code, type, latitude, longitude, boundary_data, data_version, active)
VALUES
  ('00000000-0000-4000-8000-000000000020', NULL, 'IN', 'India', 'IN', 'country', 22.3511148, 78.6677428, '{}'::jsonb, '2026-08', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  data_version = EXCLUDED.data_version,
  active = true,
  updated_at = now();

INSERT INTO market_regions
  (id, parent_id, code, name, country_code, type, latitude, longitude, boundary_data, data_version, active)
VALUES
  ('00000000-0000-4000-8000-000000000023',
   (SELECT id FROM market_regions WHERE code = 'IN'),
   'IN-MH', 'Maharashtra', 'IN', 'state', 18.9068356, 75.6741579, '{}'::jsonb, '2026-08', true)
ON CONFLICT (code) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  data_version = EXCLUDED.data_version,
  active = true,
  updated_at = now();

INSERT INTO market_regions
  (id, parent_id, code, name, country_code, type, latitude, longitude, boundary_data, data_version, active)
VALUES
  ('00000000-0000-4000-8000-000000000024',
   (SELECT id FROM market_regions WHERE code = 'IN-MH'),
   'IN-MH-MUM', 'Mumbai', 'IN', 'city', 19.076, 72.8777, '{}'::jsonb, '2026-08', true)
ON CONFLICT (code) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  data_version = EXCLUDED.data_version,
  active = true,
  updated_at = now();

INSERT INTO seller_business_profiles
  (seller_id, country, entity_type, legal_name, trading_name, registered_address,
   operating_address, primary_activities, contact_email, contact_phone)
SELECT
  u.id,
  'IN',
  'individual',
  COALESCE(NULLIF(u.name, ''), NULLIF(concat_ws(' ', u.first_name, u.last_name), ''), u.email),
  COALESCE(NULLIF(u.name, ''), NULLIF(concat_ws(' ', u.first_name, u.last_name), ''), u.email),
  jsonb_build_object('city', 'Mumbai', 'state', 'Maharashtra', 'country', 'IN', 'display', COALESCE(u.location, 'Mumbai, India')),
  jsonb_build_object('city', 'Mumbai', 'state', 'Maharashtra', 'country', 'IN', 'display', COALESCE(u.location, 'Mumbai, India')),
  '["agricultural_marketplace","catalogue_sales"]'::jsonb,
  u.email,
  COALESCE(NULLIF(u.phone, ''), 'Not provided')
FROM users u
WHERE u.id = (SELECT id FROM _canonical_catalog_owner)
ON CONFLICT (seller_id) DO UPDATE SET
  country = EXCLUDED.country,
  legal_name = EXCLUDED.legal_name,
  trading_name = EXCLUDED.trading_name,
  registered_address = EXCLUDED.registered_address,
  operating_address = EXCLUDED.operating_address,
  primary_activities = EXCLUDED.primary_activities,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  updated_at = now();

INSERT INTO seller_verification_cases
  (seller_id, status, country, entity_type, requirements_version, provider,
   submitted_at, reviewed_at, review_reason, expires_at)
SELECT
  id, 'verified', 'IN', 'individual', 'mvp-development-v1', 'manual',
  now(), now(), 'Canonical development catalogue seller', NULL
FROM _canonical_catalog_owner
ON CONFLICT (seller_id) DO UPDATE SET
  status = 'verified',
  country = 'IN',
  entity_type = 'individual',
  requirements_version = 'mvp-development-v1',
  provider = 'manual',
  reviewed_at = now(),
  review_reason = 'Canonical development catalogue seller',
  expires_at = NULL,
  updated_at = now();

INSERT INTO seller_region_assignments
  (seller_id, organisation_id, region_id, status, can_publish, can_fulfil,
   approved_at, effective_at, reason)
SELECT
  owner.id, NULL, region.id, 'active', true, true,
  now(), now(), 'Canonical Mumbai development catalogue seller'
FROM _canonical_catalog_owner owner
JOIN market_regions region ON region.code = 'IN-MH-MUM'
ON CONFLICT (seller_id, region_id) DO UPDATE SET
  status = 'active',
  can_publish = true,
  can_fulfil = true,
  approved_at = now(),
  effective_at = now(),
  expires_at = NULL,
  reason = 'Canonical Mumbai development catalogue seller',
  updated_at = now();

-- Preserve every product ID and product detail while replacing relational and
-- embedded seller ownership. Existing products already owned by the canonical
-- seller are normalised to the same Mumbai assignment as well.
UPDATE commerce_products p
SET farmer_id = owner.id,
    region_id = region.id,
    product_data = p.product_data || jsonb_build_object(
      'farmerId', owner.id,
      'farmerName', COALESCE(NULLIF(u.name, ''), NULLIF(concat_ws(' ', u.first_name, u.last_name), ''), u.email),
      'farmerAvatar', COALESCE(u.avatar, u.profile_image_url, ''),
      'farmerLocation', COALESCE(u.location, ''),
      'farmerLatitude', COALESCE(u.latitude, 0),
      'farmerLongitude', COALESCE(u.longitude, 0),
      'farmerRating', COALESCE(u.rating, 0),
      'farmerIsOnline', COALESCE(u.is_online, false),
      'farmerIsVerified', true,
      'regionId', region.id
    ),
    updated_at = now()
FROM _canonical_catalog_owner owner
JOIN users u ON u.id = owner.id
JOIN market_regions region ON region.code = 'IN-MH-MUM'
WHERE p.farmer_id = owner.id
   OR p.farmer_id IN (SELECT id FROM _legacy_catalog_sellers)
   OR p.product_data->>'farmerId' IN (SELECT id FROM _legacy_catalog_sellers);

CREATE TEMP TABLE _affected_catalog_orders ON COMMIT DROP AS
SELECT DISTINCT oi.order_id
FROM commerce_order_items oi
WHERE oi.seller_id IN (SELECT id FROM _legacy_catalog_sellers)
   OR oi.item_data->>'farmerId' IN (SELECT id FROM _legacy_catalog_sellers);

UPDATE commerce_order_items oi
SET seller_id = owner.id,
    item_data = oi.item_data || jsonb_build_object(
      'farmerId', owner.id,
      'farmerName', COALESCE(NULLIF(u.name, ''), NULLIF(concat_ws(' ', u.first_name, u.last_name), ''), u.email)
    )
FROM _canonical_catalog_owner owner
JOIN users u ON u.id = owner.id
WHERE oi.seller_id IN (SELECT id FROM _legacy_catalog_sellers)
   OR oi.item_data->>'farmerId' IN (SELECT id FROM _legacy_catalog_sellers);

UPDATE commerce_orders o
SET order_data = jsonb_set(
  o.order_data,
  '{items}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN item->>'farmerId' IN (SELECT id FROM _legacy_catalog_sellers)
          THEN item || jsonb_build_object('farmerId', owner.id, 'farmerName', owner_name.name)
        ELSE item
      END
      ORDER BY ordinal
    )
    FROM jsonb_array_elements(COALESCE(o.order_data->'items', '[]'::jsonb)) WITH ORDINALITY AS entries(item, ordinal)
  ), '[]'::jsonb),
  true
)
FROM _canonical_catalog_owner owner
CROSS JOIN LATERAL (
  SELECT COALESCE(NULLIF(u.name, ''), NULLIF(concat_ws(' ', u.first_name, u.last_name), ''), u.email) AS name
  FROM users u WHERE u.id = owner.id
) owner_name
WHERE o.id IN (SELECT order_id FROM _affected_catalog_orders);

UPDATE commerce_orders o
SET order_data = jsonb_set(
  o.order_data,
  '{shippingChoices}',
  jsonb_build_object(
    owner.id,
    COALESCE(
      o.order_data->'shippingChoices'->owner.id,
      (SELECT choice FROM jsonb_each(o.order_data->'shippingChoices') AS choices(seller_id, choice)
       WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers)
       ORDER BY seller_id LIMIT 1)
    )
  ),
  true
)
FROM _canonical_catalog_owner owner
WHERE o.id IN (SELECT order_id FROM _affected_catalog_orders)
  AND jsonb_typeof(o.order_data->'shippingChoices') = 'object'
  AND EXISTS (
    SELECT 1 FROM jsonb_each(o.order_data->'shippingChoices') AS choices(seller_id, choice)
    WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers)
  );

-- Checkout quotes are development snapshots, but keeping their seller list
-- canonical makes payment and cash-order retries consistent with migrated orders.
UPDATE checkout_quotes q
SET quote_data = jsonb_set(
  q.quote_data,
  '{items}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN item->>'farmerId' IN (SELECT id FROM _legacy_catalog_sellers)
          THEN item || jsonb_build_object('farmerId', owner.id, 'farmerName', owner_name.name)
        ELSE item
      END
      ORDER BY ordinal
    )
    FROM jsonb_array_elements(COALESCE(q.quote_data->'items', '[]'::jsonb)) WITH ORDINALITY AS entries(item, ordinal)
  ), '[]'::jsonb),
  true
)
FROM _canonical_catalog_owner owner
CROSS JOIN LATERAL (
  SELECT COALESCE(NULLIF(u.name, ''), NULLIF(concat_ws(' ', u.first_name, u.last_name), ''), u.email) AS name
  FROM users u WHERE u.id = owner.id
) owner_name
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(q.quote_data->'items', '[]'::jsonb)) item
  WHERE item->>'farmerId' IN (SELECT id FROM _legacy_catalog_sellers)
);

UPDATE checkout_quotes q
SET quote_data = jsonb_set(q.quote_data, '{sellerIds}', jsonb_build_array(owner.id), true)
FROM _canonical_catalog_owner owner
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements_text(COALESCE(q.quote_data->'sellerIds', '[]'::jsonb)) seller_id
  WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers)
);

UPDATE checkout_quotes q
SET quote_data = jsonb_set(
  q.quote_data,
  '{shippingChoices}',
  jsonb_build_object(
    owner.id,
    COALESCE(
      q.quote_data->'shippingChoices'->owner.id,
      (SELECT choice FROM jsonb_each(q.quote_data->'shippingChoices') AS choices(seller_id, choice)
       WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers)
       ORDER BY seller_id LIMIT 1)
    )
  ),
  true
)
FROM _canonical_catalog_owner owner
WHERE jsonb_typeof(q.quote_data->'shippingChoices') = 'object'
  AND EXISTS (
    SELECT 1 FROM jsonb_each(q.quote_data->'shippingChoices') AS choices(seller_id, choice)
    WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers)
  );

-- Merge any development conversations that would collide after all sellers
-- become one seller. Self-conversations are invalid and are removed.
DELETE FROM marketplace_conversations c
USING _canonical_catalog_owner owner
WHERE c.buyer_id = owner.id
  AND c.seller_id IN (SELECT id FROM _legacy_catalog_sellers);

CREATE TEMP TABLE _catalog_conversation_survivors ON COMMIT DROP AS
SELECT
  c.product_id,
  c.buyer_id,
  (array_agg(c.id ORDER BY (c.seller_id = owner.id) DESC, c.created_at, c.id))[1] AS survivor_id
FROM marketplace_conversations c
CROSS JOIN _canonical_catalog_owner owner
WHERE c.seller_id = owner.id
   OR c.seller_id IN (SELECT id FROM _legacy_catalog_sellers)
GROUP BY c.product_id, c.buyer_id
HAVING bool_or(c.seller_id IN (SELECT id FROM _legacy_catalog_sellers));

UPDATE marketplace_conversation_messages m
SET conversation_id = survivors.survivor_id
FROM marketplace_conversations c
JOIN _catalog_conversation_survivors survivors
  ON survivors.product_id = c.product_id AND survivors.buyer_id = c.buyer_id
WHERE m.conversation_id = c.id
  AND c.id <> survivors.survivor_id;

DELETE FROM marketplace_conversations c
USING _catalog_conversation_survivors survivors
WHERE c.product_id = survivors.product_id
  AND c.buyer_id = survivors.buyer_id
  AND c.id <> survivors.survivor_id;

UPDATE marketplace_conversations c
SET seller_id = owner.id,
    updated_at = now()
FROM _catalog_conversation_survivors survivors
CROSS JOIN _canonical_catalog_owner owner
WHERE c.id = survivors.survivor_id;

UPDATE marketplace_conversation_messages m
SET sender_id = owner.id
FROM _canonical_catalog_owner owner
WHERE m.sender_id IN (SELECT id FROM _legacy_catalog_sellers);

-- Consolidate test allocations per order because the payment schema permits
-- one allocation per (order, seller). Provider transfer rows for fake sellers
-- are development-only and are discarded before the merge.
CREATE TEMP TABLE _catalog_allocation_rollup ON COMMIT DROP AS
SELECT
  pa.order_id,
  (array_agg(pa.payment_attempt_id ORDER BY pa.updated_at DESC, pa.id))[1] AS payment_attempt_id,
  (array_agg(pa.currency ORDER BY pa.updated_at DESC, pa.id))[1] AS currency,
  sum(pa.gross_minor)::bigint AS gross_minor,
  sum(pa.platform_fee_minor)::bigint AS platform_fee_minor,
  sum(pa.seller_net_minor)::bigint AS seller_net_minor,
  sum(pa.refunded_minor)::bigint AS refunded_minor,
  (array_agg(pa.status ORDER BY pa.updated_at DESC, pa.id))[1] AS status,
  max(pa.delivery_verified_at) AS delivery_verified_at,
  max(pa.release_due_at) AS release_due_at,
  max(pa.version) AS version,
  min(pa.created_at) AS created_at,
  max(pa.updated_at) AS updated_at
FROM protected_allocations pa
WHERE pa.seller_id IN (SELECT id FROM _legacy_catalog_sellers)
GROUP BY pa.order_id;

DELETE FROM seller_transfers st
USING protected_allocations pa
WHERE st.allocation_id = pa.id
  AND pa.seller_id IN (SELECT id FROM _legacy_catalog_sellers);

UPDATE payment_disputes pd
SET allocation_id = NULL,
    updated_at = now()
FROM protected_allocations pa
WHERE pd.allocation_id = pa.id
  AND pa.seller_id IN (SELECT id FROM _legacy_catalog_sellers);

DELETE FROM protected_allocations
WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers);

INSERT INTO protected_allocations
  (order_id, payment_attempt_id, seller_id, currency, gross_minor,
   platform_fee_minor, seller_net_minor, refunded_minor, status,
   delivery_verified_at, release_due_at, version, created_at, updated_at)
SELECT
  rollup.order_id,
  rollup.payment_attempt_id,
  owner.id,
  rollup.currency,
  rollup.gross_minor,
  rollup.platform_fee_minor,
  rollup.seller_net_minor,
  rollup.refunded_minor,
  rollup.status,
  rollup.delivery_verified_at,
  rollup.release_due_at,
  rollup.version,
  rollup.created_at,
  rollup.updated_at
FROM _catalog_allocation_rollup rollup
CROSS JOIN _canonical_catalog_owner owner
ON CONFLICT (order_id, seller_id) DO UPDATE SET
  gross_minor = protected_allocations.gross_minor + EXCLUDED.gross_minor,
  platform_fee_minor = protected_allocations.platform_fee_minor + EXCLUDED.platform_fee_minor,
  seller_net_minor = protected_allocations.seller_net_minor + EXCLUDED.seller_net_minor,
  refunded_minor = protected_allocations.refunded_minor + EXCLUDED.refunded_minor,
  status = EXCLUDED.status,
  delivery_verified_at = COALESCE(EXCLUDED.delivery_verified_at, protected_allocations.delivery_verified_at),
  release_due_at = COALESCE(EXCLUDED.release_due_at, protected_allocations.release_due_at),
  version = GREATEST(protected_allocations.version, EXCLUDED.version),
  updated_at = now();

INSERT INTO seller_cash_preferences
  (seller_id, accepts_cash_at_pickup, accepts_cash_on_farmer_delivery)
SELECT
  owner.id,
  bool_or(pref.accepts_cash_at_pickup),
  bool_or(pref.accepts_cash_on_farmer_delivery)
FROM seller_cash_preferences pref
CROSS JOIN _canonical_catalog_owner owner
WHERE pref.seller_id IN (SELECT id FROM _legacy_catalog_sellers)
GROUP BY owner.id
ON CONFLICT (seller_id) DO UPDATE SET
  accepts_cash_at_pickup = seller_cash_preferences.accepts_cash_at_pickup OR EXCLUDED.accepts_cash_at_pickup,
  accepts_cash_on_farmer_delivery = seller_cash_preferences.accepts_cash_on_farmer_delivery OR EXCLUDED.accepts_cash_on_farmer_delivery,
  updated_at = now();

-- Fake provider account identifiers must not be attached to a real identity.
DELETE FROM seller_payment_accounts
WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers);

UPDATE regional_product_opportunities
SET claimed_by = (SELECT id FROM _canonical_catalog_owner),
    updated_at = now()
WHERE claimed_by IN (SELECT id FROM _legacy_catalog_sellers);

UPDATE marketplace_notifications
SET user_id = (SELECT id FROM _canonical_catalog_owner)
WHERE user_id IN (SELECT id FROM _legacy_catalog_sellers);

UPDATE admin_audit_events
SET target_id = (SELECT id FROM _canonical_catalog_owner)
WHERE target_id IN (SELECT id FROM _legacy_catalog_sellers);

-- Earlier admin screens could write demonstration audit rows while being
-- viewed. Those rows are not real operational history and must not survive.
DELETE FROM admin_audit_events
WHERE id IN ('ae-seed-001','ae-seed-002','ae-seed-003','ae-seed-004','ae-seed-005','ae-seed-006');

DO $$
DECLARE
  legacy_id varchar;
  owner_id varchar;
BEGIN
  SELECT id INTO owner_id FROM _canonical_catalog_owner;
  FOR legacy_id IN SELECT id FROM _legacy_catalog_sellers LOOP
    UPDATE admin_audit_events
    SET changes = replace(changes::text, to_jsonb(legacy_id)::text, to_jsonb(owner_id)::text)::jsonb,
        metadata = replace(metadata::text, to_jsonb(legacy_id)::text, to_jsonb(owner_id)::text)::jsonb
    WHERE changes::text LIKE '%' || to_jsonb(legacy_id)::text || '%'
       OR metadata::text LIKE '%' || to_jsonb(legacy_id)::text || '%';
  END LOOP;
END $$;

-- Remove fake identity-owned verification and regional data, then remove the
-- identities themselves. Remaining FK children use their declared cascade or
-- set-null behaviour.
DELETE FROM seller_region_assignments
WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers);

DELETE FROM users
WHERE id IN (SELECT id FROM _legacy_catalog_sellers);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM commerce_products WHERE farmer_id IN (SELECT id FROM _legacy_catalog_sellers)) THEN
    RAISE EXCEPTION 'Migration 0041 left catalogue products assigned to legacy sellers';
  END IF;
  IF EXISTS (SELECT 1 FROM commerce_order_items WHERE seller_id IN (SELECT id FROM _legacy_catalog_sellers)) THEN
    RAISE EXCEPTION 'Migration 0041 left order items assigned to legacy sellers';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE id IN (SELECT id FROM _legacy_catalog_sellers)) THEN
    RAISE EXCEPTION 'Migration 0041 left legacy catalogue users in place';
  END IF;
  IF EXISTS (SELECT 1 FROM checkout_quotes WHERE quote_data::text ~ '"farmer-(10|[1-9])"') THEN
    RAISE EXCEPTION 'Migration 0041 left legacy catalogue sellers in checkout quotes';
  END IF;
  IF EXISTS (
    SELECT 1 FROM admin_audit_events
    WHERE target_id IN (SELECT id FROM _legacy_catalog_sellers)
       OR EXISTS (
         SELECT 1 FROM _legacy_catalog_sellers legacy
         WHERE admin_audit_events.changes::text LIKE '%' || to_jsonb(legacy.id)::text || '%'
            OR admin_audit_events.metadata::text LIKE '%' || to_jsonb(legacy.id)::text || '%'
       )
  ) THEN
    RAISE EXCEPTION 'Migration 0041 left legacy catalogue sellers in admin audit data';
  END IF;
END $$;
