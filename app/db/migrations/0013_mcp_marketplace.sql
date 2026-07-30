-- Phase 3 MCP marketplace transport, auth and install metadata
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS transport_type text DEFAULT 'sse' NOT NULL;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS command text;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS args jsonb DEFAULT '[]';
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS env jsonb DEFAULT '{}';
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS server_url text;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS auth_type text DEFAULT 'none' NOT NULL;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS auth_config jsonb DEFAULT '{}';
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS connection_status text DEFAULT 'unknown' NOT NULL;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS last_connected_at timestamp;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS source_slug text;
ALTER TABLE mcp_tool ADD COLUMN IF NOT EXISTS security_score jsonb;

UPDATE mcp_tool
SET
  transport_type = COALESCE(NULLIF(type, 'custom'), transport_type),
  server_url = COALESCE(server_url, config->>'endpoint', config->>'url'),
  category = COALESCE(category, config->>'category'),
  source_slug = COALESCE(source_slug, config->>'presetId')
WHERE true;

CREATE INDEX IF NOT EXISTS mcp_tool_source_slug_idx ON mcp_tool(source_slug);
CREATE INDEX IF NOT EXISTS mcp_tool_connection_status_idx ON mcp_tool(connection_status);
