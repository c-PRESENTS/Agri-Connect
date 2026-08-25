ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status varchar(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS account_status_reason text,
  ADD COLUMN IF NOT EXISTS account_status_updated_at timestamptz;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active','suspended','deactivated'));

CREATE INDEX IF NOT EXISTS users_admin_directory_idx
  ON users(account_status,role,created_at DESC);

CREATE TABLE IF NOT EXISTS admin_user_notes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  classification varchar(30) NOT NULL
    CHECK (classification IN ('general','support','compliance','risk')),
  note_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_user_notes_subject_created_idx
  ON admin_user_notes(subject_user_id,created_at DESC);
