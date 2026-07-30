BEGIN;

-- 租户：数据隔离边界（一组组织、用户与资产的归属根）
CREATE TABLE tenants (
    id uuid PRIMARY KEY,
    name text NOT NULL CHECK (btrim(name) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS '租户：多租户隔离根实体；其下组织、用户、项目等业务数据均归属某一租户';
COMMENT ON COLUMN tenants.id IS '租户主键（UUID）';
COMMENT ON COLUMN tenants.name IS '租户显示名称；非空且去空白后不可为空串';
COMMENT ON COLUMN tenants.created_at IS '创建时间（UTC，timestamptz）';
COMMENT ON COLUMN tenants.updated_at IS '最后更新时间（UTC，timestamptz）';

-- 组织/部门：租户内行政树的部门节点（MVP 不建更深递归；员工挂接在后续身份表）
CREATE TABLE organizations (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (btrim(name) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name),
    UNIQUE (tenant_id, id)
);

COMMENT ON TABLE organizations IS '组织（部门）：租户内部门级节点；MVP 组织深度为 租户→部门→员工，本表表示部门；删除租户时级联删除';
COMMENT ON COLUMN organizations.id IS '组织/部门主键（UUID）';
COMMENT ON COLUMN organizations.tenant_id IS '所属租户 ID；强制租户隔离，引用 tenants.id，ON DELETE CASCADE';
COMMENT ON COLUMN organizations.name IS '部门显示名称；同一租户内唯一；非空且去空白后不可为空串';
COMMENT ON COLUMN organizations.created_at IS '创建时间（UTC，timestamptz）';
COMMENT ON COLUMN organizations.updated_at IS '最后更新时间（UTC，timestamptz）';

-- 项目：资产容器（知识库/MCP/Agent 等），不是组织树的第四级
CREATE TABLE projects (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL,
    name text NOT NULL CHECK (btrim(name) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name),
    FOREIGN KEY (tenant_id, organization_id)
        REFERENCES organizations(tenant_id, id) ON DELETE CASCADE
);

COMMENT ON TABLE projects IS '项目：租户内资产容器（KB/MCP/Agent 等挂靠于此）；不是组织层级的第四级；须同时归属租户与某一部门';
COMMENT ON COLUMN projects.id IS '项目主键（UUID）';
COMMENT ON COLUMN projects.tenant_id IS '所属租户 ID；与 organization_id 组成复合外键，保证部门同属该租户';
COMMENT ON COLUMN projects.organization_id IS '归属部门 ID；与 tenant_id 一起引用 organizations(tenant_id, id)，防止跨租户挂接';
COMMENT ON COLUMN projects.name IS '项目显示名称；同一租户内唯一；非空且去空白后不可为空串';
COMMENT ON COLUMN projects.created_at IS '创建时间（UTC，timestamptz）';
COMMENT ON COLUMN projects.updated_at IS '最后更新时间（UTC，timestamptz）';

CREATE INDEX organizations_tenant_id_idx ON organizations (tenant_id);
CREATE INDEX projects_tenant_id_idx ON projects (tenant_id);
CREATE INDEX projects_organization_id_idx ON projects (organization_id);

COMMENT ON INDEX organizations_tenant_id_idx IS '按租户列出/过滤部门';
COMMENT ON INDEX projects_tenant_id_idx IS '按租户列出/过滤项目';
COMMENT ON INDEX projects_organization_id_idx IS '按部门列出其下项目';

COMMIT;
