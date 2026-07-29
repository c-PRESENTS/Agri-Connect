CREATE TABLE IF NOT EXISTS exchange_rate_cache (
  cache_key text PRIMARY KEY,
  base_currency varchar(3) NOT NULL,
  rates jsonb NOT NULL,
  provider text NOT NULL,
  provider_updated_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  next_refresh_at timestamptz NOT NULL
);

