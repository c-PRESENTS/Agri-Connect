BEGIN;

CREATE TEMP TABLE _share_care_owner ON COMMIT DROP AS
SELECT id,
       COALESCE(
         NULLIF(trim(name), ''),
         NULLIF(trim(concat_ws(' ', first_name, last_name)), ''),
         email
       ) AS display_name,
       location,
       latitude,
       longitude
FROM users
WHERE lower(email)=lower('harsh.gavand.tech@gmail.com');

DO $$
BEGIN
  IF (SELECT count(*) FROM _share_care_owner) <> 1 THEN
    RAISE EXCEPTION 'Migration 0042 requires exactly one user with email harsh.gavand.tech@gmail.com';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _share_care_owner
    WHERE NULLIF(trim(display_name), '') IS NULL
       OR NULLIF(trim(location), '') IS NULL
       OR latitude IS NULL
       OR longitude IS NULL
  ) THEN
    RAISE EXCEPTION 'Migration 0042 requires the canonical donor to have a name, location, latitude, and longitude';
  END IF;
END $$;

CREATE TEMP TABLE _legacy_share_care_listings (id varchar PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _legacy_share_care_listings (id) VALUES
  ('sc-1'), ('sc-2'), ('sc-3'), ('sc-4'), ('sc-5'),
  ('sc-6'), ('sc-7'), ('sc-8'), ('sc-9'), ('sc-10'),
  ('sc-11'), ('sc-12'), ('sc-13'), ('sc-14'), ('sc-15');

-- Preserve each listing ID, item, quantity, status, expiry, and any reservation.
-- Only the invalid seed donor identity and collection coordinates are replaced.
UPDATE share_care_listings listing
SET donor_id=owner.id,
    donor_name=owner.display_name,
    location=owner.location,
    latitude=owner.latitude,
    longitude=owner.longitude,
    updated_at=now()
FROM _share_care_owner owner
WHERE listing.id IN (SELECT id FROM _legacy_share_care_listings);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM share_care_listings listing
    CROSS JOIN _share_care_owner owner
    WHERE listing.id IN (SELECT id FROM _legacy_share_care_listings)
      AND (
        listing.donor_id IS DISTINCT FROM owner.id
        OR listing.donor_name IS DISTINCT FROM owner.display_name
        OR listing.location IS DISTINCT FROM owner.location
        OR listing.latitude IS DISTINCT FROM owner.latitude
        OR listing.longitude IS DISTINCT FROM owner.longitude
      )
  ) THEN
    RAISE EXCEPTION 'Migration 0042 left legacy Share & Care listings disconnected from the canonical donor';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM share_care_listings
    WHERE id IN (SELECT id FROM _legacy_share_care_listings)
      AND donor_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Migration 0042 found legacy Share & Care listings without a database-backed donor';
  END IF;
END $$;

COMMIT;
