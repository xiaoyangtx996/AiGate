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
	"github.com/xiaoyangtx996/AiGate/internal/usage"
)

type apiRepository struct {
	users         map[string]string
	projectAccess bool
}

type auditRepository struct{ events []audit.Event }

type menuRepository struct {
	tenants  []auth.TenantOption
	settings map[string]bool
}

type projectRepository struct {
	items            []domain.Project
	candidates       []domain.User
	candidateProject string
	allCalls         int
	accessibleCalls  int
	created          *domain.Project
	createdBy        string
	err              error
}

func (r *projectRepository) ListProjects(context.Context, string) ([]domain.Project, error) {
	r.allCalls++
	return r.items, r.err
}
func (r *projectRepository) CreateProject(_ context.Context, project domain.Project, createdBy string) error {
	r.created, r.createdBy = &project, createdBy
	return r.err
}
func (r *projectRepository) ListProjectMembers(context.Context, string, string) ([]domain.User, error) {
	return nil, r.err
}
func (r *projectRepository) ListProjectMemberCandidates(_ context.Context, _ string, projectID string) ([]domain.User, error) {
	r.candidateProject = projectID
	return r.candidates, r.err
}
func (r *projectRepository) ListProjectMembersBatch(context.Context, string, string, bool) (map[string][]domain.User, error) {
	return map[string][]domain.User{}, r.err
}
func (r *projectRepository) ListProjectMemberCandidatesBatch(context.Context, string, string, bool) (map[string][]domain.User, error) {
	return map[string][]domain.User{}, r.err
}
func (r *projectRepository) ListAccessibleProjects(context.Context, string, string) ([]domain.Project, error) {
	r.accessibleCalls++
	return r.items, r.err
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
type usageRepository struct {
	filter usage.Filter
	result usage.Summary
}

func (r *usageRepository) Summary(_ context.Context, filter usage.Filter) (usage.Summary, error) {
	r.filter = filter
	return r.result, nil
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
	return r.projectAccess, nil
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

func TestMemberCannotListOrCreateProjects(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: manager, projects: &projectRepository{}}
	for _, tc := range []struct {
		method string
		body   string
	}{{http.MethodGet, ""}, {http.MethodPost, `{"name":"demo","organization_id":"org"}`}} {
		request := httptest.NewRequest(tc.method, "/v1/projects", strings.NewReader(tc.body))
		request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "user-a", Roles: []string{domain.RoleProjectMember}}))
		response := httptest.NewRecorder()
		app.handler().ServeHTTP(response, request)
		if response.Code != http.StatusForbidden {
			t.Fatalf("%s status=%d body=%s", tc.method, response.Code, response.Body.String())
		}
	}
}

func TestProjectMemberCanOnlyListAccessibleProjectContexts(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	repo := &projectRepository{items: []domain.Project{{ID: "project-a", TenantID: "tenant-a", Name: "A"}}}
	app := &api{tokens: manager, projects: repo}
	request := httptest.NewRequest(http.MethodGet, "/v1/project-contexts", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "member-a", Roles: []string{domain.RoleProjectMember}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "project-a") {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestFinanceUsesAllProjectsOnlyForUsageScope(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	for _, tc := range []struct {
		name, path string
		roles      []string
		all        int
		accessible int
	}{
		{"finance usage", "/v1/project-contexts?scope=usage", []string{domain.RoleFinanceAuditor}, 1, 0},
		{"dual role assets", "/v1/project-contexts", []string{domain.RoleFinanceAuditor, domain.RoleProjectMember}, 0, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo := &projectRepository{items: []domain.Project{{ID: "project-a"}}}
			app := &api{tokens: manager, projects: repo}
			request := httptest.NewRequest(http.MethodGet, tc.path, nil)
			request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "user-a", Roles: tc.roles}))
			response := httptest.NewRecorder()
			app.handler().ServeHTTP(response, request)
			if response.Code != http.StatusOK || repo.allCalls != tc.all || repo.accessibleCalls != tc.accessible {
				t.Fatalf("status=%d all=%d accessible=%d", response.Code, repo.allCalls, repo.accessibleCalls)
			}
		})
	}
}

func TestProjectMemberManagementRequiresProjectMembership(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	for _, tc := range []struct {
		name    string
		allowed bool
		want    int
	}{{"member", true, http.StatusOK}, {"outsider", false, http.StatusForbidden}} {
		t.Run(tc.name, func(t *testing.T) {
			app := &api{tokens: manager, rbac: rbac.NewService(&apiRepository{projectAccess: tc.allowed}), projects: &projectRepository{}}
			request := httptest.NewRequest(http.MethodGet, "/v1/projects/project-a/members", nil)
			request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "member-a", Roles: []string{domain.RoleProjectMember}}))
			response := httptest.NewRecorder()
			app.handler().ServeHTTP(response, request)
			if response.Code != tc.want {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
		})
	}
}

