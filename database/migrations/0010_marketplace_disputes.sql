ALTER TABLE payment_disputes
  ADD COLUMN IF NOT EXISTS response_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_case_id varchar(255),
  ADD COLUMN IF NOT EXISTS provider_case_status varchar(60);

ALTER TABLE dispute_evidence
  ADD COLUMN IF NOT EXISTS evidence_data jsonb,
  ADD COLUMN IF NOT EXISTS content_hash varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS payment_disputes_active_allocation_idx
  ON payment_disputes(allocation_id)
  WHERE allocation_id IS NOT NULL
    AND status IN ('open','under_review','resolution_pending','needs_action');

CREATE TABLE IF NOT EXISTS provider_chargebacks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_attempt_id varchar NOT NULL REFERENCES payment_attempts(id),
  provider varchar(20) NOT NULL,
  provider_case_id varchar(255) NOT NULL,
  status varchar(60) NOT NULL,
  reason varchar(120),
  amount_minor bigint NOT NULL CHECK(amount_minor > 0),
  currency varchar(3) NOT NULL CHECK(currency IN ('GBP','INR')),
  evidence_due_at timestamptz,
  provider_data jsonb,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,provider_case_id)
);
