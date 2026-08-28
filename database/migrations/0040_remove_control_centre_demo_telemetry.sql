-- Remove Organisation Control Centre demo telemetry while preserving records
-- created through real user, commerce, and administrator workflows.

DELETE FROM users
WHERE id IN (
  'log-agrifreight-01',
  'log-midlands-02',
  'log-cotswolds-03',
  'log-yorkshire-04',
  'log-highlands-05',
  'log-severn-06'
);

-- The legacy order seeder inserted only these exact identifiers. Do not remove
-- an order if a payment/settlement workflow has subsequently attached to it.
DELETE FROM commerce_orders o
WHERE o.id IN (
  'ord-highland-001',
  'ord-cotswold-002',
  'ord-yorkshire-003',
  'ord-somerset-004',
  'ord-wessex-005',
  'ord-fens-006'
)
AND NOT EXISTS (SELECT 1 FROM payment_attempts pa WHERE pa.order_id=o.id)
AND NOT EXISTS (SELECT 1 FROM protected_allocations allocation WHERE allocation.order_id=o.id)
AND NOT EXISTS (SELECT 1 FROM payment_disputes dispute WHERE dispute.order_id=o.id)
AND NOT EXISTS (SELECT 1 FROM cash_checkout_requests cash_request WHERE cash_request.order_id=o.id);

-- Reverse the legacy region seeder's arbitrary product-to-region assignment
-- before removing its eight known regional records.
UPDATE commerce_products
SET region_id = NULL
WHERE region_id IN (
  'reg-highlands',
  'reg-cotswolds',
  'reg-yorkshire',
  'reg-east-anglia',
  'reg-somerset',
  'reg-kent',
  'reg-northumberland',
  'reg-cornwall'
);

DELETE FROM market_regions
WHERE id IN (
  'reg-highlands',
  'reg-cotswolds',
  'reg-yorkshire',
  'reg-east-anglia',
  'reg-somerset',
  'reg-kent',
  'reg-northumberland',
  'reg-cornwall'
);

-- Runtime-seeded settings have no accountable administrator. Any setting that
-- an administrator has saved has updated_by populated and is preserved.
DELETE FROM organisation_settings
WHERE updated_by IS NULL
  AND setting_key IN (
    'trading_engine_enabled',
    'vat_engine_active',
    'ai_matchmaker_active',
    'escrow_inspection_hours',
    'commission_rate_bps',
    'default_flat_shipping_minor',
    'session_lease_hours',
    'cold_chain_max_temp_celsius',
    'max_login_attempts_window_minutes',
    'password_max_age_days'
  );
