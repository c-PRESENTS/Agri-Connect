CREATE TABLE IF NOT EXISTS logistics_collaboration_interests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  contact_name varchar(120) NOT NULL,
  email varchar(254) NOT NULL,
  phone varchar(40),
  organisation_name varchar(160) NOT NULL,
  collaboration_type varchar(40) NOT NULL,
  region varchar(160) NOT NULL,
  details text,
  status varchar(30) NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT logistics_collaboration_type_check CHECK (
    collaboration_type IN ('carrier', 'cold_chain', 'warehouse', 'last_mile', 'technology', 'other')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS logistics_collaboration_email_type_uidx
  ON logistics_collaboration_interests(email, collaboration_type);
CREATE INDEX IF NOT EXISTS logistics_collaboration_status_created_idx
  ON logistics_collaboration_interests(status, created_at);
CREATE INDEX IF NOT EXISTS logistics_collaboration_user_idx
  ON logistics_collaboration_interests(user_id, updated_at);
