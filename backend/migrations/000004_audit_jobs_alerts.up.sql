BEGIN;

CREATE TABLE audit_events (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trace_id text NOT NULL,
    event_type text NOT NULL CHECK (btrim(event_type) <> ''),
    actor_user_id uuid,
    resource_type text NOT NULL DEFAULT '',
    resource_id text NOT NULL DEFAULT '',
    outcome text NOT NULL CHECK (btrim(outcome) <> ''),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
COMMENT ON TABLE audit_events IS '跨网关、MCP 与 Agent 的统一租户审计事件，通过 trace_id 串联一次业务调用';
COMMENT ON COLUMN audit_events.id IS '审计事件主键（UUID）';
COMMENT ON COLUMN audit_events.tenant_id IS '事件所属租户，所有查询必须以此字段隔离';
COMMENT ON COLUMN audit_events.trace_id IS '跨组件传播的调用追踪标识';
COMMENT ON COLUMN audit_events.event_type IS '稳定事件类型，例如 gateway.call 或 quota.blocked';
COMMENT ON COLUMN audit_events.actor_user_id IS '可选操作员工；系统事件可为空';
COMMENT ON COLUMN audit_events.resource_type IS '被操作资源类型；无明确资源时为空字符串';
COMMENT ON COLUMN audit_events.resource_id IS '被操作资源标识；允许保存模型名等非 UUID 标识';
COMMENT ON COLUMN audit_events.outcome IS '事件结果，例如 success、failure 或 blocked';
COMMENT ON COLUMN audit_events.metadata IS '事件扩展属性 JSON，不存放密钥或上游凭据';
COMMENT ON COLUMN audit_events.created_at IS '事件发生并写入数据库的 UTC 时间';
CREATE INDEX audit_events_tenant_created_idx ON audit_events (tenant_id, created_at DESC);
CREATE INDEX audit_events_tenant_trace_idx ON audit_events (tenant_id, trace_id);
CREATE INDEX audit_events_tenant_type_created_idx ON audit_events (tenant_id, event_type, created_at DESC);
COMMENT ON INDEX audit_events_tenant_created_idx IS '支持按租户和时间范围倒序读取审计事件';
COMMENT ON INDEX audit_events_tenant_trace_idx IS '支持租户内按 trace_id 串联跨组件事件';
COMMENT ON INDEX audit_events_tenant_type_created_idx IS '支持租户内按事件类型和时间筛选';

CREATE FUNCTION enforce_audit_actor_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.actor_user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM users WHERE id = NEW.actor_user_id AND tenant_id = NEW.tenant_id
    ) THEN
        RAISE EXCEPTION 'audit actor must belong to event tenant';
    END IF;
    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION enforce_audit_actor_tenant() IS '保证审计 actor 与事件属于同一租户，同时允许员工删除后 actor 置空保留历史';
CREATE TRIGGER audit_events_actor_tenant BEFORE INSERT OR UPDATE OF tenant_id, actor_user_id ON audit_events FOR EACH ROW EXECUTE FUNCTION enforce_audit_actor_tenant();
COMMENT ON TRIGGER audit_events_actor_tenant ON audit_events IS '写入审计事件时拒绝跨租户 actor 引用';

