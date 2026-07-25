CREATE INDEX IF NOT EXISTS payment_provider_configs_review_idx
  ON payment_provider_configs (status, next_review_at, expires_at);

CREATE INDEX IF NOT EXISTS provider_health_events_review_idx
  ON provider_health_events (provider, trusted, event_type, created_at);

CREATE INDEX IF NOT EXISTS provider_webhook_events_retention_idx
  ON provider_webhook_events (processing_status, received_at);

CREATE INDEX IF NOT EXISTS api_idempotency_keys_expiry_idx
  ON api_idempotency_keys (expires_at);

CREATE INDEX IF NOT EXISTS payment_jobs_retention_idx
  ON payment_jobs (status, updated_at);
