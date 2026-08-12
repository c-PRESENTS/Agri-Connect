CREATE TABLE market_regions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id varchar REFERENCES market_regions(id) ON DELETE RESTRICT,
  code varchar(120) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  country_code varchar(2) NOT NULL,
  type varchar(30) NOT NULL CHECK (type IN ('country','state','province','district','county','city','locality','zone')),
  latitude double precision,
  longitude double precision,
  boundary_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_version varchar(40) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX market_regions_parent_idx ON market_regions(parent_id,active);
CREATE INDEX market_regions_country_type_idx ON market_regions(country_code,type,active);

CREATE TABLE organisation_region_assignments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id varchar NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  region_id varchar NOT NULL REFERENCES market_regions(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','suspended','expired')),
  can_approve_sellers boolean NOT NULL DEFAULT false,
  can_approve_products boolean NOT NULL DEFAULT false,
  approved_by varchar REFERENCES users(id) ON DELETE SET NULL,
  effective_at timestamptz,
  expires_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id,region_id)
);
CREATE INDEX organisation_region_status_idx ON organisation_region_assignments(region_id,status);

CREATE TABLE seller_region_assignments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation_id varchar REFERENCES organisations(id) ON DELETE SET NULL,
  region_id varchar NOT NULL REFERENCES market_regions(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','suspended','expired')),
  can_publish boolean NOT NULL DEFAULT false,
  can_fulfil boolean NOT NULL DEFAULT false,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by varchar REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  effective_at timestamptz,
  expires_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id,region_id)
);
CREATE INDEX seller_region_status_idx ON seller_region_assignments(region_id,status);
CREATE INDEX seller_region_seller_status_idx ON seller_region_assignments(seller_id,status);

ALTER TABLE commerce_products ADD COLUMN region_id varchar REFERENCES market_regions(id) ON DELETE RESTRICT;
CREATE INDEX commerce_products_region_catalog_idx ON commerce_products(region_id,category_id,subcategory_id);

CREATE OR REPLACE FUNCTION enforce_commerce_product_region() RETURNS trigger AS $$
BEGIN
  IF NEW.region_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM seller_region_assignments sra
    WHERE sra.seller_id=NEW.farmer_id AND sra.region_id=NEW.region_id
      AND sra.status='active' AND sra.can_publish=true
      AND (sra.effective_at IS NULL OR sra.effective_at<=now())
      AND (sra.expires_at IS NULL OR sra.expires_at>now())
  ) THEN
    RAISE EXCEPTION 'Seller is not approved to publish in region %', NEW.region_id USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commerce_product_region_guard
BEFORE INSERT OR UPDATE OF farmer_id,region_id ON commerce_products
FOR EACH ROW EXECUTE FUNCTION enforce_commerce_product_region();

CREATE TABLE regional_catalog_targets (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id varchar NOT NULL REFERENCES market_regions(id) ON DELETE CASCADE,
  product_key varchar(180) NOT NULL,
  product_name varchar(200) NOT NULL,
  category_id varchar(120) NOT NULL,
  subcategory_id varchar(120) NOT NULL,
  minimum_active_listings integer NOT NULL DEFAULT 1 CHECK (minimum_active_listings > 0),
  active boolean NOT NULL DEFAULT true,
  created_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(region_id,product_key)
);
CREATE INDEX regional_catalog_target_active_idx ON regional_catalog_targets(region_id,active);

