CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar UNIQUE,
  "password_hash" text,
  "first_name" varchar,
  "last_name" varchar,
  "profile_image_url" varchar,
  "role" text DEFAULT 'buyer' NOT NULL,
  "name" text,
  "phone" text,
  "avatar" text,
  "location" text,
  "latitude" real,
  "longitude" real,
  "rating" real DEFAULT 0,
  "review_count" integer DEFAULT 0,
  "is_online" boolean DEFAULT false,
  "is_verified" boolean DEFAULT false,
  "profile_complete" boolean DEFAULT false,
  "preferred_language" text,
  "preferred_currency" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
