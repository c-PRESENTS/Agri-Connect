CREATE TABLE IF NOT EXISTS "student_registry" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "institutional_email" varchar(320) NOT NULL,
  "student_number" varchar(80) NOT NULL,
  "study_level" text NOT NULL CHECK ("study_level" IN ('UG', 'PG', 'PhD')),
  "programme" text NOT NULL,
  "department" text,
  "enrolment_status" text NOT NULL DEFAULT 'active' CHECK ("enrolment_status" IN ('active', 'suspended', 'completed', 'withdrawn', 'expired')),
  "access_expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_registry_email_unique" ON "student_registry" ("institutional_email");
CREATE UNIQUE INDEX IF NOT EXISTS "student_registry_number_unique" ON "student_registry" ("student_number");

CREATE TABLE IF NOT EXISTS "student_entitlements" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "student_registry_id" varchar NOT NULL REFERENCES "student_registry"("id") ON DELETE CASCADE,
  "verified_at" timestamp NOT NULL,
  "verification_method" text NOT NULL DEFAULT 'email_confirmation',
  "last_verified_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_entitlements_user_unique" ON "student_entitlements" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "student_entitlements_registry_unique" ON "student_entitlements" ("student_registry_id");

CREATE TABLE IF NOT EXISTS "student_login_confirmations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "student_registry_id" varchar NOT NULL REFERENCES "student_registry"("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_login_confirmations_token_unique" ON "student_login_confirmations" ("token_hash");
CREATE INDEX IF NOT EXISTS "student_login_confirmations_user_idx" ON "student_login_confirmations" ("user_id");

CREATE TABLE IF NOT EXISTS "student_resources" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "url" text NOT NULL,
  "category" varchar(80) NOT NULL,
  "study_levels" text[] NOT NULL,
  "published" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "student_support_requests" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category" varchar(80) NOT NULL,
  "subject" varchar(200) NOT NULL,
  "description" text NOT NULL,
  "preferred_contact" text NOT NULL CHECK ("preferred_contact" IN ('institutional_email', 'platform')),
  "status" text NOT NULL DEFAULT 'submitted' CHECK ("status" IN ('submitted', 'in_review', 'awaiting_student', 'resolved', 'closed')),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "resolved_at" timestamp
);
CREATE INDEX IF NOT EXISTS "student_support_requests_user_idx" ON "student_support_requests" ("student_user_id");
