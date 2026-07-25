CREATE TABLE checkout_quotes (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), buyer_id varchar NOT NULL REFERENCES users(id),
 currency varchar(3) NOT NULL CHECK(currency IN ('GBP','INR')), subtotal_minor bigint NOT NULL CHECK(subtotal_minor>=0),
 tax_minor bigint NOT NULL CHECK(tax_minor>=0), shipping_minor bigint NOT NULL CHECK(shipping_minor>=0),
 platform_fee_minor bigint NOT NULL CHECK(platform_fee_minor>=0), total_minor bigint NOT NULL CHECK(total_minor>=0),
 cart_fingerprint varchar(128) NOT NULL, quote_data jsonb NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE checkout_intents (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), quote_id varchar NOT NULL REFERENCES checkout_quotes(id),
 order_id varchar REFERENCES commerce_orders(id), buyer_id varchar NOT NULL REFERENCES users(id), provider varchar(20) NOT NULL,
 status varchar(30) NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checkout_intents_buyer_idx ON checkout_intents(buyer_id,created_at);
CREATE TABLE payment_attempts (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), checkout_intent_id varchar REFERENCES checkout_intents(id),
 order_id varchar NOT NULL REFERENCES commerce_orders(id), provider varchar(20) NOT NULL CHECK(provider IN ('stripe','paypal','razorpay','mock')),
 currency varchar(3) NOT NULL CHECK(currency IN ('GBP','INR')), amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 payment_status varchar(30) NOT NULL CHECK(payment_status IN ('created','requires_action','processing','succeeded','failed','cancelled','expired','partially_refunded','refunded','disputed')),
 provider_call_status varchar(30) NOT NULL CHECK(provider_call_status IN ('not_started','queued','started','completed','failed','outcome_unknown')),
 reconciliation_status varchar(30) NOT NULL CHECK(reconciliation_status IN ('not_required','pending','in_progress','resolved','manual_review')),
 idempotency_reference varchar(160) NOT NULL, lease_owner varchar(120), lease_expires_at timestamptz,
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0), provider_payment_id varchar(255), provider_session_id varchar(255),
 request_fingerprint varchar(128) NOT NULL, response_fingerprint varchar(128), failure_code varchar(120),
 version integer NOT NULL DEFAULT 0, provider_called_at timestamptz, provider_persisted_at timestamptz,
 reconciliation_required_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,idempotency_reference), UNIQUE(provider,provider_payment_id)
);
CREATE INDEX payment_attempts_order_idx ON payment_attempts(order_id,created_at);
CREATE INDEX payment_attempts_reconciliation_idx ON payment_attempts(reconciliation_status,lease_expires_at);
CREATE TABLE provider_webhook_events (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), provider varchar(20) NOT NULL, provider_event_id varchar(255) NOT NULL,
 payload_hash varchar(128) NOT NULL, event_type varchar(160) NOT NULL, processing_status varchar(30) NOT NULL,
 normalized_data jsonb, attempt_count integer NOT NULL DEFAULT 0, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
 UNIQUE(provider,provider_event_id)
);
CREATE TABLE api_idempotency_keys (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), actor_id varchar NOT NULL, operation varchar(120) NOT NULL,
 idempotency_key varchar(160) NOT NULL, request_hash varchar(128) NOT NULL, response_status integer, response_body jsonb,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(actor_id,operation,idempotency_key)
);
CREATE TABLE payment_refunds (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), order_id varchar NOT NULL REFERENCES commerce_orders(id),
 payment_attempt_id varchar NOT NULL REFERENCES payment_attempts(id), provider varchar(20) NOT NULL,
 currency varchar(3) NOT NULL CHECK(currency IN ('GBP','INR')), amount_minor bigint NOT NULL CHECK(amount_minor>0),
 status varchar(30) NOT NULL, provider_refund_id varchar(255), idempotency_reference varchar(160) NOT NULL,
 scope_data jsonb, failure_code varchar(120), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,idempotency_reference), UNIQUE(provider,provider_refund_id)
);