CREATE TABLE regional_product_opportunities (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id varchar NOT NULL REFERENCES regional_catalog_targets(id) ON DELETE CASCADE,
  region_id varchar NOT NULL REFERENCES market_regions(id) ON DELETE CASCADE,
  product_key varchar(180) NOT NULL,
  product_name varchar(200) NOT NULL,
  category_id varchar(120) NOT NULL,
  subcategory_id varchar(120) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open','claimed','listing_submitted','completed','cancelled','expired')),
  claimed_by varchar REFERENCES users(id) ON DELETE SET NULL,
  claim_expires_at timestamptz,
  listing_id varchar REFERENCES commerce_products(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX regional_opportunity_region_status_idx ON regional_product_opportunities(region_id,status);
CREATE INDEX regional_opportunity_claim_expiry_idx ON regional_product_opportunities(status,claim_expires_at);
CREATE UNIQUE INDEX regional_opportunity_one_live_idx ON regional_product_opportunities(target_id)
  WHERE status IN ('open','claimed','listing_submitted');

CREATE TABLE marketplace_notifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(80) NOT NULL,
  title varchar(180) NOT NULL,
  message text NOT NULL,
  action_url varchar(500),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX marketplace_notifications_user_idx ON marketplace_notifications(user_id,read_at,created_at);

INSERT INTO market_regions (id,parent_id,code,name,country_code,type,latitude,longitude,data_version) VALUES
  ('00000000-0000-4000-8000-000000000001',NULL,'GB','United Kingdom','GB','country',54.7023545,-3.2765753,'2026-08'),
  ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','GB-ENG','England','GB','state',52.3555177,-1.1743197,'2026-08'),
  ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','GB-ESS','Essex','GB','county',51.7704679,0.4646698,'2026-08'),
  ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002','GB-KEN','Kent','GB','county',51.2070749,0.7210362,'2026-08'),
  ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','GB-NFK','Norfolk','GB','county',52.666667,1.0,'2026-08'),
  ('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000002','GB-SFK','Suffolk','GB','county',52.166667,1.0,'2026-08'),
  ('00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000002','GB-CAM','Cambridgeshire','GB','county',52.333333,0.083333,'2026-08'),
  ('00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000002','GB-OXF','Oxfordshire','GB','county',51.833333,-1.25,'2026-08'),
  ('00000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000002','GB-SOM','Somerset','GB','county',51.083333,-3.0,'2026-08'),
  ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','GB-DEV','Devon','GB','county',50.75,-3.75,'2026-08'),
  ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','GB-YKS','Yorkshire','GB','county',53.959,-1.0815,'2026-08'),
  ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','GB-LIN','Lincolnshire','GB','county',53.166667,-0.25,'2026-08'),
  ('00000000-0000-4000-8000-000000000020',NULL,'IN','India','IN','country',22.3511148,78.6677428,'2026-08'),
  ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000020','IN-TN','Tamil Nadu','IN','state',10.9094334,78.3665347,'2026-08'),
  ('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000021','IN-TN-CBE','Coimbatore District','IN','district',11.0018115,76.9628425,'2026-08')
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,data_version=EXCLUDED.data_version,active=true,updated_at=now();

INSERT INTO seller_region_assignments
  (seller_id,organisation_id,region_id,status,can_publish,can_fulfil,approved_by,approved_at,effective_at,reason)
SELECT
  u.id,
  'agriconnect-platform',
  CASE lower(u.location)
    WHEN 'essex' THEN '00000000-0000-4000-8000-000000000003'
    WHEN 'kent' THEN '00000000-0000-4000-8000-000000000004'
    WHEN 'norfolk' THEN '00000000-0000-4000-8000-000000000005'
    WHEN 'suffolk' THEN '00000000-0000-4000-8000-000000000006'
    WHEN 'cambridgeshire' THEN '00000000-0000-4000-8000-000000000007'
    WHEN 'oxfordshire' THEN '00000000-0000-4000-8000-000000000008'
    WHEN 'somerset' THEN '00000000-0000-4000-8000-000000000009'
    WHEN 'devon' THEN '00000000-0000-4000-8000-000000000010'
    WHEN 'yorkshire' THEN '00000000-0000-4000-8000-000000000011'
    WHEN 'lincolnshire' THEN '00000000-0000-4000-8000-000000000012'
  END,
  'active',true,true,NULL,now(),now(),'Migrated verified catalogue seller'
FROM users u
WHERE u.auth_method='catalog_seed'
  AND lower(u.location) IN ('essex','kent','norfolk','suffolk','cambridgeshire','oxfordshire','somerset','devon','yorkshire','lincolnshire')
ON CONFLICT (seller_id,region_id) DO NOTHING;

UPDATE commerce_products p
SET region_id=sra.region_id
FROM seller_region_assignments sra
WHERE sra.seller_id=p.farmer_id AND sra.status='active' AND p.region_id IS NULL;
