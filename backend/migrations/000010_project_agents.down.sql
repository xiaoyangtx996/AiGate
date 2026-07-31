BEGIN;
DROP TABLE IF EXISTS agent_messages;
DROP TABLE IF EXISTS agent_conversations;
DROP TABLE IF EXISTS agent_mcp_bindings;
DROP TABLE IF EXISTS agent_knowledge_bindings;
DROP TABLE IF EXISTS project_agents;
DROP FUNCTION IF EXISTS enforce_agent_mcp_grant();
COMMIT;
