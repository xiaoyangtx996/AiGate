BEGIN;

CREATE TABLE api_keys (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL CHECK (btrim(name) <> ''),
    key_prefix text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    allowed_cidrs text[] NOT NULL DEFAULT '{}',
    active boolean NOT NULL DEFAULT true,
    last_used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, organization_id) REFERENCES organizations(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE CASCADE
);
COMMENT ON TABLE api_keys IS '员工 OpenAI 兼容入口密钥；只保存 SHA-256 摘要并绑定租户、部门和员工';
COMMENT ON COLUMN api_keys.id IS 'API Key 记录主键（UUID）';
COMMENT ON COLUMN api_keys.tenant_id IS '所属租户 ID；所有密钥认证和管理查询的隔离键';
COMMENT ON COLUMN api_keys.organization_id IS '密钥绑定部门 ID（与员工当前部门保持同步）；网关认证时以 users.organization_id 为准扣配额与写日志';
COMMENT ON COLUMN api_keys.user_id IS '密钥绑定员工 ID；复合外键确保员工属于同一租户';
COMMENT ON COLUMN api_keys.name IS '管理员可识别的密钥名称';
COMMENT ON COLUMN api_keys.key_prefix IS '明文密钥的短前缀，仅用于界面识别，不用于认证';
COMMENT ON COLUMN api_keys.key_hash IS '完整明文密钥的 SHA-256 十六进制摘要；数据库不保存明文';
COMMENT ON COLUMN api_keys.allowed_cidrs IS '可选客户端 IP CIDR 白名单；空数组表示不限制';
COMMENT ON COLUMN api_keys.active IS '密钥是否可用于网关认证';
COMMENT ON COLUMN api_keys.last_used_at IS '最近一次成功通过密钥认证的时间';
COMMENT ON COLUMN api_keys.created_at IS '密钥创建时间（UTC）';
COMMENT ON COLUMN api_keys.updated_at IS '密钥最后更新时间（UTC）';
CREATE INDEX api_keys_tenant_user_idx ON api_keys (tenant_id, user_id);
COMMENT ON INDEX api_keys_tenant_user_idx IS '按租户和员工管理其 API Key，确保租户过滤走索引';

CREATE TABLE quota_accounts (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope_type text NOT NULL CHECK (scope_type IN ('tenant','organization','user')),
    scope_id uuid NOT NULL,
    limit_tokens bigint NOT NULL CHECK (limit_tokens >= 0),
    used_tokens bigint NOT NULL DEFAULT 0 CHECK (used_tokens >= 0),
    reserved_tokens bigint NOT NULL DEFAULT 0 CHECK (reserved_tokens >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, scope_type, scope_id)
);
COMMENT ON TABLE quota_accounts IS '三级 Token 配额账户；租户→部门→员工分配必须满足父额度不小于直属子额度总和';
COMMENT ON COLUMN quota_accounts.tenant_id IS '配额所属租户 ID；配额配置和扣减的隔离键';
COMMENT ON COLUMN quota_accounts.scope_type IS '配额层级：tenant、organization 或 user';
COMMENT ON COLUMN quota_accounts.scope_id IS '层级实体 UUID；由服务事务按 scope_type 校验对应租户实体';
COMMENT ON COLUMN quota_accounts.limit_tokens IS '该层级周期内可用 Token 总额度';
COMMENT ON COLUMN quota_accounts.used_tokens IS '已结算的实际 Token 数';
COMMENT ON COLUMN quota_accounts.reserved_tokens IS '并发请求预留但尚未结算的 Token 数';
COMMENT ON COLUMN quota_accounts.updated_at IS '配额配置或用量最后更新时间（UTC）';
CREATE INDEX quota_accounts_tenant_scope_idx ON quota_accounts (tenant_id, scope_type);
COMMENT ON INDEX quota_accounts_tenant_scope_idx IS '按租户与层级汇总子配额并执行守恒检查';

CREATE FUNCTION cleanup_organization_quota_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM quota_accounts WHERE tenant_id = OLD.tenant_id AND scope_type = 'organization' AND scope_id = OLD.id;
    RETURN OLD;
