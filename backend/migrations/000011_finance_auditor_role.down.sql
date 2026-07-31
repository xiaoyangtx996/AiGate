BEGIN;

DELETE FROM roles WHERE code='finance_auditor' AND system_role;

CREATE OR REPLACE FUNCTION create_tenant_system_roles() RETURNS trigger
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

COMMIT;