CREATE TABLE jobs (
    id uuid PRIMARY KEY,
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    job_type text NOT NULL CHECK (btrim(job_type) <> ''),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','dead_letter')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
    available_at timestamptz NOT NULL DEFAULT now(),
    locked_by text,
    locked_until timestamptz,
    last_error text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE jobs IS 'MVP PostgreSQL 后台任务队列；worker 使用行锁和租约避免重复抢占';
COMMENT ON COLUMN jobs.id IS '后台任务主键（UUID）';
COMMENT ON COLUMN jobs.tenant_id IS '可选任务所属租户；平台级任务可为空';
COMMENT ON COLUMN jobs.job_type IS 'worker handler 注册使用的稳定任务类型';
COMMENT ON COLUMN jobs.payload IS '任务输入 JSON；不得保存明文密钥或渠道凭据';
COMMENT ON COLUMN jobs.status IS '任务状态：pending、running、completed 或 dead_letter';
COMMENT ON COLUMN jobs.attempts IS '已被 worker 抢占执行的次数';
COMMENT ON COLUMN jobs.max_attempts IS '允许执行的最大次数，达到后进入 dead_letter';
COMMENT ON COLUMN jobs.available_at IS 'pending 任务下一次允许被抢占的 UTC 时间';
COMMENT ON COLUMN jobs.locked_by IS '当前持有任务租约的 worker 标识';
COMMENT ON COLUMN jobs.locked_until IS '当前 worker 租约到期时间，过期 running 任务可被重新抢占';
COMMENT ON COLUMN jobs.last_error IS '最近一次执行失败的截断错误信息';
COMMENT ON COLUMN jobs.created_at IS '任务创建时间（UTC）';
COMMENT ON COLUMN jobs.updated_at IS '任务状态最后更新时间（UTC）';
CREATE INDEX jobs_claim_idx ON jobs (status, available_at, created_at) WHERE status IN ('pending','running');
COMMENT ON INDEX jobs_claim_idx IS 'worker 按可执行时间寻找 pending 或租约过期 running 任务';

CREATE TABLE alert_policies (
    tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    thresholds smallint[] NOT NULL DEFAULT ARRAY[70,90,100]::smallint[],
    webhook_url text NOT NULL DEFAULT '',
    cooldown_seconds integer NOT NULL DEFAULT 3600 CHECK (cooldown_seconds > 0),
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (cardinality(thresholds) > 0)
);
COMMENT ON TABLE alert_policies IS '租户配额阈值与 webhook 通知策略；未配置租户使用 70/90/100 默认阈值';
COMMENT ON COLUMN alert_policies.tenant_id IS '策略所属租户且每租户最多一条';
COMMENT ON COLUMN alert_policies.thresholds IS '触发告警的用量百分比阈值数组，元素必须由服务校验为 1 到 100';
COMMENT ON COLUMN alert_policies.webhook_url IS '告警通知 HTTP(S) 地址；空字符串表示只记录告警';
COMMENT ON COLUMN alert_policies.cooldown_seconds IS '同一配额范围与阈值重复告警的去重时间窗秒数';
COMMENT ON COLUMN alert_policies.enabled IS '是否评估并创建该租户配额告警';
COMMENT ON COLUMN alert_policies.created_at IS '策略创建时间（UTC）';
COMMENT ON COLUMN alert_policies.updated_at IS '策略最后更新时间（UTC）';

CREATE TABLE quota_alerts (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope_type text NOT NULL CHECK (scope_type IN ('tenant','organization','user')),
    scope_id uuid NOT NULL,
    threshold smallint NOT NULL CHECK (threshold BETWEEN 1 AND 100),
    usage_percent numeric(7,2) NOT NULL CHECK (usage_percent >= 0),
    used_tokens bigint NOT NULL CHECK (used_tokens >= 0),
    limit_tokens bigint NOT NULL CHECK (limit_tokens >= 0),
    cooldown_bucket bigint NOT NULL,
    delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','not_configured','delivered','failed')),
    delivered_at timestamptz,
    last_error text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, scope_type, scope_id, threshold, cooldown_bucket)
);
COMMENT ON TABLE quota_alerts IS '租户、部门和员工配额跨阈值记录；cooldown bucket 防止重复通知';
COMMENT ON COLUMN quota_alerts.id IS '配额告警主键（UUID）';
COMMENT ON COLUMN quota_alerts.tenant_id IS '告警所属租户，API 查询必须以此隔离';
COMMENT ON COLUMN quota_alerts.scope_type IS '触发阈值的配额层级：tenant、organization 或 user';
COMMENT ON COLUMN quota_alerts.scope_id IS '触发阈值的租户、部门或员工 ID';
COMMENT ON COLUMN quota_alerts.threshold IS '本次跨越的策略阈值百分比';
COMMENT ON COLUMN quota_alerts.usage_percent IS '创建告警时已用 Token 占额度的百分比快照';
COMMENT ON COLUMN quota_alerts.used_tokens IS '创建告警时已结算 Token 数快照';
COMMENT ON COLUMN quota_alerts.limit_tokens IS '创建告警时配额上限 Token 数快照';
COMMENT ON COLUMN quota_alerts.cooldown_bucket IS '按策略 cooldown 秒数划分的去重时间桶';
COMMENT ON COLUMN quota_alerts.delivery_status IS 'webhook 投递状态；无地址时为 not_configured';
COMMENT ON COLUMN quota_alerts.delivered_at IS 'webhook 成功响应的 UTC 时间';
COMMENT ON COLUMN quota_alerts.last_error IS '最近一次 webhook 投递错误的截断文本';
COMMENT ON COLUMN quota_alerts.created_at IS '告警创建时间（UTC）';
CREATE INDEX quota_alerts_tenant_created_idx ON quota_alerts (tenant_id, created_at DESC);
COMMENT ON INDEX quota_alerts_tenant_created_idx IS '支持管理员按租户倒序查询配额告警';

COMMIT;
