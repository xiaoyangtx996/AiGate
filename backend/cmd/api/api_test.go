package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/alerts"
	"github.com/xiaoyangtx996/AiGate/internal/apikey"
	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
)

type apiRepository struct{ users map[string]string }

type auditRepository struct{ events []audit.Event }

func (r *auditRepository) Append(_ context.Context, event audit.Event) error {
	r.events = append(r.events, event)
	return nil
}
func (r *auditRepository) List(_ context.Context, filter audit.Filter) ([]audit.Event, error) {
	result := []audit.Event{}
	for _, event := range r.events {
		if event.TenantID == filter.TenantID {
			result = append(result, event)
		}
	}
	return result, nil
}

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

func TestAuditCSVUsesAuthenticatedTenant(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	repo := &auditRepository{events: []audit.Event{{ID: "a", TenantID: "tenant-a", TraceID: "trace-a", EventType: "gateway.call", Outcome: "success", CreatedAt: time.Now()}, {ID: "b", TenantID: "tenant-b", TraceID: "trace-b", EventType: "gateway.call", Outcome: "success", CreatedAt: time.Now()}}}
	app := &api{tokens: manager, audit: audit.NewService(repo)}
	request := httptest.NewRequest(http.MethodGet, "/v1/audit-events.csv", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin", Roles: []string{domain.RolePlatformAdmin}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "trace-a") || strings.Contains(response.Body.String(), "trace-b") {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}

type alertPolicyRepo struct{ policy alerts.Policy }

func (r *alertPolicyRepo) GetPolicy(context.Context, string) (alerts.Policy, error) {
	return r.policy, nil
}
func (r *alertPolicyRepo) SetPolicy(_ context.Context, policy alerts.Policy) error {
	r.policy = policy
	return nil
}
func (r *alertPolicyRepo) Evaluate(context.Context, string) error             { return nil }
func (r *alertPolicyRepo) List(context.Context, string, int) ([]alerts.Alert, error) {
	return nil, nil
}
func (r *alertPolicyRepo) Delivery(context.Context, string, string) (alerts.Delivery, error) {
	return alerts.Delivery{}, nil
}
func (r *alertPolicyRepo) MarkDelivered(context.Context, string, string) error { return nil }
func (r *alertPolicyRepo) MarkFailed(context.Context, string, string, string) error {
	return nil
}

func TestAlertPolicyOmittingEnabledDefaultsTrue(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	repo := &alertPolicyRepo{}
	app := &api{tokens: manager, alerts: alerts.NewService(repo, nil)}
	request := httptest.NewRequest(http.MethodPut, "/v1/alert-policy", strings.NewReader(`{"thresholds":[70,90,100],"webhook_url":"https://example.com/hook","cooldown_seconds":3600}`))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin", Roles: []string{domain.RolePlatformAdmin}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusNoContent {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if !repo.policy.Enabled {
		t.Fatal("omitted enabled must default to true")
	}
}

type revokeKeys struct{}

func (revokeKeys) Create(context.Context, apikey.Key, string) error { return nil }
func (revokeKeys) FindByHash(context.Context, string) (apikey.Principal, error) {
	return apikey.Principal{}, apikey.ErrInvalidKey
}
func (revokeKeys) Touch(context.Context, string) error                { return nil }
func (revokeKeys) List(context.Context, string) ([]apikey.Key, error) { return nil, nil }
func (revokeKeys) Revoke(context.Context, string, string) error {
	return apikey.ErrNotFound
}

func TestRevokeMissingAPIKeyReturnsNotFound(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: manager, keys: apikey.NewService(revokeKeys{})}
	request := httptest.NewRequest(http.MethodDelete, "/v1/api-keys/missing", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin-a", Roles: []string{domain.RolePlatformAdmin}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d body=%s, want 404", response.Code, response.Body.String())
	}
}
