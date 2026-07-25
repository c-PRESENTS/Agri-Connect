ALTER TABLE protected_allocations
  ADD COLUMN IF NOT EXISTS refunded_minor bigint NOT NULL DEFAULT 0
  CHECK (refunded_minor >= 0);

ALTER TABLE seller_transfers
  ADD COLUMN IF NOT EXISTS reversed_minor bigint NOT NULL DEFAULT 0
  CHECK (reversed_minor >= 0),
  ADD COLUMN IF NOT EXISTS provider_reversal_id varchar(255);
