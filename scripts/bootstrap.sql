\set ON_ERROR_STOP on

INSERT INTO tenants (id, name)
VALUES (:'tenant_id'::uuid, :'tenant_name')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = true, updated_at = now();

INSERT INTO organizations (id, tenant_id, name)
VALUES (:'organization_id'::uuid, :'tenant_id'::uuid, :'organization_name')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, updated_at = now()
WHERE organizations.tenant_id = EXCLUDED.tenant_id;
