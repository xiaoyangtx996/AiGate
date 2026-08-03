BEGIN;
DROP TABLE IF EXISTS skill_usage_events;
DROP TABLE IF EXISTS skill_memories;
DROP TABLE IF EXISTS agent_skill_bindings;
DROP TABLE IF EXISTS skill_grants;
ALTER TABLE IF EXISTS skills DROP CONSTRAINT IF EXISTS skills_active_version_fk;
DROP TABLE IF EXISTS skill_versions;
DROP TABLE IF EXISTS skills;
COMMIT;
