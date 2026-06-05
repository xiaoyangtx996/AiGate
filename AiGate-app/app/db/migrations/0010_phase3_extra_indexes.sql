-- Phase 3 extra performance indexes
CREATE INDEX IF NOT EXISTS idx_channel_status ON channel(status);
CREATE INDEX IF NOT EXISTS idx_channel_priority ON channel(priority);
CREATE INDEX IF NOT EXISTS idx_channel_status_priority ON channel(status, priority);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_org_status ON mcp_tool(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_model_name ON ai_model(name);
