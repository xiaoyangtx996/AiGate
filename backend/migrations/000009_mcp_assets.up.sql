BEGIN;

CREATE TABLE mcp_marketplace_entries (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    endpoint_template text NOT NULL,
    version text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE mcp_marketplace_entries IS '平台精选公共 MCP 市场目录；租户安装后才进入企业资产目录，不代表自动获得项目调用权限';
COMMENT ON COLUMN mcp_marketplace_entries.id IS '公共市场条目稳定标识';
COMMENT ON COLUMN mcp_marketplace_entries.name IS '公共 MCP 展示名称';
COMMENT ON COLUMN mcp_marketplace_entries.description IS '公共 MCP 能力与使用范围说明';
COMMENT ON COLUMN mcp_marketplace_entries.endpoint_template IS '安装时使用的公共 MCP 端点模板，仅服务端读取；员工市场接口不返回';
COMMENT ON COLUMN mcp_marketplace_entries.version IS '市场声明的 MCP 版本或发布版本';
COMMENT ON COLUMN mcp_marketplace_entries.active IS '条目是否允许新租户安装';
COMMENT ON COLUMN mcp_marketplace_entries.created_at IS '条目进入精选市场的时间（UTC）';

INSERT INTO mcp_marketplace_entries(id,name,description,endpoint_template,version) VALUES
('public-everything','MCP Everything','官方协议能力验证服务，安装后仍需项目授权','https://example.invalid/mcp/everything','1.0');

CREATE TABLE mcp_assets (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (btrim(name) <> ''),
    source text NOT NULL CHECK (source IN ('private','marketplace')),
    marketplace_id text REFERENCES mcp_marketplace_entries(id) ON DELETE RESTRICT,
    encrypted_endpoint text NOT NULL,
    encrypted_credential text NOT NULL DEFAULT '',
    version text NOT NULL DEFAULT '',
    health_status text NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('unknown','healthy','unhealthy')),
    consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
    last_checked_at timestamptz,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id,id),
    UNIQUE (tenant_id,name)
);
COMMENT ON TABLE mcp_assets IS '租户企业 MCP 资产目录；私有原始 URL 与凭据均加密保存，只允许通过 AiGate 代理调用';
COMMENT ON COLUMN mcp_assets.id IS 'MCP 资产主键（UUID）';
COMMENT ON COLUMN mcp_assets.tenant_id IS '资产所属租户 ID，注册、授权、调用和计量的隔离键';
COMMENT ON COLUMN mcp_assets.name IS '租户内唯一的 MCP 资产显示名称';
COMMENT ON COLUMN mcp_assets.source IS '资产来源：企业私有注册 private 或精选市场安装 marketplace';
COMMENT ON COLUMN mcp_assets.marketplace_id IS '市场安装来源；企业私有资产为空';
COMMENT ON COLUMN mcp_assets.encrypted_endpoint IS 'AES-256-GCM 加密的原始 MCP URL，员工接口永不返回明文';
COMMENT ON COLUMN mcp_assets.encrypted_credential IS 'AES-256-GCM 加密的上游认证凭据；无凭据时为空字符串';
COMMENT ON COLUMN mcp_assets.version IS '最近健康检查观测或管理员声明的服务版本，供版本钩子使用';
COMMENT ON COLUMN mcp_assets.health_status IS '健康状态：unknown、healthy 或连续失败后的 unhealthy';
COMMENT ON COLUMN mcp_assets.consecutive_failures IS '连续健康检查失败次数；成功后归零，达到三次标记 unhealthy';
COMMENT ON COLUMN mcp_assets.last_checked_at IS '最近一次 worker 健康检查时间（UTC）';
COMMENT ON COLUMN mcp_assets.active IS '资产是否允许授权和代理调用';
COMMENT ON COLUMN mcp_assets.created_at IS '资产注册或安装时间（UTC）';
COMMENT ON COLUMN mcp_assets.updated_at IS '资产配置、版本或健康状态最后更新时间（UTC）';
CREATE INDEX mcp_assets_tenant_active_idx ON mcp_assets(tenant_id,active,created_at);
COMMENT ON INDEX mcp_assets_tenant_active_idx IS '按租户读取启用的企业 MCP 目录且不泄露其他租户资产';

