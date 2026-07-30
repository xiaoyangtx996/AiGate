BEGIN;

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN tenants.active IS '租户是否对平台控制台可见并可被切换；停用后仍保留历史数据，但不出现在租户列表中';

CREATE INDEX IF NOT EXISTS tenants_active_name_idx ON tenants (active, name, id);
COMMENT ON INDEX tenants_active_name_idx IS '平台会话按启用状态快速列出可切换租户';

-- 清理本地集成测试残留租户，避免总公司切换器被污染。
UPDATE tenants
SET active = false,
    updated_at = now()
WHERE active = true
  AND (
        name LIKE 'audit-%'
     OR name ILIKE 'Login Tenant %'
     OR name LIKE '登录租户 %'
     OR name ILIKE '%integration%'
     OR name ILIKE 'gateway audit%'
     OR name ILIKE 'quota %'
  );

COMMIT;
