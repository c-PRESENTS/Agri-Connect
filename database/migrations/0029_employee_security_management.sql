-- Phase 6: staff access, invitation/token lookup, MFA and safe session management.
-- Forward-only and idempotent; the authoritative Week 1 identity/RBAC tables are reused.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS organisation_invitations_expiry_idx
  ON organisation_invitations (expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organisation_invitations_active_email_unique
  ON organisation_invitations (organisation_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS account_email_verification_expiry_idx
  ON account_email_verification_tokens (expires_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS account_password_reset_expiry_idx
  ON account_password_reset_tokens (expires_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS account_mfa_recovery_unused_idx
  ON account_mfa_recovery_codes (user_id, created_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS account_mfa_enabled_idx
  ON account_mfa_credentials (user_id)
  WHERE enabled_at IS NOT NULL AND disabled_at IS NULL;

CREATE INDEX IF NOT EXISTS sessions_user_expiry_idx
  ON sessions ((sess ->> 'userId'), expire);

CREATE INDEX IF NOT EXISTS account_login_events_user_outcome_idx
  ON account_login_events (user_id, outcome, occurred_at DESC);
