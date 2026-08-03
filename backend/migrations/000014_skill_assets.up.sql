BEGIN;

CREATE TABLE skills (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (btrim(name) <> ''),
    description text NOT NULL DEFAULT '',
    active_version_id uuid,
    active boolean NOT NULL DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, name),
    FOREIGN KEY (tenant_id, created_by) REFERENCES users(tenant_id, id) ON DELETE RESTRICT
);
COMMENT ON TABLE skills IS '租户 Skill 资产目录；项目使用前必须显式授权，版本内容独立保存且禁止原地覆盖';
COMMENT ON COLUMN skills.id IS 'Skill 资产 UUID，跨版本保持不变';
COMMENT ON COLUMN skills.tenant_id IS 'Skill 所属租户 ID，用于多租户强隔离';
COMMENT ON COLUMN skills.name IS '租户内唯一的 Skill 显示名称';
COMMENT ON COLUMN skills.description IS 'Skill 用途及适用边界说明';
COMMENT ON COLUMN skills.active_version_id IS '当前激活的不可变 Skill 版本 ID；创建首版后设置';
COMMENT ON COLUMN skills.active IS 'Skill 是否可被新授权和调用';
COMMENT ON COLUMN skills.created_by IS '创建 Skill 的租户用户 ID';
COMMENT ON COLUMN skills.created_at IS 'Skill 创建时间（UTC）';
COMMENT ON COLUMN skills.updated_at IS 'Skill 元数据或激活版本最后更新时间（UTC）';

CREATE TABLE skill_versions (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    instructions text NOT NULL CHECK (btrim(instructions) <> ''),
    hook jsonb NOT NULL DEFAULT '{}'::jsonb,
    source_version_id uuid,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft')),
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, skill_id, version),
    FOREIGN KEY (tenant_id, skill_id) REFERENCES skills(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, source_version_id) REFERENCES skill_versions(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, created_by) REFERENCES users(tenant_id, id) ON DELETE RESTRICT
);
COMMENT ON TABLE skill_versions IS 'Skill 不可变版本内容；更新和优化只能插入新版本，不能改写既有版本';
COMMENT ON COLUMN skill_versions.id IS 'Skill 版本 UUID，供 Agent 固定绑定';
COMMENT ON COLUMN skill_versions.tenant_id IS '版本所属租户 ID';
COMMENT ON COLUMN skill_versions.skill_id IS '版本所属 Skill 资产 ID';
COMMENT ON COLUMN skill_versions.version IS 'Skill 内单调递增版本号';
COMMENT ON COLUMN skill_versions.instructions IS '调用时注入 Agent 上下文的 Skill 指令';
COMMENT ON COLUMN skill_versions.hook IS 'Skill 生命周期钩子配置；当前仅保存结构化配置';
COMMENT ON COLUMN skill_versions.source_version_id IS '优化生成版本的来源版本 ID，人工首版为空';
COMMENT ON COLUMN skill_versions.status IS '版本状态：active 可绑定，draft 为优化候选且不影响线上';
COMMENT ON COLUMN skill_versions.created_by IS '创建该版本的租户用户 ID';
COMMENT ON COLUMN skill_versions.created_at IS '版本创建时间（UTC）';
ALTER TABLE skills ADD CONSTRAINT skills_active_version_fk FOREIGN KEY (tenant_id, active_version_id) REFERENCES skill_versions(tenant_id, id) ON DELETE RESTRICT;

CREATE TABLE skill_grants (
    tenant_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    project_id uuid NOT NULL,
    granted_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, skill_id, project_id),
    FOREIGN KEY (tenant_id, skill_id) REFERENCES skills(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, granted_by) REFERENCES users(tenant_id, id) ON DELETE RESTRICT
);
COMMENT ON TABLE skill_grants IS 'Skill 对项目的显式授权；租户目录可见不代表项目可调用';
COMMENT ON COLUMN skill_grants.tenant_id IS '授权所属租户 ID';
COMMENT ON COLUMN skill_grants.skill_id IS '获授权的 Skill 资产 ID';
COMMENT ON COLUMN skill_grants.project_id IS '被授权调用 Skill 的项目 ID';
COMMENT ON COLUMN skill_grants.granted_by IS '执行授权的管理员用户 ID';
COMMENT ON COLUMN skill_grants.created_at IS '授权创建时间（UTC）';

