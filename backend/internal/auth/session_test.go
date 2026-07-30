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
