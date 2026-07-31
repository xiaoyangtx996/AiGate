package auth

import (
	"context"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type sessionStore struct {
	tenants  []TenantOption
	settings map[string]bool
}

func (s sessionStore) ListTenants(context.Context) ([]TenantOption, error) { return s.tenants, nil }
func (s sessionStore) EnabledMenuCodes(context.Context, string) (map[string]bool, error) {
	return s.settings, nil
}

func TestTenantAdminOnlyReceivesCurrentTenantAndEnabledMenus(t *testing.T) {
	session, err := BuildSession(context.Background(), sessionStore{tenants: []TenantOption{{ID: "a", Name: "A"}, {ID: "b", Name: "B"}}, settings: map[string]bool{"channels": false}}, Identity{TenantID: "a", UserID: "u", Roles: []string{domain.RolePlatformAdmin}})
	if err != nil {
		t.Fatal(err)
	}
	if len(session.Tenants) != 1 || session.Tenants[0].ID != "a" {
		t.Fatalf("tenants=%+v", session.Tenants)
	}
	for _, menu := range session.Menus {
		if menu.Code == "channels" {
			t.Fatal("disabled menu leaked")
		}
	}
}

func TestPlatformSessionReceivesAllTenants(t *testing.T) {
	session, err := BuildSession(context.Background(), sessionStore{tenants: []TenantOption{{ID: "a"}, {ID: "b"}}}, Identity{TenantID: "a", UserID: "p", Platform: true})
	if err != nil || len(session.Tenants) != 2 {
		t.Fatalf("session=%+v err=%v", session, err)
	}
}

func TestRoleMenusAreAuthoritativelyReduced(t *testing.T) {
	tests := []struct {
		role string
		want []string
	}{
		{domain.RoleProjectMember, []string{"projects", "knowledge", "agents"}},
		{domain.RoleFinanceAuditor, []string{"logs", "usage"}},
	}
	for _, tc := range tests {
		t.Run(tc.role, func(t *testing.T) {
			session, err := BuildSession(context.Background(), sessionStore{tenants: []TenantOption{{ID: "a"}}}, Identity{TenantID: "a", Roles: []string{tc.role}})
			if err != nil {
				t.Fatal(err)
			}
			got := map[string]bool{}
			for _, menu := range session.Menus {
				got[menu.Code] = true
			}
			if len(got) != len(tc.want) {
				t.Fatalf("menus=%+v", session.Menus)
			}
			for _, code := range tc.want {
				if !got[code] {
					t.Fatalf("menus=%+v missing=%s", session.Menus, code)
				}
			}
		})
	}
}

func TestRoleMenuStillHonorsTenantSetting(t *testing.T) {
	session, err := BuildSession(context.Background(), sessionStore{tenants: []TenantOption{{ID: "a"}}, settings: map[string]bool{"usage": false}}, Identity{TenantID: "a", Roles: []string{domain.RoleFinanceAuditor}})
	if err != nil {
		t.Fatal(err)
	}
	if len(session.Menus) != 1 || session.Menus[0].Code != "logs" {
		t.Fatalf("menus=%+v", session.Menus)
	}
}

func TestRoleMenusAreUnionedForFinanceProjectMember(t *testing.T) {
	session, err := BuildSession(context.Background(), sessionStore{tenants: []TenantOption{{ID: "a"}}}, Identity{TenantID: "a", Roles: []string{domain.RoleFinanceAuditor, domain.RoleProjectMember}})
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]bool{"usage": true, "logs": true, "projects": true, "knowledge": true, "agents": true}
	if len(session.Menus) != len(want) {
		t.Fatalf("menus=%+v", session.Menus)
	}
	for _, menu := range session.Menus {
		if !want[menu.Code] {
			t.Fatalf("unexpected menu=%s", menu.Code)
		}
	}
}
