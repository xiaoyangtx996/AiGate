BEGIN;

ALTER TABLE api_logs
    ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE api_logs
    DROP CONSTRAINT IF EXISTS api_logs_project_fk;
ALTER TABLE api_logs
    ADD CONSTRAINT api_logs_project_fk
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects (tenant_id, id) ON DELETE RESTRICT;
COMMENT ON COLUMN api_logs.project_id IS '可选项目归因：来自请求头 X-AiGate-Project-ID（须通过项目 ACL）；为空时用量看板可回退到 Agent trace 关联';

CREATE INDEX IF NOT EXISTS api_logs_tenant_project_created_idx ON api_logs (tenant_id, project_id, created_at DESC);
COMMENT ON INDEX api_logs_tenant_project_created_idx IS '按租户和项目汇总网关调用与成本';

CREATE INDEX IF NOT EXISTS agent_messages_tenant_gateway_trace_idx ON agent_messages (tenant_id, gateway_trace_id, created_at DESC)
    WHERE gateway_trace_id <> '';
COMMENT ON INDEX agent_messages_tenant_gateway_trace_idx IS '仅为缺少 api_logs.project_id 的旧 Agent 调用按 trace 回退项目归因，避免扫描全部消息';

COMMIT;
