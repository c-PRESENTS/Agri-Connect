CREATE TABLE IF NOT EXISTS organisations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(30) NOT NULL DEFAULT 'external' CHECK (type IN ('platform','external')),
  name varchar(200) NOT NULL,
  slug varchar(120) NOT NULL UNIQUE,
  official_email varchar(320),
  status varchar(40) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','email_verification_pending','documents_required','pending_review','approved','rejected','suspended','archived')),
  verified_at timestamptz,
  suspended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organisations_status_type_idx ON organisations(status,type);

CREATE TABLE IF NOT EXISTS organisation_applications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id varchar REFERENCES organisations(id) ON DELETE SET NULL,
  applicant_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  organisation_name varchar(200) NOT NULL,
  official_email varchar(320) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','email_verification_pending','documents_required','pending_review','approved','rejected','suspended','archived')),
  submitted_at timestamptz,
  reviewed_by varchar REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_reason text,
  application_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organisation_applications_status_idx ON organisation_applications(status,created_at);
CREATE INDEX IF NOT EXISTS organisation_applications_email_idx ON organisation_applications(official_email);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(120) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  description text NOT NULL,
  group_name varchar(80) NOT NULL,
  high_risk boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_roles (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id varchar REFERENCES organisations(id) ON DELETE CASCADE,
  scope varchar(30) NOT NULL CHECK (scope IN ('platform','organisation')),
  code varchar(80) NOT NULL,
  name varchar(120) NOT NULL,
  description text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,scope,code)
);
CREATE INDEX IF NOT EXISTS admin_roles_scope_idx ON admin_roles(scope);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id varchar NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id varchar NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id,permission_id)
);

CREATE TABLE IF NOT EXISTS organisation_memberships (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id varchar NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id varchar NOT NULL REFERENCES admin_roles(id),
  status varchar(30) NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','active','suspended','deactivated')),
  invited_by varchar REFERENCES users(id) ON DELETE SET NULL,
  invited_at timestamptz,
  accepted_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,user_id)
);
CREATE INDEX IF NOT EXISTS organisation_memberships_user_status_idx ON organisation_memberships(user_id,status);
CREATE INDEX IF NOT EXISTS organisation_memberships_org_status_idx ON organisation_memberships(organisation_id,status);

CREATE TABLE IF NOT EXISTS member_permission_overrides (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id varchar NOT NULL REFERENCES organisation_memberships(id) ON DELETE CASCADE,
  permission_id varchar NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  effect varchar(10) NOT NULL CHECK (effect IN ('allow','deny')),
  granted_by varchar REFERENCES users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id,permission_id)
);

CREATE TABLE IF NOT EXISTS organisation_invitations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id varchar NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email varchar(320) NOT NULL,
  role_id varchar NOT NULL REFERENCES admin_roles(id),
  token_hash varchar(64) NOT NULL UNIQUE,
  invited_by varchar REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organisation_invitations_email_idx ON organisation_invitations(organisation_id,email);

