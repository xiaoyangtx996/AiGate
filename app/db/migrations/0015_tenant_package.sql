-- Phase 5 tenant package and lifecycle controls
CREATE TABLE IF NOT EXISTS tenant_package (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  menu_codes jsonb DEFAULT '[]' NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  sort integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS tenant_package_enabled_idx ON tenant_package(enabled);
CREATE INDEX IF NOT EXISTS tenant_package_sort_idx ON tenant_package(sort);

ALTER TABLE organization ADD COLUMN IF NOT EXISTS package_id text REFERENCES tenant_package(id) ON DELETE SET NULL;
ALTER TABLE organization ADD COLUMN IF NOT EXISTS expire_time timestamp;
ALTER TABLE organization ADD COLUMN IF NOT EXISTS account_limit integer DEFAULT -1 NOT NULL;
ALTER TABLE organization ADD COLUMN IF NOT EXISTS tenant_status text DEFAULT 'active' NOT NULL;
CREATE INDEX IF NOT EXISTS organization_package_idx ON organization(package_id);
CREATE INDEX IF NOT EXISTS organization_tenant_status_idx ON organization(tenant_status);
CREATE INDEX IF NOT EXISTS organization_expire_time_idx ON organization(expire_time);

ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'tenant_expiring';
