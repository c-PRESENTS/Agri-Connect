ALTER TABLE users
  ADD COLUMN IF NOT EXISTS seller_enabled boolean NOT NULL DEFAULT false;

-- Existing farmer accounts already possess seller capability. Keeping this
-- flag true lets them return to seller mode after temporarily using buyer mode.
UPDATE users
SET seller_enabled = true
WHERE role = 'farmer';
