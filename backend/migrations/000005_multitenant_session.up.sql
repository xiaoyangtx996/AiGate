BEGIN;

CREATE TABLE platform_operators (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE CHECK (btrim(email) <> '' AND email = lower(email)),
    display_name text NOT NULL DEFAULT '',
    password_hash text NOT NULL CHECK (btrim(password_hash) <> ''),
    default_tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE platform_operators IS '总公司/平台级操作员；身份独立于租户用户，可在授权平台会话中切换任意租户上下文';
COMMENT ON COLUMN platform_operators.id IS '平台操作员主键（UUID）';
COMMENT ON COLUMN platform_operators.email IS '平台操作员全局唯一登录邮箱，使用规范化小写值';
COMMENT ON COLUMN platform_operators.display_name IS '平台操作员显示名称';
COMMENT ON COLUMN platform_operators.password_hash IS 'bcrypt 密码摘要，不保存或返回明文密码';
COMMENT ON COLUMN platform_operators.default_tenant_id IS '登录后自动进入的默认租户；平台操作员可通过受控接口切换';
COMMENT ON COLUMN platform_operators.active IS '平台操作员是否允许登录';
COMMENT ON COLUMN platform_operators.created_at IS '平台操作员创建时间（UTC）';
COMMENT ON COLUMN platform_operators.updated_at IS '平台操作员最后更新时间（UTC）';

CREATE TABLE tenant_menu_settings (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    menu_code text NOT NULL CHECK (btrim(menu_code) <> ''),
    enabled boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, menu_code)
);
COMMENT ON TABLE tenant_menu_settings IS '租户级控制台菜单启停配置；未配置菜单使用系统默认值，角色权限仍由后端二次过滤';
COMMENT ON COLUMN tenant_menu_settings.tenant_id IS '菜单配置所属租户，确保不同租户可独立启停管理功能';
COMMENT ON COLUMN tenant_menu_settings.menu_code IS '稳定菜单代码，对应后端允许的控制台菜单目录';
COMMENT ON COLUMN tenant_menu_settings.enabled IS '该租户是否启用此菜单；不授予超出当前用户角色的权限';
COMMENT ON COLUMN tenant_menu_settings.updated_at IS '菜单配置最后更新时间（UTC）';
CREATE INDEX tenant_menu_settings_enabled_idx ON tenant_menu_settings (tenant_id, enabled);
COMMENT ON INDEX tenant_menu_settings_enabled_idx IS '按租户快速读取启用菜单并生成登录会话导航';

COMMIT;
