ALTER TABLE commerce_products
  ADD COLUMN IF NOT EXISTS moderation_status varchar(30) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by varchar REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderation_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_fresh_pick boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commerce_products_moderation_status_check'
  ) THEN
    ALTER TABLE commerce_products
      ADD CONSTRAINT commerce_products_moderation_status_check
      CHECK (moderation_status IN (
        'draft', 'pending_review', 'approved', 'rejected',
        'changes_requested', 'suspended', 'removed'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commerce_products_moderation_version_check'
  ) THEN
    ALTER TABLE commerce_products
      ADD CONSTRAINT commerce_products_moderation_version_check
      CHECK (moderation_version > 0);
  END IF;
END $$;

UPDATE commerce_products
SET moderation_status = CASE
      WHEN COALESCE(product_data->>'publicationStatus', 'published') = 'suspended' THEN 'suspended'
      WHEN COALESCE(product_data->>'publicationStatus', 'published') = 'draft' THEN 'draft'
      ELSE 'approved'
    END,
    is_featured = COALESCE((product_data->>'isFeatured')::boolean, false),
    reviewed_at = CASE
      WHEN COALESCE(product_data->>'publicationStatus', 'published') <> 'draft'
        THEN COALESCE(reviewed_at, updated_at, created_at)
      ELSE reviewed_at
    END,
    product_data = jsonb_set(
      jsonb_set(
        product_data,
        '{moderationStatus}',
        to_jsonb(CASE
          WHEN COALESCE(product_data->>'publicationStatus', 'published') = 'suspended' THEN 'suspended'
          WHEN COALESCE(product_data->>'publicationStatus', 'published') = 'draft' THEN 'draft'
          ELSE 'approved'
        END::text),
        true
      ),
      '{publicationStatus}',
      to_jsonb(CASE
        WHEN COALESCE(product_data->>'publicationStatus', 'published') = 'suspended' THEN 'suspended'
        WHEN COALESCE(product_data->>'publicationStatus', 'published') = 'draft' THEN 'draft'
        ELSE 'published'
      END::text),
      true
    )
WHERE product_data->>'moderationStatus' IS NULL;

CREATE TABLE IF NOT EXISTS product_moderation_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id varchar NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
  actor_id varchar REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(40) NOT NULL,
  from_status varchar(30),
  to_status varchar(30),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_moderation_events_status_check CHECK (
    (from_status IS NULL OR from_status IN ('draft','pending_review','approved','rejected','changes_requested','suspended','removed'))
    AND
    (to_status IS NULL OR to_status IN ('draft','pending_review','approved','rejected','changes_requested','suspended','removed'))
  )
);

CREATE INDEX IF NOT EXISTS commerce_products_moderation_queue_idx
  ON commerce_products (moderation_status, updated_at DESC, id);
CREATE INDEX IF NOT EXISTS commerce_products_moderation_category_idx
  ON commerce_products (moderation_status, category_id, subcategory_id);
CREATE INDEX IF NOT EXISTS commerce_products_moderation_seller_idx
  ON commerce_products (moderation_status, farmer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS commerce_products_moderation_region_idx
  ON commerce_products (moderation_status, region_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS commerce_products_featured_idx
  ON commerce_products (moderation_status, is_featured, is_fresh_pick, updated_at DESC);
CREATE INDEX IF NOT EXISTS product_moderation_events_product_idx
  ON product_moderation_events (product_id, created_at DESC);
