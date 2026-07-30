CREATE TABLE IF NOT EXISTS seller_cash_preferences (
  seller_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  accepts_cash_at_pickup boolean NOT NULL DEFAULT false,
  accepts_cash_on_farmer_delivery boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_checkout_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id varchar NOT NULL REFERENCES users(id),
  idempotency_key varchar(160) NOT NULL,
  quote_id varchar NOT NULL REFERENCES checkout_quotes(id),
  order_id varchar REFERENCES commerce_orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_checkout_buyer_key_unique UNIQUE (buyer_id, idempotency_key)
);
