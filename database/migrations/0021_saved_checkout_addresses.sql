CREATE TABLE IF NOT EXISTS user_addresses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label varchar(60) NOT NULL,
  encrypted_payload text NOT NULL,
  encryption_key_version integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_addresses_user_updated_idx
  ON user_addresses(user_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_default_idx
  ON user_addresses(user_id)
  WHERE is_default = true;

