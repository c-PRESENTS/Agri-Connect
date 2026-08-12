CREATE TABLE seller_business_profiles (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country varchar(2) NOT NULL,
  entity_type varchar(40) NOT NULL,
  legal_name varchar(200) NOT NULL,
  trading_name varchar(200),
  registration_number varchar(120),
  registered_address jsonb NOT NULL,
  operating_address jsonb NOT NULL,
  primary_activities jsonb NOT NULL DEFAULT '[]',
  website varchar(500),
  contact_email varchar(320) NOT NULL,
  contact_phone varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id)
);

CREATE TABLE seller_verification_cases (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(40) NOT NULL DEFAULT 'not_started',
  country varchar(2) NOT NULL,
  entity_type varchar(40) NOT NULL,
  requirements_version varchar(40) NOT NULL,
  provider varchar(40) NOT NULL DEFAULT 'manual',
  external_case_id varchar(255),
  submitted_at timestamptz,
  reviewed_by varchar REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id)
);
CREATE INDEX seller_verification_cases_queue_idx ON seller_verification_cases(status, submitted_at);

CREATE TABLE seller_tax_identifiers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country varchar(2) NOT NULL,
  type varchar(40) NOT NULL,
  encrypted_value text NOT NULL,
  value_hash varchar(64) NOT NULL,
  masked_value varchar(80) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'pending',
  verification_source varchar(80),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, country, type)
);
CREATE INDEX seller_tax_identifiers_hash_idx ON seller_tax_identifiers(value_hash);

CREATE TABLE seller_associated_persons (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name varchar(200) NOT NULL,
  role varchar(40) NOT NULL,
  ownership_percent real,
  country varchar(2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seller_associated_persons_seller_idx ON seller_associated_persons(seller_id);

CREATE TABLE seller_verification_documents (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id varchar NOT NULL REFERENCES seller_verification_cases(id) ON DELETE CASCADE,
  requirement_code varchar(100) NOT NULL,
  document_type varchar(80) NOT NULL,
  issuing_country varchar(2) NOT NULL,
  original_file_name varchar(255) NOT NULL,
  content_type varchar(100) NOT NULL,
  size_bytes integer,
  storage_key text,
  sha256 varchar(64),
  status varchar(30) NOT NULL DEFAULT 'awaiting_upload',
  rejection_reason text,
  issued_at timestamptz,
  expires_at timestamptz,
  uploaded_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seller_verification_documents_case_idx ON seller_verification_documents(case_id, status);
CREATE INDEX seller_verification_documents_seller_idx ON seller_verification_documents(seller_id, created_at);

CREATE TABLE seller_verification_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id varchar NOT NULL REFERENCES seller_verification_cases(id) ON DELETE CASCADE,
  actor_id varchar REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(80) NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seller_verification_events_case_idx ON seller_verification_events(case_id, created_at);
