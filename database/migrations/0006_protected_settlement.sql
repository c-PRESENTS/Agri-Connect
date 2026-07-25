CREATE TABLE seller_payment_accounts (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), seller_id varchar NOT NULL REFERENCES users(id), provider varchar(20) NOT NULL,
 provider_account_id varchar(255), status varchar(40) NOT NULL, country varchar(2), currencies jsonb NOT NULL DEFAULT '[]',
 capabilities jsonb NOT NULL DEFAULT '{}', kyc_verified_at timestamptz, last_verified_at timestamptz,
 next_review_at timestamptz, expires_at timestamptz, suspension_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(seller_id,provider)
);
CREATE TABLE protected_allocations (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), order_id varchar NOT NULL REFERENCES commerce_orders(id),
 payment_attempt_id varchar NOT NULL REFERENCES payment_attempts(id), seller_id varchar NOT NULL REFERENCES users(id),
 currency varchar(3) NOT NULL CHECK(currency IN ('GBP','INR')), gross_minor bigint NOT NULL CHECK(gross_minor>=0),
 platform_fee_minor bigint NOT NULL CHECK(platform_fee_minor>=0), seller_net_minor bigint NOT NULL CHECK(seller_net_minor>=0),
 status varchar(40) NOT NULL, delivery_verified_at timestamptz, release_due_at timestamptz, version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,seller_id)
);
CREATE TABLE seller_transfers (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), allocation_id varchar NOT NULL REFERENCES protected_allocations(id),
 provider varchar(20) NOT NULL, currency varchar(3) NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>0),
 status varchar(40) NOT NULL, provider_transfer_id varchar(255), idempotency_reference varchar(160) NOT NULL UNIQUE,
 failure_code varchar(120), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_disputes (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), order_id varchar NOT NULL REFERENCES commerce_orders(id),
 allocation_id varchar REFERENCES protected_allocations(id), opened_by varchar NOT NULL REFERENCES users(id),
 status varchar(40) NOT NULL, reason varchar(120) NOT NULL, resolution_data jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dispute_events (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), dispute_id varchar NOT NULL REFERENCES payment_disputes(id) ON DELETE CASCADE,
 actor_id varchar REFERENCES users(id), event_type varchar(80) NOT NULL, event_data jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dispute_evidence (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), dispute_id varchar NOT NULL REFERENCES payment_disputes(id) ON DELETE CASCADE,
 submitted_by varchar NOT NULL REFERENCES users(id), evidence_type varchar(80) NOT NULL, storage_reference text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
