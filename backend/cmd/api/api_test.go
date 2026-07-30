package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
)

type apiRepository struct{ users map[string]string }

func (r *apiRepository) DeleteUser(_ context.Context, tenantID, id string) error {
	if r.users[id] != tenantID {
		return rbac.ErrNotFound
	}
	delete(r.users, id)
	return nil
}

func (r *apiRepository) ListUsers(context.Context, string) ([]domain.User, error) { return nil, nil }
func (r *apiRepository) GetUser(context.Context, string, string) (domain.User, error) {
	return domain.User{}, rbac.ErrNotFound
}
func (r *apiRepository) CreateUser(context.Context, domain.User, []string) error  { return nil }
func (r *apiRepository) UpdateUser(context.Context, domain.User, []string) error  { return nil }
func (r *apiRepository) ListRoles(context.Context, string) ([]domain.Role, error) { return nil, nil }
func (r *apiRepository) GetRole(context.Context, string, string) (domain.Role, error) {
	return domain.Role{}, rbac.ErrNotFound
}
func (r *apiRepository) CreateRole(context.Context, domain.Role) error    { return nil }
func (r *apiRepository) UpdateRole(context.Context, domain.Role) error    { return nil }
func (r *apiRepository) DeleteRole(context.Context, string, string) error { return nil }
func (r *apiRepository) GrantProject(context.Context, string, string, string) error {
	return nil
}
func (r *apiRepository) RevokeProject(context.Context, string, string, string) error {
	return nil
}
func (r *apiRepository) HasProjectAccess(context.Context, string, string, string) (bool, error) {
	return false, nil
}

func testToken(t *testing.T, manager *auth.TokenManager, identity auth.Identity) string {
	t.Helper()
	token, err := manager.Issue(identity, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func TestMemberCannotCallAdminUserAPI(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: manager, rbac: rbac.NewService(&apiRepository{})}
	request := httptest.NewRequest(http.MethodPost, "/v1/users", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "user-a", Roles: []string{domain.RoleProjectMember}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", response.Code)
	}
}

func TestAdminCrossTenantDeleteReturnsNotFound(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	repository := &apiRepository{users: map[string]string{"user-b": "tenant-b"}}
	app := &api{tokens: manager, rbac: rbac.NewService(repository)}
	request := httptest.NewRequest(http.MethodDelete, "/v1/users/user-b", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin-a", Roles: []string{domain.RolePlatformAdmin}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", response.Code)
	}
	if repository.users["user-b"] != "tenant-b" {
		t.Fatal("cross-tenant user was modified")
	}
}

func TestUserWithoutProjectRoleCannotCheckACL(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: manager, rbac: rbac.NewService(&apiRepository{})}
	request := httptest.NewRequest(http.MethodGet, "/v1/projects/project-a/access", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "user-a"}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", response.Code)
	}
}
