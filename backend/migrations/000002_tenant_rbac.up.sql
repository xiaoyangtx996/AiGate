BEGIN;

ALTER TABLE projects
    ADD CONSTRAINT projects_tenant_id_id_key UNIQUE (tenant_id, id);

COMMENT ON CONSTRAINT projects_tenant_id_id_key ON projects IS '供项目成员 ACL 使用的租户复合引用键；确保任何项目授权同时匹配 tenant_id 与 project_id';

CREATE TABLE roles (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL CHECK (btrim(code) <> '' AND code = lower(code)),
    name text NOT NULL CHECK (btrim(name) <> ''),
    description text NOT NULL DEFAULT '',
    system_role boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code),
    UNIQUE (tenant_id, id)
);

COMMENT ON TABLE roles IS '租户内角色定义；平台管理员与项目成员为系统角色，其他角色可由管理员维护';
COMMENT ON COLUMN roles.id IS '角色主键（UUID）';
COMMENT ON COLUMN roles.tenant_id IS '角色所属租户 ID；所有角色查询和授权必须带此隔离条件';
COMMENT ON COLUMN roles.code IS '租户内唯一的小写角色代码；platform_admin 与 project_member 为 MVP 系统代码';
COMMENT ON COLUMN roles.name IS '角色显示名称';
COMMENT ON COLUMN roles.description IS '角色职责和授权范围说明';
COMMENT ON COLUMN roles.system_role IS '是否为系统保留角色；系统角色不可通过普通角色 CRUD 删除或改码';
COMMENT ON COLUMN roles.created_at IS '角色创建时间（UTC，timestamptz）';
COMMENT ON COLUMN roles.updated_at IS '角色最后更新时间（UTC，timestamptz）';

CREATE TABLE users (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL,
    email text NOT NULL CHECK (btrim(email) <> '' AND email = lower(email)),
    display_name text NOT NULL DEFAULT '',
    password_hash text NOT NULL CHECK (btrim(password_hash) <> ''),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, organization_id)
        REFERENCES organizations(tenant_id, id) ON DELETE RESTRICT
);

COMMENT ON TABLE users IS '员工身份：固定挂接租户内一个部门，通过角色和独立项目成员关系取得权限';
COMMENT ON COLUMN users.id IS '用户/员工主键（UUID）';
COMMENT ON COLUMN users.tenant_id IS '用户所属租户 ID；身份查询和写入的强制隔离键';
COMMENT ON COLUMN users.organization_id IS '员工所属部门 ID；与 tenant_id 组成复合外键，禁止跨租户或孤儿挂接';
COMMENT ON COLUMN users.email IS '租户内唯一的规范化小写登录邮箱';
COMMENT ON COLUMN users.display_name IS '员工显示名称';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 密码摘要；不得保存或返回明文密码';
COMMENT ON COLUMN users.active IS '账号是否允许登录；停用后既有令牌仍受有效期限制，后续请求可扩展实时吊销';
COMMENT ON COLUMN users.created_at IS '用户创建时间（UTC，timestamptz）';
COMMENT ON COLUMN users.updated_at IS '用户最后更新时间（UTC，timestamptz）';

CREATE TABLE user_roles (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id, role_id),
    FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, role_id) REFERENCES roles(tenant_id, id) ON DELETE CASCADE
);

COMMENT ON TABLE user_roles IS '租户内用户与角色的多对多关系；复合外键阻止跨租户角色授予';
COMMENT ON COLUMN user_roles.tenant_id IS '关系所属租户 ID；同时约束用户和角色必须属于同一租户';
COMMENT ON COLUMN user_roles.user_id IS '被授予角色的用户 ID';
COMMENT ON COLUMN user_roles.role_id IS '授予用户的角色 ID';
COMMENT ON COLUMN user_roles.created_at IS '角色授予时间（UTC，timestamptz）';

CREATE TABLE project_memberships (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, project_id, user_id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE CASCADE
);

COMMENT ON TABLE project_memberships IS '项目成员 ACL：独立于部门树，显式授权员工访问项目资产容器';
COMMENT ON COLUMN project_memberships.tenant_id IS '关系所属租户 ID；与项目、用户复合外键共同保证租户隔离';
COMMENT ON COLUMN project_memberships.project_id IS '被授权访问的项目 ID；项目仍是资产容器而非组织节点';
COMMENT ON COLUMN project_memberships.user_id IS '获得项目访问权的用户 ID';
COMMENT ON COLUMN project_memberships.created_at IS '项目访问授权时间（UTC，timestamptz）';

CREATE INDEX users_tenant_organization_idx ON users (tenant_id, organization_id);
CREATE INDEX user_roles_tenant_role_idx ON user_roles (tenant_id, role_id);
CREATE INDEX project_memberships_tenant_user_idx ON project_memberships (tenant_id, user_id);

COMMENT ON INDEX users_tenant_organization_idx IS '按租户和部门列出员工，tenant_id 为首列确保隔离查询可用索引';
COMMENT ON INDEX user_roles_tenant_role_idx IS '按租户和角色查找被授权用户';
COMMENT ON INDEX project_memberships_tenant_user_idx IS '按租户和用户校验或列出项目 ACL';

CREATE FUNCTION create_tenant_system_roles() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO roles (id, tenant_id, code, name, description, system_role)
    VALUES
        (md5(NEW.id::text || ':platform_admin')::uuid, NEW.id, 'platform_admin', '平台管理员', '管理租户内用户、角色、部门和项目成员授权', true),
        (md5(NEW.id::text || ':project_member')::uuid, NEW.id, 'project_member', '项目成员', '可通过独立项目成员 ACL 使用获授权的项目资产', true);
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION create_tenant_system_roles() IS '为新租户创建 platform_admin 和 project_member 两个 MVP 系统角色';

CREATE TRIGGER tenants_create_system_roles
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_tenant_system_roles();

COMMENT ON TRIGGER tenants_create_system_roles ON tenants IS '租户创建后自动补齐 MVP 系统角色，避免出现无基础角色的租户';

INSERT INTO roles (id, tenant_id, code, name, description, system_role)
SELECT md5(t.id::text || role.seed)::uuid, t.id, role.code, role.name, role.description, true
FROM tenants t
CROSS JOIN (VALUES
    (':platform_admin', 'platform_admin', '平台管理员', '管理租户内用户、角色、部门和项目成员授权'),
    (':project_member', 'project_member', '项目成员', '可通过独立项目成员 ACL 使用获授权的项目资产')
) AS role(seed, code, name, description)
ON CONFLICT (tenant_id, code) DO NOTHING;

COMMIT;
