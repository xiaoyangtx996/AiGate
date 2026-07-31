BEGIN;

CREATE TABLE project_agents (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    name text NOT NULL CHECK (btrim(name) <> ''),
    model text NOT NULL CHECK (btrim(model) <> ''),
    system_prompt text NOT NULL DEFAULT '',
    skill_ids text[] NOT NULL DEFAULT '{}',
    skill_hook jsonb NOT NULL DEFAULT '{}'::jsonb,
    active boolean NOT NULL DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,project_id,name),
    UNIQUE(tenant_id,project_id,id),
    FOREIGN KEY(tenant_id,project_id) REFERENCES projects(tenant_id,id) ON DELETE CASCADE,
    FOREIGN KEY(tenant_id,created_by) REFERENCES users(tenant_id,id) ON DELETE RESTRICT
);
COMMENT ON TABLE project_agents IS '项目专属 Agent 配置；仅编排该项目知识库和已授权 MCP，模型调用统一经过 AiGate Gateway';
COMMENT ON COLUMN project_agents.id IS 'Agent 主键（UUID）';
COMMENT ON COLUMN project_agents.tenant_id IS 'Agent 所属租户 ID，所有管理与对话查询的第一隔离键';
COMMENT ON COLUMN project_agents.project_id IS 'Agent 所属项目 ID，不允许跨项目绑定知识资产';
COMMENT ON COLUMN project_agents.name IS 'Agent 显示名称，同一项目内唯一';
COMMENT ON COLUMN project_agents.model IS '传给 AiGate Gateway 的公开模型名称';
COMMENT ON COLUMN project_agents.system_prompt IS '项目 Agent 系统提示词，不包含渠道凭据或员工 API Key';
COMMENT ON COLUMN project_agents.skill_ids IS '可选 Skill 资产标识预留；Plan 06 不加载或执行 Skill runtime';
COMMENT ON COLUMN project_agents.skill_hook IS 'Skill 生命周期钩子配置扩展点；当前仅保存结构化配置而不执行';
COMMENT ON COLUMN project_agents.active IS 'Agent 是否允许发起新对话';
COMMENT ON COLUMN project_agents.created_by IS '创建 Agent 的同租户员工 ID';
COMMENT ON COLUMN project_agents.created_at IS 'Agent 创建时间（UTC）';
COMMENT ON COLUMN project_agents.updated_at IS 'Agent 配置最后更新时间（UTC）';
CREATE INDEX project_agents_scope_idx ON project_agents(tenant_id,project_id,active,created_at);
COMMENT ON INDEX project_agents_scope_idx IS '按租户和项目读取启用 Agent，避免跨项目扫描';

CREATE TABLE agent_knowledge_bindings (
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    knowledge_base_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(tenant_id,agent_id,knowledge_base_id),
    FOREIGN KEY(tenant_id,project_id,agent_id) REFERENCES project_agents(tenant_id,project_id,id) ON DELETE CASCADE,
    FOREIGN KEY(tenant_id,project_id,knowledge_base_id) REFERENCES knowledge_bases(tenant_id,project_id,id) ON DELETE RESTRICT
);
COMMENT ON TABLE agent_knowledge_bindings IS 'Agent 与同项目知识库绑定；复合外键从数据库层阻止跨项目 RAG';
COMMENT ON COLUMN agent_knowledge_bindings.tenant_id IS '绑定所属租户 ID';
COMMENT ON COLUMN agent_knowledge_bindings.project_id IS 'Agent 与知识库共同所属项目 ID';
COMMENT ON COLUMN agent_knowledge_bindings.agent_id IS '被配置的项目 Agent ID';
COMMENT ON COLUMN agent_knowledge_bindings.knowledge_base_id IS '供 Agent 检索引用的项目知识库 ID';
COMMENT ON COLUMN agent_knowledge_bindings.created_at IS '绑定创建时间（UTC）';