CREATE TABLE mcp_grants (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mcp_asset_id uuid NOT NULL,
    project_id uuid NOT NULL,
    agent_id text NOT NULL DEFAULT '',
    granted_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(tenant_id,mcp_asset_id,project_id,agent_id),
    FOREIGN KEY(tenant_id,mcp_asset_id) REFERENCES mcp_assets(tenant_id,id) ON DELETE CASCADE,
    FOREIGN KEY(tenant_id,project_id) REFERENCES projects(tenant_id,id) ON DELETE CASCADE,
    FOREIGN KEY(tenant_id,granted_by) REFERENCES users(tenant_id,id) ON DELETE RESTRICT
);
COMMENT ON TABLE mcp_grants IS 'MCP 调用授权；项目必须显式授权，指定 agent_id 时还要求调用方携带相同 Agent 标识';
COMMENT ON COLUMN mcp_grants.tenant_id IS '授权所属租户 ID';
COMMENT ON COLUMN mcp_grants.mcp_asset_id IS '被授权的 MCP 企业资产 ID';
COMMENT ON COLUMN mcp_grants.project_id IS '获准调用资产的项目 ID';
COMMENT ON COLUMN mcp_grants.agent_id IS '可选 Agent 版本钩子标识；空字符串表示项目成员可直接调用';
COMMENT ON COLUMN mcp_grants.granted_by IS '执行授权的管理员员工 ID';
COMMENT ON COLUMN mcp_grants.created_at IS '授权创建时间（UTC）';

CREATE TABLE mcp_usage_logs (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trace_id text NOT NULL UNIQUE,
    mcp_asset_id uuid NOT NULL,
    project_id uuid NOT NULL,
    agent_id text NOT NULL DEFAULT '',
    user_id uuid NOT NULL,
    tool_name text NOT NULL,
    input_tokens bigint,
    output_tokens bigint,
    cost_micros bigint,
    status_code integer NOT NULL,
    duration_ms bigint NOT NULL CHECK(duration_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY(tenant_id,mcp_asset_id) REFERENCES mcp_assets(tenant_id,id) ON DELETE RESTRICT,
    FOREIGN KEY(tenant_id,project_id) REFERENCES projects(tenant_id,id) ON DELETE RESTRICT,
    FOREIGN KEY(tenant_id,user_id) REFERENCES users(tenant_id,id) ON DELETE RESTRICT
);
COMMENT ON TABLE mcp_usage_logs IS 'MCP 工具代理调用计量日志；按调用人、项目、Agent 和资产归因并由 trace_id 关联统一审计';
COMMENT ON COLUMN mcp_usage_logs.id IS '调用计量日志主键（UUID）';
COMMENT ON COLUMN mcp_usage_logs.tenant_id IS '调用所属租户 ID';
COMMENT ON COLUMN mcp_usage_logs.trace_id IS '与 audit_events 串联的唯一追踪 ID';
COMMENT ON COLUMN mcp_usage_logs.mcp_asset_id IS '实际调用的 MCP 企业资产 ID';
COMMENT ON COLUMN mcp_usage_logs.project_id IS '调用所属项目 ID';
COMMENT ON COLUMN mcp_usage_logs.agent_id IS '可选发起调用的 Agent 标识';
COMMENT ON COLUMN mcp_usage_logs.user_id IS '发起代理调用的员工 ID';
COMMENT ON COLUMN mcp_usage_logs.tool_name IS 'JSON-RPC 调用中的工具名称';
COMMENT ON COLUMN mcp_usage_logs.input_tokens IS '上游返回时记录的输入 Token；无法获得时为 NULL';
COMMENT ON COLUMN mcp_usage_logs.output_tokens IS '上游返回时记录的输出 Token；无法获得时为 NULL';
COMMENT ON COLUMN mcp_usage_logs.cost_micros IS '上游返回时记录的微美元成本；无法获得时为 NULL，不伪造零成本';
COMMENT ON COLUMN mcp_usage_logs.status_code IS 'AiGate 返回给调用方的 HTTP 状态码';
COMMENT ON COLUMN mcp_usage_logs.duration_ms IS '代理调用端到端耗时毫秒数';
COMMENT ON COLUMN mcp_usage_logs.created_at IS '调用发生时间（UTC）';
CREATE INDEX mcp_usage_tenant_project_idx ON mcp_usage_logs(tenant_id,project_id,created_at DESC);
COMMENT ON INDEX mcp_usage_tenant_project_idx IS '按租户和项目汇总 MCP 调用计量';

CREATE TABLE mcp_health_alerts (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mcp_asset_id uuid NOT NULL,
    consecutive_failures integer NOT NULL,
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY(tenant_id,mcp_asset_id) REFERENCES mcp_assets(tenant_id,id) ON DELETE CASCADE
);
COMMENT ON TABLE mcp_health_alerts IS 'MCP 连续健康检查失败告警；由 worker 在资产首次进入 unhealthy 时生成';
COMMENT ON COLUMN mcp_health_alerts.id IS '健康告警主键（UUID）';
COMMENT ON COLUMN mcp_health_alerts.tenant_id IS '告警所属租户 ID';
COMMENT ON COLUMN mcp_health_alerts.mcp_asset_id IS '发生连续健康失败的 MCP 资产 ID';
COMMENT ON COLUMN mcp_health_alerts.consecutive_failures IS '生成告警时累计的连续失败次数';
COMMENT ON COLUMN mcp_health_alerts.message IS '健康检查失败摘要，不包含端点和凭据';
COMMENT ON COLUMN mcp_health_alerts.created_at IS '告警生成时间（UTC）';

COMMIT;
