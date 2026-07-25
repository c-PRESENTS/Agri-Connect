CREATE UNIQUE INDEX IF NOT EXISTS seller_transfers_allocation_idx
  ON seller_transfers(allocation_id);

CREATE UNIQUE INDEX IF NOT EXISTS seller_transfers_idempotency_idx
  ON seller_transfers(provider, idempotency_reference);

CREATE UNIQUE INDEX IF NOT EXISTS ledger_transactions_reference_idx
  ON ledger_transactions(reference_type, reference_id);
