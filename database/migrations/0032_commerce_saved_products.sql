CREATE TABLE IF NOT EXISTS commerce_saved_products (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id varchar NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS commerce_saved_products_user_product_unique
  ON commerce_saved_products(user_id, product_id);

CREATE INDEX IF NOT EXISTS commerce_saved_products_user_created_idx
  ON commerce_saved_products(user_id, created_at);
