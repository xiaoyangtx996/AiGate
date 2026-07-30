BEGIN;

DROP TRIGGER IF EXISTS tenants_create_system_roles ON tenants;
DROP FUNCTION IF EXISTS create_tenant_system_roles();
DROP TABLE IF EXISTS project_memberships;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_tenant_id_id_key;

COMMIT;