CREATE TABLE agent_skill_bindings (
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    skill_version_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, agent_id, skill_id),
    FOREIGN KEY (tenant_id, project_id, agent_id) REFERENCES project_agents(tenant_id, project_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, skill_id, project_id) REFERENCES skill_grants(tenant_id, skill_id, project_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, skill_version_id) REFERENCES skill_versions(tenant_id, id) ON DELETE RESTRICT
);
COMMENT ON TABLE agent_skill_bindings IS 'Agent 的 Skill 固定版本绑定，防止激活版本升级导致线上行为漂移';
COMMENT ON COLUMN agent_skill_bindings.tenant_id IS '绑定所属租户 ID';
COMMENT ON COLUMN agent_skill_bindings.project_id IS 'Agent 与授权共同所属项目 ID';
COMMENT ON COLUMN agent_skill_bindings.agent_id IS '使用 Skill 的项目 Agent ID';
COMMENT ON COLUMN agent_skill_bindings.skill_id IS '绑定的 Skill 资产 ID';
COMMENT ON COLUMN agent_skill_bindings.skill_version_id IS '绑定时固定的 Skill 版本 ID';
COMMENT ON COLUMN agent_skill_bindings.created_at IS '绑定创建时间（UTC）';

CREATE TABLE skill_memories (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    skill_version_id uuid NOT NULL,
    user_id uuid NOT NULL,
    input text NOT NULL,
    output text NOT NULL,
    trace_id text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, skill_id) REFERENCES skills(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, skill_version_id) REFERENCES skill_versions(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, project_id, agent_id) REFERENCES project_agents(tenant_id, project_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE CASCADE
);
COMMENT ON TABLE skill_memories IS 'Skill 调用上下文记忆；写入后按 Skill/Agent/用户仅保留最近 100 条';
COMMENT ON COLUMN skill_memories.id IS 'Skill memory UUID';
COMMENT ON COLUMN skill_memories.tenant_id IS '记忆所属租户 ID';
COMMENT ON COLUMN skill_memories.project_id IS '记忆产生的项目 ID';
COMMENT ON COLUMN skill_memories.agent_id IS '记忆产生的 Agent ID';
COMMENT ON COLUMN skill_memories.skill_id IS '记忆所属 Skill ID';
COMMENT ON COLUMN skill_memories.skill_version_id IS '产生记忆时实际执行的固定版本 ID';
COMMENT ON COLUMN skill_memories.user_id IS '触发调用的用户 ID';
COMMENT ON COLUMN skill_memories.input IS '本次 Skill 调用输入';
COMMENT ON COLUMN skill_memories.output IS '本次 Skill 调用输出摘要';
COMMENT ON COLUMN skill_memories.trace_id IS '关联 Gateway 调用的 trace id';
COMMENT ON COLUMN skill_memories.created_at IS '记忆创建时间（UTC）';
CREATE INDEX skill_memories_retention_idx ON skill_memories(tenant_id, skill_id, agent_id, user_id, created_at DESC);
COMMENT ON INDEX skill_memories_retention_idx IS '支持按 Skill/Agent/用户读取最近记忆并执行 100 条保留策略';

CREATE TABLE skill_usage_events (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    skill_version_id uuid NOT NULL,
    user_id uuid NOT NULL,
    trace_id text NOT NULL DEFAULT '',
    event_type text NOT NULL DEFAULT 'skill.invoke',
    cost_micros bigint NOT NULL DEFAULT 0 CHECK (cost_micros >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, skill_id) REFERENCES skills(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, skill_version_id) REFERENCES skill_versions(tenant_id, id) ON DELETE RESTRICT
);
COMMENT ON TABLE skill_usage_events IS 'Skill 可计费用量事件；每次 Agent Skill 调用均保留 skill_id 维度';
COMMENT ON COLUMN skill_usage_events.id IS 'Skill 用量事件 UUID';
COMMENT ON COLUMN skill_usage_events.tenant_id IS '事件所属租户 ID';
COMMENT ON COLUMN skill_usage_events.project_id IS '事件归因项目 ID';
COMMENT ON COLUMN skill_usage_events.agent_id IS '事件归因 Agent ID';
COMMENT ON COLUMN skill_usage_events.skill_id IS '计费维度 Skill ID，禁止为空';
COMMENT ON COLUMN skill_usage_events.skill_version_id IS '调用时固定的 Skill 版本 ID';
COMMENT ON COLUMN skill_usage_events.user_id IS '触发调用的用户 ID';
COMMENT ON COLUMN skill_usage_events.trace_id IS '关联 Gateway 调用 trace id';
COMMENT ON COLUMN skill_usage_events.event_type IS '事件类型，当前为 skill.invoke';
COMMENT ON COLUMN skill_usage_events.cost_micros IS 'Skill 独立费用（微货币单位）；未配置定价时为零';
COMMENT ON COLUMN skill_usage_events.created_at IS '事件创建时间（UTC）';
CREATE INDEX skill_usage_events_scope_idx ON skill_usage_events(tenant_id, project_id, skill_id, created_at DESC);
COMMENT ON INDEX skill_usage_events_scope_idx IS '按租户、项目和 Skill 汇总用量及计费事件';

COMMIT;
