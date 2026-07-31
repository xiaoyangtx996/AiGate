BEGIN;

DROP INDEX IF EXISTS agent_messages_tenant_gateway_trace_idx;

DROP INDEX IF EXISTS api_logs_tenant_project_created_idx;
ALTER TABLE api_logs DROP CONSTRAINT IF EXISTS api_logs_project_fk;
ALTER TABLE api_logs DROP COLUMN IF EXISTS project_id;

COMMIT;
