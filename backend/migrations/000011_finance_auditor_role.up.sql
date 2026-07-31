BEGIN;

CREATE OR REPLACE FUNCTION create_tenant_system_roles() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO roles (id, tenant_id, code, name, description, system_role)
    VALUES
        (md5(NEW.id::text || ':platform_admin')::uuid, NEW.id, 'platform_admin', '平台管理员', '管理租户内用户、角色、部门和项目成员授权', true),
        (md5(NEW.id::text || ':project_member')::uuid, NEW.id, 'project_member', '项目成员', '可通过独立项目成员 ACL 使用获授权的项目资产', true),
        (md5(NEW.id::text || ':finance_auditor')::uuid, NEW.id, 'finance_auditor', '财务审计', '只读查看调用日志、用量看板并导出按组织、项目和日期汇总的成本 CSV', true);
    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION create_tenant_system_roles() IS '为新租户创建平台管理员、项目成员和财务审计三个系统角色；财务审计角色仅授予用量与日志只读能力';

INSERT INTO roles (id, tenant_id, code, name, description, system_role)
SELECT md5(t.id::text || ':finance_auditor')::uuid, t.id, 'finance_auditor', '财务审计', '只读查看调用日志、用量看板并导出按组织、项目和日期汇总的成本 CSV', true
FROM tenants t
ON CONFLICT (tenant_id, code) DO NOTHING;

COMMIT;
