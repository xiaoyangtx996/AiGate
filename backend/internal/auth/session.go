package auth

import "context"

type Menu struct {
	Code  string `json:"code"`
	Label string `json:"label"`
	Path  string `json:"path"`
}

type Session struct {
	Identity Identity       `json:"identity"`
	Tenant   TenantOption   `json:"tenant"`
	Tenants  []TenantOption `json:"tenants"`
	Menus    []Menu         `json:"menus"`
}

type MenuStore interface {
	ListTenants(context.Context) ([]TenantOption, error)
	EnabledMenuCodes(context.Context, string) (map[string]bool, error)
}

var adminMenus = []Menu{
	{Code: "organization", Label: "组织与用户", Path: "/organization"},
	{Code: "keys_quota", Label: "密钥与配额", Path: "/keys-quota"},
	{Code: "logs", Label: "调用日志", Path: "/logs"},
	{Code: "alerts", Label: "告警收件箱", Path: "/alerts"},
	{Code: "channels", Label: "渠道凭证", Path: "/channels"},
}

func AdminMenuCatalog() []Menu { return append([]Menu(nil), adminMenus...) }

func BuildSession(ctx context.Context, store MenuStore, identity Identity) (Session, error) {
	tenants, err := store.ListTenants(ctx)
	if err != nil {
		return Session{}, err
	}
	var current TenantOption
	for _, tenant := range tenants {
		if tenant.ID == identity.TenantID {
			current = tenant
			break
		}
	}
	settings, err := store.EnabledMenuCodes(ctx, identity.TenantID)
	if err != nil {
		return Session{}, err
	}
	available := []Menu{}
	if identity.Platform || identity.HasRole("platform_admin") {
		available = adminMenus
	}
	menus := make([]Menu, 0, len(available))
	for _, menu := range available {
		if enabled, configured := settings[menu.Code]; !configured || enabled {
			menus = append(menus, menu)
		}
	}
	if !identity.Platform {
		tenants = []TenantOption{current}
	}
	return Session{Identity: identity, Tenant: current, Tenants: tenants, Menus: menus}, nil
}
