CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "otp_codes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phone" varchar(40) NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "used" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_otp_phone" ON "otp_codes" ("phone");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" varchar;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_method" text DEFAULT 'otp' NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_unique" ON "users" ("phone") WHERE "phone" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_unique" ON "users" ("google_id") WHERE "google_id" IS NOT NULL;