END;
$$;
COMMENT ON FUNCTION cleanup_organization_quota_account() IS '部门删除时同步删除其 quota_accounts 行，避免通用 scope_id 产生孤儿配额';
CREATE TRIGGER organizations_cleanup_quota AFTER DELETE ON organizations FOR EACH ROW EXECUTE FUNCTION cleanup_organization_quota_account();
COMMENT ON TRIGGER organizations_cleanup_quota ON organizations IS '部门删除后清理同租户同部门的配额账户';

CREATE FUNCTION cleanup_user_quota_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM quota_accounts WHERE tenant_id = OLD.tenant_id AND scope_type = 'user' AND scope_id = OLD.id;
    RETURN OLD;
END;
$$;
COMMENT ON FUNCTION cleanup_user_quota_account() IS '员工删除时同步删除其 quota_accounts 行，避免通用 scope_id 产生孤儿配额';
CREATE TRIGGER users_cleanup_quota AFTER DELETE ON users FOR EACH ROW EXECUTE FUNCTION cleanup_user_quota_account();
COMMENT ON TRIGGER users_cleanup_quota ON users IS '员工删除后清理同租户同员工的配额账户';

CREATE TABLE quota_reservations (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reserved_tokens bigint NOT NULL CHECK (reserved_tokens > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, organization_id) REFERENCES organizations(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE CASCADE
);
COMMENT ON TABLE quota_reservations IS '网关并发调用的短期 Token 预留；响应结算或失败取消后删除';
COMMENT ON COLUMN quota_reservations.id IS '预留记录主键（UUID），用于一次性结算或取消';
COMMENT ON COLUMN quota_reservations.tenant_id IS '预留所属租户 ID';
COMMENT ON COLUMN quota_reservations.organization_id IS '同时扣减预留量的部门账户 ID';
COMMENT ON COLUMN quota_reservations.user_id IS '同时扣减预留量的员工账户 ID';
COMMENT ON COLUMN quota_reservations.reserved_tokens IS '本次调用预估并预留的 Token 数';
COMMENT ON COLUMN quota_reservations.created_at IS '预留创建时间（UTC）';
CREATE INDEX quota_reservations_tenant_created_idx ON quota_reservations (tenant_id, created_at);
COMMENT ON INDEX quota_reservations_tenant_created_idx IS '按租户查找超时预留，供后续运维清理使用；本计划不实现 worker';

CREATE TABLE model_prices (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    model text NOT NULL,
    upstream_model text NOT NULL CHECK (btrim(upstream_model) <> ''),
    input_micros_per_million bigint NOT NULL CHECK (input_micros_per_million >= 0),
    output_micros_per_million bigint NOT NULL CHECK (output_micros_per_million >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, model)
);
COMMENT ON TABLE model_prices IS '网关公开模型到 NewAPI 上游模型的映射及每百万 Token 微美元单价';
COMMENT ON COLUMN model_prices.tenant_id IS '模型映射所属租户 ID；渠道选择和价格查询必须按租户隔离';
COMMENT ON COLUMN model_prices.model IS '客户端请求使用的公开模型名';
COMMENT ON COLUMN model_prices.upstream_model IS '转发给 NewAPI sidecar 的模型名';
COMMENT ON COLUMN model_prices.input_micros_per_million IS '每百万输入 Token 的微美元成本单价';
COMMENT ON COLUMN model_prices.output_micros_per_million IS '每百万输出 Token 的微美元成本单价';
COMMENT ON COLUMN model_prices.updated_at IS '模型映射或价格最后更新时间（UTC）';

CREATE TABLE channels (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (btrim(name) <> ''),
    base_url text NOT NULL CHECK (btrim(base_url) <> ''),
    encrypted_credential text NOT NULL CHECK (btrim(encrypted_credential) <> ''),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE channels IS 'NewAPI 或上游供应商渠道配置；凭据使用 AES-256-GCM 加密后落库';
COMMENT ON COLUMN channels.id IS '渠道主键（UUID）';
COMMENT ON COLUMN channels.tenant_id IS '渠道所属租户 ID；凭据和路由选择严格按租户隔离';
COMMENT ON COLUMN channels.name IS '渠道显示名称';
COMMENT ON COLUMN channels.base_url IS 'OpenAI 兼容上游基础 URL，通常指向 NewAPI sidecar';
COMMENT ON COLUMN channels.encrypted_credential IS 'AES-256-GCM 加密并包含随机 nonce 的上游 Bearer 凭据';
COMMENT ON COLUMN channels.active IS '渠道是否允许承接网关流量';
COMMENT ON COLUMN channels.created_at IS '渠道创建时间（UTC）';
COMMENT ON COLUMN channels.updated_at IS '渠道最后更新时间（UTC）';
CREATE INDEX channels_tenant_active_idx ON channels (tenant_id, active);
COMMENT ON INDEX channels_tenant_active_idx IS '按租户选择启用渠道，防止跨租户读取上游凭据';
CREATE UNIQUE INDEX channels_one_active_per_tenant_idx ON channels (tenant_id) WHERE active;
COMMENT ON INDEX channels_one_active_per_tenant_idx IS 'MVP 每租户只允许一个启用的 NewAPI sidecar 渠道，确保路由选择确定';

CREATE TABLE api_logs (
    id uuid PRIMARY KEY,
    trace_id text NOT NULL UNIQUE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    api_key_id uuid,
    model text NOT NULL,
    input_tokens bigint NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens bigint NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    total_tokens bigint NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
    cost_micros bigint,
    estimated boolean NOT NULL,
    blocked boolean NOT NULL DEFAULT false,
    status_code integer NOT NULL,
    error_code text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, organization_id) REFERENCES organizations(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, api_key_id) REFERENCES api_keys(tenant_id, id) ON DELETE RESTRICT
);
COMMENT ON TABLE api_logs IS 'AiGate 网关调用日志；成功、上游失败和配额拦截均写入，用于计量追踪';
COMMENT ON COLUMN api_logs.id IS '调用日志主键（UUID）';
COMMENT ON COLUMN api_logs.trace_id IS '贯穿 AiGate 与 NewAPI 的唯一追踪 ID，并通过响应头返回';
COMMENT ON COLUMN api_logs.tenant_id IS '调用所属租户 ID，日志查询必须按此隔离';
COMMENT ON COLUMN api_logs.organization_id IS '调用员工所属部门 ID';
COMMENT ON COLUMN api_logs.user_id IS '发起调用的员工 ID';
COMMENT ON COLUMN api_logs.api_key_id IS '本次认证使用的员工 API Key；密钥采用 active=false 停用而不物理删除，以保留日志引用';
COMMENT ON COLUMN api_logs.model IS '客户端请求的公开模型名';
COMMENT ON COLUMN api_logs.input_tokens IS '上游 usage 返回的输入/提示 Token 数';
COMMENT ON COLUMN api_logs.output_tokens IS '上游 usage 返回的输出/完成 Token 数';
COMMENT ON COLUMN api_logs.total_tokens IS '用于配额结算的总 Token 数';
COMMENT ON COLUMN api_logs.cost_micros IS '按模型输入输出单价计算的微美元成本；无价格时为 NULL，禁止伪造零成本';
COMMENT ON COLUMN api_logs.estimated IS '成本或 token 是否包含估算；缺少可靠价格/usage 时为 true';
COMMENT ON COLUMN api_logs.blocked IS '请求是否在调用上游前被配额预检拦截';
COMMENT ON COLUMN api_logs.status_code IS '返回给客户端的 HTTP 状态码';
COMMENT ON COLUMN api_logs.error_code IS '稳定错误代码；成功为空字符串';
COMMENT ON COLUMN api_logs.created_at IS '日志写入时间（UTC）';
CREATE INDEX api_logs_tenant_created_idx ON api_logs (tenant_id, created_at DESC);
CREATE INDEX api_logs_tenant_user_created_idx ON api_logs (tenant_id, user_id, created_at DESC);
COMMENT ON INDEX api_logs_tenant_created_idx IS '按租户倒序查询网关调用日志';
COMMENT ON INDEX api_logs_tenant_user_created_idx IS '按租户和员工查询个人调用日志';

COMMIT;
