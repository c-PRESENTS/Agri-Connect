CREATE TABLE payment_provider_configs (
 provider varchar(20) PRIMARY KEY, mode varchar(20) NOT NULL, status varchar(40) NOT NULL, platform_country varchar(2),
 configuration jsonb NOT NULL DEFAULT '{}', approval_verified_at timestamptz, webhook_verified_at timestamptz,
 next_review_at timestamptz, expires_at timestamptz, suspension_reason text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_provider_capabilities (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), provider varchar(20) NOT NULL REFERENCES payment_provider_configs(provider),
 maximum_sellers_per_checkout integer NOT NULL CHECK(maximum_sellers_per_checkout>0),
 maximum_allocations_per_payment integer NOT NULL CHECK(maximum_allocations_per_payment>0),
 supports_partial_seller_refund boolean NOT NULL, supports_independent_seller_release boolean NOT NULL,
 supports_idempotent_payment_creation boolean NOT NULL, supports_lookup_by_merchant_reference boolean NOT NULL,
 source varchar(40) NOT NULL, source_reference text NOT NULL, verified_at timestamptz NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX provider_capabilities_current_idx ON payment_provider_capabilities(provider,expires_at);
CREATE TABLE payment_jobs (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), job_type varchar(80) NOT NULL, aggregate_id varchar NOT NULL,
 status varchar(30) NOT NULL, payload jsonb NOT NULL, attempt_count integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(), lease_owner varchar(120), lease_expires_at timestamptz,
 last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_jobs_claim_idx ON payment_jobs(status,available_at,lease_expires_at);
CREATE TABLE ledger_transactions (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), reference_type varchar(60) NOT NULL, reference_id varchar NOT NULL,
 currency varchar(3) NOT NULL CHECK(currency IN ('GBP','INR')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ledger_entries (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id varchar NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
 account varchar(80) NOT NULL, direction varchar(10) NOT NULL CHECK(direction IN ('debit','credit')),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), metadata jsonb
);
CREATE TABLE reconciliation_runs (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), provider varchar(20) NOT NULL, status varchar(30) NOT NULL,
 summary jsonb, started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE operator_recovery_cases (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), case_type varchar(80) NOT NULL, aggregate_id varchar NOT NULL,
 status varchar(30) NOT NULL, details jsonb NOT NULL, assigned_to varchar REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE provider_health_events (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), provider varchar(20) NOT NULL, evidence_source varchar(80) NOT NULL,
 trusted boolean NOT NULL, event_type varchar(100) NOT NULL, details jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_balanced_ledger_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE debit_total bigint; credit_total bigint; checked_transaction_id varchar;
BEGIN
 checked_transaction_id := COALESCE(NEW.transaction_id, OLD.transaction_id);
 SELECT COALESCE(sum(amount_minor),0) INTO debit_total FROM ledger_entries WHERE transaction_id=checked_transaction_id AND direction='debit';
 SELECT COALESCE(sum(amount_minor),0) INTO credit_total FROM ledger_entries WHERE transaction_id=checked_transaction_id AND direction='credit';
 IF debit_total <> credit_total THEN RAISE EXCEPTION 'Ledger transaction % is not balanced', checked_transaction_id; END IF;
 RETURN COALESCE(NEW, OLD);
END $$;
CREATE CONSTRAINT TRIGGER ledger_entries_balanced
AFTER INSERT OR UPDATE OR DELETE ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_balanced_ledger_transaction();
