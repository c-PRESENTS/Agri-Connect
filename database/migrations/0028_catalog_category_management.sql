CREATE TABLE IF NOT EXISTS catalog_categories (
  id varchar(160) PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id varchar(160) NOT NULL,
  parent_id varchar(160) REFERENCES catalog_categories(id) ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  slug varchar(120) NOT NULL,
  icon varchar(80) NOT NULL DEFAULT 'Leaf',
  image_url text,
  buyer_visible boolean NOT NULL DEFAULT true,
  seller_only boolean NOT NULL DEFAULT false,
  status varchar(30) NOT NULL DEFAULT 'draft',
  display_order integer NOT NULL DEFAULT 0,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_data jsonb,
  version integer NOT NULL DEFAULT 1,
  created_by varchar REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by varchar REFERENCES users(id) ON DELETE SET NULL,
  published_by varchar REFERENCES users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_categories_status_check CHECK (status IN ('draft','pending_review','published','archived')),
  CONSTRAINT catalog_categories_version_check CHECK (version > 0),
  CONSTRAINT catalog_categories_parent_check CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT catalog_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_categories_slug_unique ON catalog_categories (slug);
CREATE INDEX IF NOT EXISTS catalog_categories_parent_order_idx ON catalog_categories (parent_id, display_order, id);
CREATE INDEX IF NOT EXISTS catalog_categories_status_order_idx ON catalog_categories (status, display_order, id);
ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS canonical_id varchar(160);
ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS published_data jsonb;
UPDATE catalog_categories SET canonical_id=id WHERE canonical_id IS NULL;
ALTER TABLE catalog_categories ALTER COLUMN canonical_id SET NOT NULL;
UPDATE catalog_categories
SET published_data=jsonb_build_object(
  'parentId',parent_id,'name',name,'icon',icon,'imageUrl',image_url,
  'buyerVisible',buyer_visible,'sellerOnly',seller_only,'displayOrder',display_order,
  'translations',translations,'content',content
)
WHERE status='published' AND published_data IS NULL;
CREATE INDEX IF NOT EXISTS catalog_categories_canonical_idx ON catalog_categories (canonical_id);

CREATE TABLE IF NOT EXISTS catalog_category_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id varchar(160) NOT NULL REFERENCES catalog_categories(id) ON DELETE CASCADE,
  actor_id varchar REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(50) NOT NULL,
  from_status varchar(30),
  to_status varchar(30),
  reason text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_category_events_status_check CHECK (
    (from_status IS NULL OR from_status IN ('draft','pending_review','published','archived')) AND
    (to_status IS NULL OR to_status IN ('draft','pending_review','published','archived'))
  )
);
CREATE INDEX IF NOT EXISTS catalog_category_events_category_idx ON catalog_category_events (category_id, created_at DESC);

CREATE TABLE IF NOT EXISTS catalog_category_versions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id varchar(160) NOT NULL REFERENCES catalog_categories(id) ON DELETE CASCADE,
  version integer NOT NULL,
  lifecycle_status varchar(30) NOT NULL,
  data jsonb NOT NULL,
  created_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_category_versions_status_check CHECK (lifecycle_status IN ('draft','pending_review','published','archived')),
  CONSTRAINT catalog_category_versions_version_check CHECK (version > 0),
  CONSTRAINT catalog_category_versions_category_version_unique UNIQUE(category_id,version)
);

CREATE TABLE IF NOT EXISTS catalog_taxonomy_imports (
  import_key varchar(80) PRIMARY KEY,
  row_count integer NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_catalog_category_cycle() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM catalog_categories WHERE id = NEW.parent_id
      UNION ALL
      SELECT c.id, c.parent_id FROM catalog_categories c JOIN ancestors a ON c.id = a.parent_id
    )
    SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'catalog category hierarchy cannot contain a cycle' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS catalog_categories_prevent_cycle ON catalog_categories;
CREATE TRIGGER catalog_categories_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON catalog_categories
  FOR EACH ROW EXECUTE FUNCTION prevent_catalog_category_cycle();
