CREATE INDEX IF NOT EXISTS payment_attempts_status_updated_idx
  ON payment_attempts(payment_status,updated_at);
CREATE INDEX IF NOT EXISTS provider_webhook_status_idx
  ON provider_webhook_events(provider,processing_status,received_at);
CREATE INDEX IF NOT EXISTS payment_refunds_order_created_idx
  ON payment_refunds(order_id,created_at);
CREATE INDEX IF NOT EXISTS payment_refunds_status_updated_idx
  ON payment_refunds(status,updated_at);
CREATE INDEX IF NOT EXISTS protected_allocations_seller_status_idx
  ON protected_allocations(seller_id,status,created_at);
CREATE INDEX IF NOT EXISTS seller_transfers_status_updated_idx
  ON seller_transfers(status,updated_at);
CREATE INDEX IF NOT EXISTS payment_disputes_status_created_idx
  ON payment_disputes(status,created_at);
CREATE INDEX IF NOT EXISTS operator_recovery_status_created_idx
  ON operator_recovery_cases(status,created_at);