func TestProjectMemberCandidatesUseScopedProjectStore(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	repo := &projectRepository{candidates: []domain.User{{ID: "candidate-a", TenantID: "tenant-a"}}}
	app := &api{tokens: manager, rbac: rbac.NewService(&apiRepository{projectAccess: true}), projects: repo}
	request := httptest.NewRequest(http.MethodGet, "/v1/projects/project-a/member-candidates", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "member-a", Roles: []string{domain.RoleProjectMember}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || repo.candidateProject != "project-a" || !strings.Contains(response.Body.String(), "candidate-a") {
		t.Fatalf("status=%d project=%s body=%s", response.Code, repo.candidateProject, response.Body.String())
	}
}

func TestProjectMemberCandidatesBatchRequiresMembershipRole(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: manager, projects: &projectRepository{}}
	for _, tc := range []struct {
		roles []string
		want  int
	}{
		{[]string{domain.RoleFinanceAuditor}, http.StatusForbidden},
		{[]string{domain.RoleProjectMember}, http.StatusOK},
		{[]string{domain.RolePlatformAdmin}, http.StatusOK},
	} {
		request := httptest.NewRequest(http.MethodGet, "/v1/project-member-candidates", nil)
		request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "u", Roles: tc.roles}))
		response := httptest.NewRecorder()
		app.handler().ServeHTTP(response, request)
		if response.Code != tc.want {
			t.Fatalf("roles=%v status=%d body=%s", tc.roles, response.Code, response.Body.String())
		}
		if tc.want == http.StatusOK && strings.TrimSpace(response.Body.String()) != "{}" {
			t.Fatalf("roles=%v expected empty object body=%s", tc.roles, response.Body.String())
		}
	}
}

func TestFinanceCanReadUsageButCannotCreateProject(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	repo := &usageRepository{result: usage.Summary{Daily: []usage.Daily{{Day: "2026-07-31", Calls: 2, CostMicros: 3}}}}
	app := &api{tokens: manager, usage: usage.NewService(repo), projects: &projectRepository{}}
	token := testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "finance", Roles: []string{domain.RoleFinanceAuditor}})
	for _, tc := range []struct {
		method, path, body string
		want               int
	}{{http.MethodGet, "/v1/usage/summary?from=2026-07-01T00:00:00Z&to=2026-08-01T00:00:00Z", "", http.StatusOK}, {http.MethodGet, "/v1/usage/cost-rollup.csv?from=2026-07-01T00:00:00Z&to=2026-08-01T00:00:00Z", "", http.StatusOK}, {http.MethodPost, "/v1/projects", `{"name":"x","organization_id":"org"}`, http.StatusForbidden}, {http.MethodPost, "/v1/bot/chat", `{"question":"usage"}`, http.StatusForbidden}} {
		request := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		request.Header.Set("Authorization", "Bearer "+token)
		response := httptest.NewRecorder()
		app.handler().ServeHTTP(response, request)
		if response.Code != tc.want {
			t.Fatalf("%s %s status=%d body=%s", tc.method, tc.path, response.Code, response.Body.String())
		}
	}
	if repo.filter.TenantID != "tenant-a" {
		t.Fatalf("filter=%+v", repo.filter)
	}
}

func TestCreateProjectValidationAndOrganizationNotFound(t *testing.T) {
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	token := testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin-a", Roles: []string{domain.RolePlatformAdmin}})
	for _, tc := range []struct {
		name string
		body string
		repo *projectRepository
		want int
	}{
		{"missing name", `{"organization_id":"org"}`, &projectRepository{}, http.StatusBadRequest},
		{"missing organization", `{"name":"demo"}`, &projectRepository{}, http.StatusBadRequest},
		{"unknown organization", `{"name":"demo","organization_id":"missing"}`, &projectRepository{err: rbac.ErrNotFound}, http.StatusNotFound},
		{"valid", `{"name":" demo ","organization_id":"org"}`, &projectRepository{}, http.StatusCreated},
	} {
		t.Run(tc.name, func(t *testing.T) {
			app := &api{tokens: manager, projects: tc.repo}
			request := httptest.NewRequest(http.MethodPost, "/v1/projects", strings.NewReader(tc.body))
			request.Header.Set("Authorization", "Bearer "+token)
			response := httptest.NewRecorder()
			app.handler().ServeHTTP(response, request)
			if response.Code != tc.want {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
			if tc.want == http.StatusCreated && (tc.repo.created == nil || tc.repo.created.Name != "demo" || tc.repo.createdBy != "admin-a") {
				t.Fatalf("created=%+v createdBy=%q", tc.repo.created, tc.repo.createdBy)
			}
		})
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
	reader := &fakeLogReader{items: []gateway.LogRecord{{TraceID: "trace,csv", ProjectID: "project-a", ProjectName: "Project A", Model: "demo", CostMicros: &cost, CreatedAt: time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)}}}
	app := &api{tokens: manager, logs: reader}
	request := httptest.NewRequest(http.MethodGet, "/v1/api-logs.csv?from=2026-07-01T00:00:00Z&to=2026-08-01T00:00:00Z", nil)
	request.Header.Set("Authorization", "Bearer "+testToken(t, manager, auth.Identity{TenantID: "tenant-a", UserID: "admin", Roles: []string{domain.RolePlatformAdmin}}))
	response := httptest.NewRecorder()
	app.handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "text/csv; charset=utf-8" {
		t.Fatalf("status=%d content-type=%s body=%s", response.Code, response.Header().Get("Content-Type"), response.Body.String())
	}
	if reader.filter.TenantID != "tenant-a" || reader.filter.From == nil || reader.filter.To == nil || !reader.filter.To.Equal(time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)) || !strings.Contains(response.Body.String(), `"trace,csv"`) || !strings.Contains(response.Body.String(), "project-a,Project A") {
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