CREATE TABLE IF NOT EXISTS account_email_verification_tokens (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_email_verification_user_idx ON account_email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS account_password_reset_tokens (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_password_reset_user_idx ON account_password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS account_mfa_credentials (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(30) NOT NULL DEFAULT 'totp',
  secret_ciphertext text NOT NULL,
  enabled_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,type)
);

CREATE TABLE IF NOT EXISTS account_mfa_recovery_codes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash varchar(64) NOT NULL UNIQUE,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_mfa_recovery_user_idx ON account_mfa_recovery_codes(user_id);

CREATE TABLE IF NOT EXISTS account_login_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  email_hash varchar(64),
  outcome varchar(30) NOT NULL,
  method varchar(30) NOT NULL,
  ip_hash varchar(64),
  device_hash varchar(64),
  failure_code varchar(80),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_login_events_user_idx ON account_login_events(user_id,occurred_at);
CREATE INDEX IF NOT EXISTS account_login_events_outcome_idx ON account_login_events(outcome,occurred_at);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id varchar REFERENCES organisations(id) ON DELETE SET NULL,
  actor_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  membership_id varchar REFERENCES organisation_memberships(id) ON DELETE SET NULL,
  action varchar(160) NOT NULL,
  permission_code varchar(120),
  target_type varchar(80) NOT NULL,
  target_id varchar(160),
  outcome varchar(20) NOT NULL DEFAULT 'success' CHECK (outcome IN ('success','denied','failed')),
  request_id varchar(100),
  ip_hash varchar(64),
  device_hash varchar(64),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_events_actor_idx ON admin_audit_events(actor_user_id,occurred_at);
CREATE INDEX IF NOT EXISTS admin_audit_events_org_idx ON admin_audit_events(organisation_id,occurred_at);
CREATE INDEX IF NOT EXISTS admin_audit_events_target_idx ON admin_audit_events(target_type,target_id,occurred_at);

INSERT INTO organisations
  (id,type,name,slug,status,verified_at,metadata)
VALUES
  ('agriconnect-platform','platform','AgriConnect','agriconnect','approved',now(),'{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  type='platform',name='AgriConnect',slug='agriconnect',status='approved',updated_at=now();

INSERT INTO admin_permissions (id,code,name,description,group_name,high_risk) VALUES
  ('perm_dashboard_view','dashboard.view','View dashboard','View central operational dashboards.','Dashboard',false),
  ('perm_employees_view','employees.view','View employees','View employee accounts and roles.','Employees',false),
  ('perm_employees_invite','employees.invite','Invite employees','Invite approved employees.','Employees',true),
  ('perm_employees_edit','employees.edit','Edit employees','Edit employee roles and account details.','Employees',true),
  ('perm_employees_deactivate','employees.deactivate','Deactivate employees','Deactivate employee access.','Employees',true),
  ('perm_employees_manage_permissions','employees.manage_permissions','Manage permissions','Change roles and permission overrides.','Employees',true),
  ('perm_users_view','users.view','View users','View the platform user directory.','Users',false),
  ('perm_users_edit','users.edit','Edit users','Edit approved user account fields.','Users',true),
  ('perm_users_approve','users.approve','Approve users','Approve user accounts.','Users',true),
  ('perm_users_suspend','users.suspend','Suspend users','Suspend or restore user access.','Users',true),
  ('perm_users_export','users.export','Export users','Export approved user information.','Users',true),
  ('perm_organisations_view','organisations.view','View organisations','View organisation records.','Organisations',false),
  ('perm_organisations_review','organisations.review','Review organisations','Review organisation applications.','Organisations',true),
  ('perm_organisations_approve','organisations.approve','Approve organisations','Approve or reject organisations.','Organisations',true),
  ('perm_organisations_suspend','organisations.suspend','Suspend organisations','Suspend or restore organisations.','Organisations',true),
  ('perm_organisations_manage','organisations.manage','Manage organisations','Manage organisation settings and membership.','Organisations',true),
  ('perm_categories_view','categories.view','View categories','View category management data.','Categories',false),
  ('perm_categories_create','categories.create','Create categories','Create draft categories.','Categories',false),
  ('perm_categories_edit','categories.edit','Edit categories','Edit category content.','Categories',false),
  ('perm_categories_reorder','categories.reorder','Reorder categories','Change category display order.','Categories',false),
  ('perm_categories_publish','categories.publish','Publish categories','Publish taxonomy changes.','Categories',true),
  ('perm_categories_archive','categories.archive','Archive categories','Archive category records.','Categories',true),
  ('perm_products_view','products.view','View products','View all product listings.','Products',false),
  ('perm_products_edit','products.edit','Edit products','Edit moderated product fields.','Products',true),
  ('perm_products_approve','products.approve','Approve products','Approve product listings.','Products',true),
  ('perm_products_reject','products.reject','Reject products','Reject product listings.','Products',true),
  ('perm_products_suspend','products.suspend','Suspend products','Suspend or restore listings.','Products',true),
  ('perm_products_feature','products.feature','Feature products','Manage featured and Fresh Pick status.','Products',false),
  ('perm_products_remove','products.remove','Remove products','Remove product listings.','Products',true),
  ('perm_verification_view','verification.view','View verification','View verification cases.','Verification',false),
  ('perm_verification_review','verification.review','Review verification','Review submitted documents.','Verification',true),
  ('perm_verification_approve','verification.approve','Approve verification','Approve verification cases.','Verification',true),
  ('perm_verification_reject','verification.reject','Reject verification','Reject verification cases.','Verification',true),
  ('perm_analytics_view','analytics.view','View analytics','View platform analytics.','Analytics',false),
  ('perm_analytics_export','analytics.export','Export analytics','Download analytics reports.','Analytics',true),
  ('perm_revenue_view','revenue.view','View revenue','View financial dashboards.','Revenue',true),
  ('perm_revenue_export','revenue.export','Export revenue','Download financial reports.','Revenue',true),
  ('perm_revenue_manage_payouts','revenue.manage_payouts','Manage payouts','Manage payout operations.','Revenue',true),
  ('perm_data_import','data.import','Import data','Run validated data imports.','Data',true),
  ('perm_data_export','data.export','Export data','Run approved data exports.','Data',true),
  ('perm_data_request_backup','data.request_backup','Request backup','Request protected backup operations.','Data',true),
  ('perm_audit_view','audit.view','View audit log','View administrative audit events.','Audit',true),
  ('perm_audit_export','audit.export','Export audit log','Export administrative audit events.','Audit',true),
  ('perm_security_manage','security.manage','Manage security','Manage protected platform security settings.','Security',true)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,group_name=EXCLUDED.group_name,high_risk=EXCLUDED.high_risk;

INSERT INTO admin_roles
  (id,organisation_id,scope,code,name,description,is_system,is_super_admin)
VALUES
  ('role_platform_super_admin','agriconnect-platform','platform','super_admin','Super Admin','Complete platform and security control.',true,true),
  ('role_platform_admin','agriconnect-platform','platform','admin','Admin','General platform administration.',true,false),
  ('role_platform_manager','agriconnect-platform','platform','manager','Manager','Operational supervision and approvals.',true,false),
  ('role_platform_moderator','agriconnect-platform','platform','moderator','Moderator','Product, category, and content moderation.',true,false),
  ('role_platform_customer_support','agriconnect-platform','platform','customer_support','Customer Support','User support and limited account management.',true,false),
  ('role_platform_finance','agriconnect-platform','platform','finance','Finance','Revenue, payments, refunds, invoices, and payouts.',true,false),
  ('role_platform_operations','agriconnect-platform','platform','operations','Operations','Orders, logistics, products, and verification operations.',true,false),
  ('role_platform_data_analyst','agriconnect-platform','platform','data_analyst','Data Analyst','Analytics and authorised reporting.',true,false),
  ('role_platform_marketing','agriconnect-platform','platform','marketing','Marketing','Promotions and engagement reporting.',true,false),
  ('role_platform_viewer','agriconnect-platform','platform','viewer','Viewer','Read-only platform access.',true,false)
ON CONFLICT (organisation_id,scope,code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,is_system=true,is_super_admin=EXCLUDED.is_super_admin,updated_at=now();

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_super_admin',id FROM admin_permissions
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_admin',id FROM admin_permissions
WHERE code NOT IN ('security.manage','employees.manage_permissions','data.request_backup')
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_manager',id FROM admin_permissions
WHERE code IN (
  'dashboard.view','employees.view','users.view','users.edit','users.approve','users.suspend',
  'organisations.view','organisations.review','organisations.approve',
  'categories.view','categories.create','categories.edit','categories.reorder','categories.publish',
  'products.view','products.edit','products.approve','products.reject','products.suspend','products.feature',
  'verification.view','verification.review','verification.approve','verification.reject',
  'analytics.view','analytics.export','audit.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_moderator',id FROM admin_permissions
WHERE code IN (
  'dashboard.view','categories.view','categories.create','categories.edit','categories.reorder',
  'products.view','products.edit','products.approve','products.reject','products.suspend','products.feature',
  'verification.view','verification.review'
)
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_customer_support',id FROM admin_permissions
WHERE code IN ('dashboard.view','users.view','users.edit','organisations.view','verification.view')
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_finance',id FROM admin_permissions
WHERE code IN (
  'dashboard.view','users.view','organisations.view','revenue.view','revenue.export',
  'revenue.manage_payouts','analytics.view','audit.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_operations',id FROM admin_permissions
WHERE code IN (
  'dashboard.view','users.view','organisations.view','organisations.review',
  'categories.view','products.view','products.edit','products.approve','products.reject','products.suspend',
  'verification.view','verification.review','analytics.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_data_analyst',id FROM admin_permissions
WHERE code IN ('dashboard.view','users.view','organisations.view','categories.view','products.view','analytics.view','analytics.export','data.export')
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_marketing',id FROM admin_permissions
WHERE code IN ('dashboard.view','categories.view','products.view','products.feature','analytics.view','analytics.export')
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id,permission_id)
SELECT 'role_platform_viewer',id FROM admin_permissions
WHERE code IN ('dashboard.view','users.view','organisations.view','categories.view','products.view','verification.view','analytics.view')
ON CONFLICT DO NOTHING;

-- Preserve access for legacy coarse-grained admin users without changing their
-- existing marketplace role or API contracts.
INSERT INTO organisation_memberships
  (organisation_id,user_id,role_id,status,accepted_at)
SELECT
  'agriconnect-platform',id,'role_platform_super_admin','active',now()
FROM users
WHERE role='admin'
ON CONFLICT (organisation_id,user_id) DO UPDATE SET
  role_id='role_platform_super_admin',status='active',deactivated_at=NULL,updated_at=now();

-- A central organisation must never be left without an active Super Admin.
CREATE OR REPLACE FUNCTION prevent_last_active_super_admin_removal()
RETURNS trigger AS $$
DECLARE
  old_role_is_super_admin boolean;
  replacement_count integer;
  removes_active_super_admin boolean;
BEGIN
  SELECT is_super_admin INTO old_role_is_super_admin
  FROM admin_roles
  WHERE id = OLD.role_id;

  removes_active_super_admin :=
    OLD.organisation_id = 'agriconnect-platform'
    AND OLD.status = 'active'
    AND old_role_is_super_admin
    AND (
      TG_OP = 'DELETE'
      OR NEW.status <> 'active'
      OR NEW.role_id <> OLD.role_id
      OR NEW.organisation_id <> OLD.organisation_id
    );

  IF removes_active_super_admin THEN
    PERFORM pg_advisory_xact_lock(hashtext(OLD.organisation_id));

    SELECT count(*) INTO replacement_count
    FROM organisation_memberships membership
    JOIN admin_roles role ON role.id = membership.role_id
    WHERE membership.organisation_id = OLD.organisation_id
      AND membership.status = 'active'
      AND role.is_super_admin = true
      AND membership.id <> OLD.id;

    IF replacement_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove or deactivate the last active Super Admin'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organisation_memberships_last_super_admin_guard ON organisation_memberships;
CREATE TRIGGER organisation_memberships_last_super_admin_guard
BEFORE UPDATE OR DELETE ON organisation_memberships
FOR EACH ROW EXECUTE FUNCTION prevent_last_active_super_admin_removal();

-- Memberships and invitations may only use roles belonging to the same
-- organisation and the correct platform/organisation scope.
CREATE OR REPLACE FUNCTION validate_organisation_role_assignment()
RETURNS trigger AS $$
DECLARE
  assigned_role_organisation_id varchar;
  assigned_role_scope varchar;
  target_organisation_type varchar;
BEGIN
  SELECT organisation_id, scope
    INTO assigned_role_organisation_id, assigned_role_scope
  FROM admin_roles
  WHERE id = NEW.role_id;

  SELECT type INTO target_organisation_type
  FROM organisations
  WHERE id = NEW.organisation_id;

  IF assigned_role_organisation_id IS DISTINCT FROM NEW.organisation_id THEN
    RAISE EXCEPTION 'Role must belong to the same organisation as the assignment'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (target_organisation_type = 'platform' AND assigned_role_scope <> 'platform')
    OR (target_organisation_type <> 'platform' AND assigned_role_scope <> 'organisation') THEN
    RAISE EXCEPTION 'Role scope does not match the organisation type'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organisation_memberships_role_scope_guard ON organisation_memberships;
CREATE TRIGGER organisation_memberships_role_scope_guard
BEFORE INSERT OR UPDATE ON organisation_memberships
FOR EACH ROW EXECUTE FUNCTION validate_organisation_role_assignment();

DROP TRIGGER IF EXISTS organisation_invitations_role_scope_guard ON organisation_invitations;
CREATE TRIGGER organisation_invitations_role_scope_guard
BEFORE INSERT OR UPDATE ON organisation_invitations
FOR EACH ROW EXECUTE FUNCTION validate_organisation_role_assignment();

-- Built-in role identity and privilege level are immutable. Their permission
-- assignments remain configurable through admin_role_permissions.
CREATE OR REPLACE FUNCTION protect_system_admin_role_identity()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_system AND (
    NEW.organisation_id IS DISTINCT FROM OLD.organisation_id
    OR NEW.scope IS DISTINCT FROM OLD.scope
    OR NEW.code IS DISTINCT FROM OLD.code
    OR NEW.is_system IS DISTINCT FROM OLD.is_system
    OR NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
  ) THEN
    RAISE EXCEPTION 'System role identity and privilege level cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_roles_system_identity_guard ON admin_roles;
CREATE TRIGGER admin_roles_system_identity_guard
BEFORE UPDATE ON admin_roles
FOR EACH ROW EXECUTE FUNCTION protect_system_admin_role_identity();

CREATE OR REPLACE FUNCTION protect_platform_organisation_identity()
RETURNS trigger AS $$
BEGIN
  IF OLD.id = 'agriconnect-platform' AND TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'The central AgriConnect organisation cannot be removed or disabled'
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF OLD.id = 'agriconnect-platform' AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.type IS DISTINCT FROM 'platform'
    OR NEW.status IS DISTINCT FROM 'approved'
  ) THEN
    RAISE EXCEPTION 'The central AgriConnect organisation cannot be removed or disabled'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organisations_platform_identity_guard ON organisations;
CREATE TRIGGER organisations_platform_identity_guard
BEFORE UPDATE OR DELETE ON organisations
FOR EACH ROW EXECUTE FUNCTION protect_platform_organisation_identity();