CREATE TABLE agent_mcp_bindings (
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    mcp_asset_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(tenant_id,agent_id,mcp_asset_id),
    FOREIGN KEY(tenant_id,project_id,agent_id) REFERENCES project_agents(tenant_id,project_id,id) ON DELETE CASCADE,
    FOREIGN KEY(tenant_id,mcp_asset_id) REFERENCES mcp_assets(tenant_id,id) ON DELETE RESTRICT
);
COMMENT ON TABLE agent_mcp_bindings IS 'Agent 与 MCP 资产绑定；必须预先存在该项目和 Agent 的显式 mcp_grants 授权';
COMMENT ON COLUMN agent_mcp_bindings.tenant_id IS '绑定所属租户 ID';
COMMENT ON COLUMN agent_mcp_bindings.project_id IS 'MCP 授权所属项目 ID';
COMMENT ON COLUMN agent_mcp_bindings.agent_id IS '获准调用 MCP 的项目 Agent ID';
COMMENT ON COLUMN agent_mcp_bindings.mcp_asset_id IS '绑定的租户 MCP 企业资产 ID';
COMMENT ON COLUMN agent_mcp_bindings.created_at IS '绑定创建时间（UTC）';

CREATE FUNCTION enforce_agent_mcp_grant() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM mcp_grants g
        WHERE g.tenant_id=NEW.tenant_id AND g.project_id=NEW.project_id
          AND g.mcp_asset_id=NEW.mcp_asset_id AND g.agent_id=NEW.agent_id::text
    ) THEN
        RAISE EXCEPTION 'agent MCP binding requires an explicit agent grant';
    END IF;
    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION enforce_agent_mcp_grant() IS '写入 Agent MCP 绑定前校验同租户、同项目、同资产及同 Agent 的显式授权';
CREATE TRIGGER agent_mcp_binding_grant BEFORE INSERT OR UPDATE ON agent_mcp_bindings FOR EACH ROW EXECUTE FUNCTION enforce_agent_mcp_grant();
COMMENT ON TRIGGER agent_mcp_binding_grant ON agent_mcp_bindings IS '阻止未授权或仅项目级授权的 MCP 资产绑定到 Agent';

CREATE TABLE agent_conversations (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,id),
    FOREIGN KEY(tenant_id,project_id,agent_id) REFERENCES project_agents(tenant_id,project_id,id) ON DELETE CASCADE,
    FOREIGN KEY(tenant_id,user_id) REFERENCES users(tenant_id,id) ON DELETE RESTRICT
);
COMMENT ON TABLE agent_conversations IS '项目 Agent 对话会话；归属租户、项目、Agent 与发起员工，用于保持访问边界';
COMMENT ON COLUMN agent_conversations.id IS '对话会话主键（UUID）';
COMMENT ON COLUMN agent_conversations.tenant_id IS '会话所属租户 ID';
COMMENT ON COLUMN agent_conversations.project_id IS '会话所属项目 ID';
COMMENT ON COLUMN agent_conversations.agent_id IS '会话使用的项目 Agent ID';
COMMENT ON COLUMN agent_conversations.user_id IS '创建并拥有该会话的员工 ID';
COMMENT ON COLUMN agent_conversations.created_at IS '会话创建时间（UTC）';
COMMENT ON COLUMN agent_conversations.updated_at IS '会话最后消息时间（UTC）';

CREATE TABLE agent_messages (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL CHECK(role IN ('user','assistant')),
    content text NOT NULL,
    citations jsonb NOT NULL DEFAULT '[]'::jsonb,
    gateway_trace_id text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY(tenant_id,conversation_id) REFERENCES agent_conversations(tenant_id,id) ON DELETE CASCADE
);
COMMENT ON TABLE agent_messages IS 'Agent 对话消息；助手消息保存 RAG 引用和 Gateway trace id 以供审计追踪';
COMMENT ON COLUMN agent_messages.id IS '对话消息主键（UUID）';
COMMENT ON COLUMN agent_messages.tenant_id IS '消息所属租户 ID，随会话强制隔离';
COMMENT ON COLUMN agent_messages.conversation_id IS '消息所属对话会话 ID';
COMMENT ON COLUMN agent_messages.role IS '消息角色：user 或 assistant';
COMMENT ON COLUMN agent_messages.content IS '用户问题或 Gateway 返回的回答正文';
COMMENT ON COLUMN agent_messages.citations IS '助手回答引用数组，包含 document_id 与 span_start/span_end';
COMMENT ON COLUMN agent_messages.gateway_trace_id IS 'AiGate Gateway 返回的 X-Trace-ID，关联 api_logs 与 audit_events';
COMMENT ON COLUMN agent_messages.created_at IS '消息创建时间（UTC）';
CREATE INDEX agent_messages_conversation_idx ON agent_messages(tenant_id,conversation_id,created_at);
COMMENT ON INDEX agent_messages_conversation_idx IS '按租户和会话顺序加载 Agent 消息历史';

COMMIT;
