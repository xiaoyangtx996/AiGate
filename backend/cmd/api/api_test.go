package main

import (
	"context"
	"errors"
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
	"github.com/xiaoyangtx996/AiGate/internal/gateway"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
)

type apiRepository struct{ users map[string]string }

type auditRepository struct{ events []audit.Event }

type menuRepository struct {
	tenants  []auth.TenantOption
	settings map[string]bool
}

func (r *menuRepository) ListTenants(context.Context) ([]auth.TenantOption, error) {
	return r.tenants, nil
}
func (r *menuRepository) EnabledMenuCodes(context.Context, string) (map[string]bool, error) {
	return r.settings, nil
}
func (r *menuRepository) SetMenuEnabled(_ context.Context, _ string, code string, enabled bool) error {
	if r.settings == nil {
		r.settings = map[string]bool{}
	}
	r.settings[code] = enabled
	return nil
}

type fakeLogReader struct {
	filter gateway.LogFilter
	items  []gateway.LogRecord
}

func (r *fakeLogReader) List(_ context.Context, filter gateway.LogFilter) ([]gateway.LogRecord, error) {
	r.filter = filter
	return r.items, nil
}

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

func TestTenantSessionOnlyReturnsCurrentTenant(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	menus := &menuRepository{tenants: []auth.TenantOption{{ID: "tenant-a", Name: "A"}, {ID: "tenant-b", Name: "B"}}}
	app := &api{tokens: manager, sessions: menus}
	request := httptest.NewRequest(http.MethodGet, "/v1/session", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin", Roles: []string{domain.RolePlatformAdmin}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || strings.Contains(response.Body.String(), `"id":"tenant-b"`) {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestPlatformSessionReturnsAllTenants(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	menus := &menuRepository{tenants: []auth.TenantOption{{ID: "tenant-a", Name: "A"}, {ID: "tenant-b", Name: "B"}}}
	app := &api{tokens: manager, sessions: menus}
	request := httptest.NewRequest(http.MethodGet, "/v1/session", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "operator", Platform: true}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"id":"tenant-b"`) {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestTenantUserCannotSwitchTenant(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	store := loginStoreAPI{tenants: []auth.TenantOption{{ID: "tenant-a"}, {ID: "tenant-b"}}}
	app := &api{tokens: manager, auth: auth.NewService(store, manager), sessions: &menuRepository{}}
	request := httptest.NewRequest(http.MethodPost, "/v1/auth/switch-tenant", strings.NewReader(`{"tenant_id":"tenant-b"}`))
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "user-a"}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}

type loginStoreAPI struct{ tenants []auth.TenantOption }

func (s loginStoreAPI) FindLoginAccounts(context.Context, string) ([]auth.LoginAccount, error) {
	return nil, nil
}
func (s loginStoreAPI) FindPlatformOperator(context.Context, string) (auth.PlatformOperator, error) {
	return auth.PlatformOperator{}, errors.New("not found")
}
func (s loginStoreAPI) ListTenants(context.Context) ([]auth.TenantOption, error) {
	return s.tenants, nil
}
func (s loginStoreAPI) TenantExists(_ context.Context, id string) (bool, error) {
	for _, item := range s.tenants {
		if item.ID == id {
			return true, nil
		}
	}
	return false, nil
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

func TestAPILogCSVUsesTenantAndDateRange(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	cost := int64(42)
	reader := &fakeLogReader{items: []gateway.LogRecord{{TraceID: "trace,csv", Model: "demo", CostMicros: &cost, CreatedAt: time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)}}}
	app := &api{tokens: manager, logs: reader}
	request := httptest.NewRequest(http.MethodGet, "/v1/api-logs.csv?from=2026-07-01T00:00:00Z&to=2026-07-31T23:59:59Z", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin", Roles: []string{domain.RolePlatformAdmin}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "text/csv; charset=utf-8" {
		t.Fatalf("status=%d content-type=%s body=%s", response.Code, response.Header().Get("Content-Type"), response.Body.String())
	}
	if reader.filter.TenantID != "tenant-a" || reader.filter.From == nil || reader.filter.To == nil || !strings.Contains(response.Body.String(), `"trace,csv"`) {
		t.Fatalf("filter=%+v body=%s", reader.filter, response.Body.String())
	}
}

func TestAPILogRejectsInvertedDateRange(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: manager, logs: &fakeLogReader{}}
	request := httptest.NewRequest(http.MethodGet, "/v1/api-logs?from=2026-08-01T00:00:00Z&to=2026-07-01T00:00:00Z", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin", Roles: []string{domain.RolePlatformAdmin}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
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
func (r *alertPolicyRepo) Evaluate(context.Context, string) error { return nil }
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
