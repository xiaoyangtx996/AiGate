BEGIN;
DROP TABLE IF EXISTS quota_alerts;
DROP TABLE IF EXISTS alert_policies;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS audit_events;
DROP FUNCTION IF EXISTS enforce_audit_actor_tenant();
COMMIT;
