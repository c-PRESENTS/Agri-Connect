CREATE TABLE IF NOT EXISTS commerce_products (
  id varchar PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'GBP' CHECK (currency IN ('GBP', 'INR')),
  unit varchar(40) NOT NULL,
  stock integer NOT NULL CHECK (stock >= 0),
  category_id varchar NOT NULL,
  subcategory_id varchar NOT NULL,
  farmer_id varchar NOT NULL,
  product_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_products_category_idx ON commerce_products(category_id, subcategory_id);
CREATE INDEX IF NOT EXISTS commerce_products_farmer_idx ON commerce_products(farmer_id);

CREATE TABLE IF NOT EXISTS commerce_carts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_carts_user_idx ON commerce_carts(user_id);

CREATE TABLE IF NOT EXISTS commerce_cart_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id varchar NOT NULL REFERENCES commerce_carts(id) ON DELETE CASCADE,
  product_id varchar NOT NULL REFERENCES commerce_products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_minor bigint CHECK (unit_price_minor >= 0),
  purchase_mode varchar(20) CHECK (purchase_mode IS NULL OR purchase_mode IN ('one-time', 'subscribe')),
  sub_frequency varchar(20) CHECK (sub_frequency IS NULL OR sub_frequency IN ('weekly', 'biweekly', 'monthly')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_cart_product_idx ON commerce_cart_items(cart_id, product_id);

CREATE TABLE IF NOT EXISTS commerce_orders (
  id varchar PRIMARY KEY,
  order_number varchar(40) NOT NULL UNIQUE,
  buyer_id varchar NOT NULL REFERENCES users(id),
  status varchar(40) NOT NULL,
  payment_method varchar(30) NOT NULL,
  payment_status varchar(30) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'GBP' CHECK (currency IN ('GBP', 'INR')),
  subtotal_minor bigint NOT NULL CHECK (subtotal_minor >= 0),
  tax_minor bigint NOT NULL CHECK (tax_minor >= 0),
  delivery_fee_minor bigint NOT NULL CHECK (delivery_fee_minor >= 0),
  shipping_total_minor bigint NOT NULL CHECK (shipping_total_minor >= 0),
  total_minor bigint NOT NULL CHECK (total_minor >= 0),
  order_data jsonb NOT NULL,
  stock_restored boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_orders_buyer_idx ON commerce_orders(buyer_id, created_at);
CREATE INDEX IF NOT EXISTS commerce_orders_status_idx ON commerce_orders(status);

CREATE TABLE IF NOT EXISTS commerce_order_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  product_id varchar NOT NULL,
  seller_id varchar NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  currency varchar(3) NOT NULL CHECK (currency IN ('GBP', 'INR')),
  item_data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS commerce_order_items_order_idx ON commerce_order_items(order_id);
CREATE INDEX IF NOT EXISTS commerce_order_items_seller_idx ON commerce_order_items(seller_id);

CREATE TABLE IF NOT EXISTS commerce_order_status_history (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  status varchar(40) NOT NULL,
  note text,
  occurred_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS commerce_order_history_idx ON commerce_order_status_history(order_id, occurred_at);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar REFERENCES commerce_orders(id) ON DELETE CASCADE,
  product_id varchar NOT NULL REFERENCES commerce_products(id),
  buyer_id varchar NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  status varchar(30) NOT NULL CHECK (status IN ('active', 'consumed', 'released', 'expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_reservations_product_idx ON inventory_reservations(product_id, status);
CREATE INDEX IF NOT EXISTS inventory_reservations_expiry_idx ON inventory_reservations(status, expires_at);
