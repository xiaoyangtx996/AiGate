-- Database comments + missing tables migration
-- Generated: 2026-05-27

-- Table comments
COMMENT ON TABLE menu IS 'menu management - system menu tree structure';
COMMENT ON TABLE role IS 'role management - RBAC role definitions';
COMMENT ON TABLE role_menu IS 'role-menu association - role permission binding';
COMMENT ON TABLE user_role IS 'user-role association - user role binding';
COMMENT ON TABLE internalization IS 'internationalization - multilingual key-value pairs';
COMMENT ON TABLE logs IS 'operation logs - user operation audit records';
COMMENT ON TABLE organization IS 'organization management - 4-level org hierarchy';
COMMENT ON TABLE member IS 'member association - user-organization binding';
COMMENT ON TABLE channel IS 'channel management - upstream AI provider proxy';
COMMENT ON TABLE api_key IS 'API key management - ag-{env}-{hex} format';
COMMENT ON TABLE ai_model IS 'AI model registry';
COMMENT ON TABLE mcp_tool IS 'MCP tool management';
COMMENT ON TABLE agent IS 'agent management';
COMMENT ON TABLE knowledge_base IS 'knowledge base';
COMMENT ON TABLE prompt IS 'prompt templates';
COMMENT ON TABLE alert IS 'alert management';
COMMENT ON TABLE api_log IS 'API call logs - 180-day retention';
COMMENT ON TABLE billing_record IS 'billing records';
COMMENT ON TABLE document IS 'knowledge base documents';
COMMENT ON TABLE conversation IS 'agent conversations';
COMMENT ON TABLE conversation_message IS 'conversation messages';
COMMENT ON TABLE mcp_tool_version IS 'MCP tool versions';
COMMENT ON TABLE "user" IS 'users - Better Auth user table';
COMMENT ON TABLE session IS 'sessions';
COMMENT ON TABLE account IS 'accounts';
COMMENT ON TABLE verification IS 'verifications';

-- Missing table: document
CREATE TABLE IF NOT EXISTS document (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id TEXT NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  chunks INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doc_kb_idx ON document(knowledge_base_id);
CREATE INDEX IF NOT EXISTS doc_status_idx ON document(status);

-- Missing table: conversation
CREATE TABLE IF NOT EXISTS conversation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conv_agent_idx ON conversation(agent_id);
CREATE INDEX IF NOT EXISTS conv_user_idx ON conversation(user_id);

-- Missing table: conversation_message
CREATE TABLE IF NOT EXISTS conversation_message (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  latency INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS msg_conv_idx ON conversation_message(conversation_id);

-- Missing table: mcp_tool_version
CREATE TABLE IF NOT EXISTS mcp_tool_version (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id TEXT NOT NULL REFERENCES mcp_tool(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  changelog TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mcp_ver_tool_idx ON mcp_tool_version(tool_id);

-- Column comments are in schema.ts JSDoc annotations
-- Run: npx drizzle-kit generate && npx drizzle-kit migrate
