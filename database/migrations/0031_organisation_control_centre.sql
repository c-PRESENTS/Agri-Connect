-- Integrated Organisation Control Centre: operational permissions, typed settings,
-- and durable data-operation requests. Existing users, products, orders, taxonomy,
-- authentication and organisation/RBAC tables remain authoritative.

INSERT INTO admin_permissions (id,code,name,description,group_name,high_risk)
VALUES
  ('perm_partners_view','partners.view','View partner groups','View seller, buyer, student, researcher, service-provider and logistics-partner directories.','Partners',false),
  ('perm_partners_manage','partners.manage','Manage partner groups','Change supported partner operational states through validated workflows.','Partners',true),
  ('perm_regions_view','regions.view','View regions','View platform and organisation regional coverage.','Regions',false),
  ('perm_regions_manage','regions.manage','Manage regions','Create or activate platform regions through validated workflows.','Regions',true),
  ('perm_opportunities_view','opportunities.view','View opportunities','View regional catalogue opportunities.','Opportunities',false),
  ('perm_opportunities_manage','opportunities.manage','Manage opportunities','Manage regional catalogue opportunity lifecycle.','Opportunities',true),
  ('perm_content_view','content.view','View content','View database-backed platform content.','Content',false),
  ('perm_content_manage','content.manage','Manage content','Publish or withdraw database-backed platform content.','Content',true),
  ('perm_orders_view','orders.view','View orders','View privacy-minimised marketplace order operations.','Orders',true),
  ('perm_orders_manage','orders.manage','Manage orders','Apply validated marketplace order lifecycle transitions.','Orders',true),
  ('perm_logistics_view','logistics.view','View logistics','View privacy-minimised fulfilment operations.','Logistics',true),
  ('perm_logistics_manage','logistics.manage','Manage logistics','Apply validated fulfilment lifecycle transitions.','Logistics',true),
  ('perm_settings_manage','settings.manage','Manage platform settings','Manage allowlisted non-secret organisation operational settings.','Settings',true)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  group_name=EXCLUDED.group_name,
  high_risk=EXCLUDED.high_risk;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_super_admin',id
FROM admin_permissions
WHERE code IN (
  'partners.view','partners.manage','regions.view','regions.manage',
  'opportunities.view','opportunities.manage','content.view','content.manage',
  'orders.view','orders.manage','logistics.view','logistics.manage','settings.manage'
)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS organisation_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id varchar NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  setting_key varchar(100) NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organisation_settings_org_key_unique UNIQUE (organisation_id,setting_key),
  CONSTRAINT organisation_settings_key_check CHECK (
    setting_key IN ('currency_conversion','shipping_rule_override')
  )
);

CREATE INDEX IF NOT EXISTS organisation_settings_updated_idx
  ON organisation_settings (organisation_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS admin_data_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id varchar REFERENCES organisations(id) ON DELETE SET NULL,
  requested_by varchar REFERENCES users(id) ON DELETE SET NULL,
  request_type varchar(60) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'requested',
  reason text NOT NULL,
  safe_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT admin_data_requests_type_check CHECK (request_type IN ('backup')),
  CONSTRAINT admin_data_requests_status_check CHECK (status IN ('requested','processing','completed','failed','cancelled')),
  CONSTRAINT admin_data_requests_reason_check CHECK (char_length(reason) BETWEEN 3 AND 500)
);

CREATE INDEX IF NOT EXISTS admin_data_requests_org_status_idx
  ON admin_data_requests (organisation_id,status,created_at DESC);
