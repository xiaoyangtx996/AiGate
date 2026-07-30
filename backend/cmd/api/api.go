package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/xiaoyangtx996/AiGate/internal/alerts"
	"github.com/xiaoyangtx996/AiGate/internal/apikey"
	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/gateway"
	"github.com/xiaoyangtx996/AiGate/internal/org"
	"github.com/xiaoyangtx996/AiGate/internal/quota"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
)

type api struct {
	auth     *auth.Service
	tokens   *auth.TokenManager
	rbac     *rbac.Service
	org      *org.Service
	keys     *apikey.Service
	quota    *quota.Service
	channels *channel.Service
	logs     *gateway.PostgresLogger
	audit    *audit.Service
	alerts   *alerts.Service
}

func (a *api) handler() http.Handler {
	root := http.NewServeMux()
	root.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	root.HandleFunc("POST /v1/auth/login", a.login)

	protected := http.NewServeMux()
	protected.HandleFunc("GET /v1/users", a.admin(a.listUsers))
	protected.HandleFunc("POST /v1/users", a.admin(a.createUser))
	protected.HandleFunc("PUT /v1/users/{id}", a.admin(a.updateUser))
	protected.HandleFunc("DELETE /v1/users/{id}", a.admin(a.deleteUser))
	protected.HandleFunc("PUT /v1/users/{id}/organization", a.admin(a.attachUser))
	protected.HandleFunc("GET /v1/roles", a.admin(a.listRoles))
	protected.HandleFunc("POST /v1/roles", a.admin(a.createRole))
	protected.HandleFunc("PUT /v1/roles/{id}", a.admin(a.updateRole))
	protected.HandleFunc("DELETE /v1/roles/{id}", a.admin(a.deleteRole))
	protected.HandleFunc("GET /v1/organizations", a.admin(a.listOrganizations))
	protected.HandleFunc("POST /v1/organizations", a.admin(a.createOrganization))
	protected.HandleFunc("PUT /v1/organizations/{id}", a.admin(a.updateOrganization))
	protected.HandleFunc("DELETE /v1/organizations/{id}", a.admin(a.deleteOrganization))
	protected.HandleFunc("PUT /v1/projects/{projectID}/members/{userID}", a.admin(a.grantProject))
	protected.HandleFunc("DELETE /v1/projects/{projectID}/members/{userID}", a.admin(a.revokeProject))
	protected.HandleFunc("GET /v1/projects/{projectID}/access", a.projectAccess)
	protected.HandleFunc("GET /v1/api-keys", a.admin(a.listAPIKeys))
	protected.HandleFunc("POST /v1/api-keys", a.admin(a.createAPIKey))
	protected.HandleFunc("DELETE /v1/api-keys/{id}", a.admin(a.revokeAPIKey))
	protected.HandleFunc("PUT /v1/quotas/{scope}/{id}", a.admin(a.setQuota))
	protected.HandleFunc("GET /v1/channels", a.admin(a.listChannels))
	protected.HandleFunc("POST /v1/channels", a.admin(a.createChannel))
	protected.HandleFunc("PUT /v1/channels/{id}", a.admin(a.updateChannel))
	protected.HandleFunc("PUT /v1/model-prices/{model}", a.admin(a.setModelPrice))
	protected.HandleFunc("GET /v1/api-logs", a.admin(a.listAPILogs))
	protected.HandleFunc("GET /v1/audit-events", a.admin(a.listAuditEvents))
	protected.HandleFunc("GET /v1/audit-events.csv", a.admin(a.exportAuditEvents))
	protected.HandleFunc("GET /v1/alert-policy", a.admin(a.getAlertPolicy))
	protected.HandleFunc("PUT /v1/alert-policy", a.admin(a.setAlertPolicy))
	protected.HandleFunc("GET /v1/alerts", a.admin(a.listAlerts))
	root.Handle("/v1/", auth.Middleware(a.tokens, protected))
	return root
}

func (a *api) admin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identity, ok := auth.FromContext(r.Context())
		if !ok || !identity.HasRole(domain.RolePlatformAdmin) {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		next(w, r)
	}
}

func (a *api) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		TenantID string `json:"tenant_id"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	token, err := a.auth.Login(r.Context(), input.TenantID, input.Email, input.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"token": token, "token_type": "Bearer"})
}

type userRequest struct {
	OrganizationID string   `json:"organization_id"`
	Email          string   `json:"email"`
	DisplayName    string   `json:"display_name"`
	Password       string   `json:"password"`
	Active         bool     `json:"active"`
	RoleIDs        []string `json:"role_ids"`
}

func (a *api) listUsers(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	users, err := a.rbac.ListUsers(r.Context(), identity.TenantID)
	respond(w, users, err, http.StatusOK)
}

func (a *api) createUser(w http.ResponseWriter, r *http.Request) {
	var input userRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	user, err := a.rbac.CreateUser(r.Context(), identity.TenantID, rbac.UserInput{
		OrganizationID: input.OrganizationID, Email: input.Email, DisplayName: input.DisplayName,
		Password: input.Password, Active: input.Active, RoleIDs: input.RoleIDs,
	})
	respond(w, user, err, http.StatusCreated)
}

func (a *api) updateUser(w http.ResponseWriter, r *http.Request) {
	var input userRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	user, err := a.rbac.UpdateUser(r.Context(), identity.TenantID, rbac.UserInput{
		ID: r.PathValue("id"), OrganizationID: input.OrganizationID, Email: input.Email,
		DisplayName: input.DisplayName, Password: input.Password, Active: input.Active, RoleIDs: input.RoleIDs,
	})
	respond(w, user, err, http.StatusOK)
}

func (a *api) deleteUser(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	respondEmpty(w, a.rbac.DeleteUser(r.Context(), identity.TenantID, r.PathValue("id")))
}

func (a *api) listRoles(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	roles, err := a.rbac.ListRoles(r.Context(), identity.TenantID)
	respond(w, roles, err, http.StatusOK)
}

type roleRequest struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (a *api) createRole(w http.ResponseWriter, r *http.Request) {
	var input roleRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	role, err := a.rbac.CreateRole(r.Context(), identity.TenantID, input.Code, input.Name, input.Description)
	respond(w, role, err, http.StatusCreated)
}

func (a *api) updateRole(w http.ResponseWriter, r *http.Request) {
	var input roleRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	role, err := a.rbac.UpdateRole(r.Context(), domain.Role{ID: r.PathValue("id"), TenantID: identity.TenantID, Code: input.Code, Name: input.Name, Description: input.Description})
	respond(w, role, err, http.StatusOK)
}

func (a *api) deleteRole(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	respondEmpty(w, a.rbac.DeleteRole(r.Context(), identity.TenantID, r.PathValue("id")))
}

func (a *api) listOrganizations(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	organizations, err := a.org.List(r.Context(), identity.TenantID)
	respond(w, organizations, err, http.StatusOK)
}

func (a *api) createOrganization(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name string `json:"name"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	organization, err := a.org.Create(r.Context(), identity.TenantID, input.Name)
	respond(w, organization, err, http.StatusCreated)
}

func (a *api) updateOrganization(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name string `json:"name"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	organization, err := a.org.Update(r.Context(), identity.TenantID, r.PathValue("id"), input.Name)
	respond(w, organization, err, http.StatusOK)
}

func (a *api) deleteOrganization(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	respondEmpty(w, a.org.Delete(r.Context(), identity.TenantID, r.PathValue("id")))
}

func (a *api) attachUser(w http.ResponseWriter, r *http.Request) {
	var input struct {
		OrganizationID string `json:"organization_id"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	respondEmpty(w, a.org.AttachUser(r.Context(), identity.TenantID, input.OrganizationID, r.PathValue("id")))
}

func (a *api) grantProject(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	err := a.rbac.GrantProject(r.Context(), identity.TenantID, r.PathValue("projectID"), r.PathValue("userID"))
	respondEmpty(w, err)
}

func (a *api) revokeProject(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	err := a.rbac.RevokeProject(r.Context(), identity.TenantID, r.PathValue("projectID"), r.PathValue("userID"))
	respondEmpty(w, err)
}

func (a *api) projectAccess(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	if !identity.HasRole(domain.RolePlatformAdmin) && !identity.HasRole(domain.RoleProjectMember) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	allowed := identity.HasRole(domain.RolePlatformAdmin)
	var err error
	if !allowed {
		allowed, err = a.rbac.CanAccessProject(r.Context(), identity.TenantID, r.PathValue("projectID"), identity.UserID)
	}
	respond(w, map[string]bool{"allowed": allowed}, err, http.StatusOK)
}

func (a *api) listAPIKeys(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	keys, err := a.keys.List(r.Context(), identity.TenantID)
	respond(w, keys, err, http.StatusOK)
}

func (a *api) createAPIKey(w http.ResponseWriter, r *http.Request) {
	var input struct {
		OrganizationID string   `json:"organization_id"`
		UserID         string   `json:"user_id"`
		Name           string   `json:"name"`
		AllowedCIDRs   []string `json:"allowed_cidrs"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	key, plain, err := a.keys.Issue(r.Context(), identity.TenantID, input.OrganizationID, input.UserID, input.Name, input.AllowedCIDRs)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"key": key, "secret": plain})
}

func (a *api) revokeAPIKey(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	respondEmpty(w, a.keys.Revoke(r.Context(), identity.TenantID, r.PathValue("id")))
}

func (a *api) setQuota(w http.ResponseWriter, r *http.Request) {
	var input struct {
		LimitTokens int64 `json:"limit_tokens"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	scope, id := quota.Scope(r.PathValue("scope")), r.PathValue("id")
	if scope == quota.Tenant && id != identity.TenantID {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	respondEmpty(w, a.quota.SetLimit(r.Context(), quota.Account{TenantID: identity.TenantID, Scope: scope, ScopeID: id, LimitTokens: input.LimitTokens}))
}

func (a *api) listChannels(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	channels, err := a.channels.List(r.Context(), identity.TenantID)
	respond(w, channels, err, http.StatusOK)
}

func (a *api) createChannel(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name       string `json:"name"`
		BaseURL    string `json:"base_url"`
		Credential string `json:"credential"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	config, err := a.channels.Create(r.Context(), identity.TenantID, input.Name, input.BaseURL, input.Credential)
	respond(w, config, err, http.StatusCreated)
}

func (a *api) updateChannel(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name       *string `json:"name"`
		BaseURL    *string `json:"base_url"`
		Credential *string `json:"credential"`
		Active     *bool   `json:"active"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	config, err := a.channels.Update(r.Context(), identity.TenantID, r.PathValue("id"), channel.UpdateInput{
		Name: input.Name, BaseURL: input.BaseURL, Credential: input.Credential, Active: input.Active,
	})
	respond(w, config, err, http.StatusOK)
}

func (a *api) listAPILogs(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	filter := gateway.LogFilter{TenantID: identity.TenantID, UserID: r.URL.Query().Get("user_id")}
	if raw := r.URL.Query().Get("blocked"); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid blocked query")
			return
		}
		filter.Blocked = &value
	}
	if raw := r.URL.Query().Get("limit"); raw != "" {
		limit, err := strconv.Atoi(raw)
		if err != nil || limit <= 0 {
			writeError(w, http.StatusBadRequest, "invalid limit query")
			return
		}
		filter.Limit = limit
	}
	logs, err := a.logs.List(r.Context(), filter)
	respond(w, logs, err, http.StatusOK)
}

func (a *api) setModelPrice(w http.ResponseWriter, r *http.Request) {
	var input struct {
		UpstreamModel string `json:"upstream_model"`
		InputMicros   int64  `json:"input_micros_per_million"`
		OutputMicros  int64  `json:"output_micros_per_million"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	respondEmpty(w, a.channels.SetPrice(r.Context(), identity.TenantID, r.PathValue("model"), input.UpstreamModel, input.InputMicros, input.OutputMicros))
}

func (a *api) auditFilter(w http.ResponseWriter, r *http.Request) (audit.Filter, bool) {
	identity, _ := auth.FromContext(r.Context())
	from, err := audit.ParseTime(r.URL.Query().Get("from"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid from time")
		return audit.Filter{}, false
	}
	to, err := audit.ParseTime(r.URL.Query().Get("to"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid to time")
		return audit.Filter{}, false
	}
	limit, err := audit.ParseLimit(r.URL.Query().Get("limit"))
	if err != nil || limit < 1 || limit > 1000 || from != nil && to != nil && from.After(*to) {
		writeError(w, http.StatusBadRequest, "invalid audit filter")
		return audit.Filter{}, false
	}
	return audit.Filter{TenantID: identity.TenantID, TraceID: r.URL.Query().Get("trace_id"), EventType: r.URL.Query().Get("event_type"), From: from, To: to, Limit: limit}, true
}

func (a *api) listAuditEvents(w http.ResponseWriter, r *http.Request) {
	filter, ok := a.auditFilter(w, r)
	if !ok {
		return
	}
	events, err := a.audit.List(r.Context(), filter)
	respond(w, events, err, http.StatusOK)
}

func (a *api) exportAuditEvents(w http.ResponseWriter, r *http.Request) {
	filter, ok := a.auditFilter(w, r)
	if !ok {
		return
	}
	data, err := a.audit.CSV(r.Context(), filter)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="audit-events.csv"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (a *api) getAlertPolicy(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	policy, err := a.alerts.GetPolicy(r.Context(), identity.TenantID)
	respond(w, policy, err, http.StatusOK)
}

func (a *api) setAlertPolicy(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Thresholds      []int16 `json:"thresholds"`
		WebhookURL      string  `json:"webhook_url"`
		CooldownSeconds int     `json:"cooldown_seconds"`
		Enabled         *bool   `json:"enabled"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	enabled := true
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	identity, _ := auth.FromContext(r.Context())
	respondEmpty(w, a.alerts.SetPolicy(r.Context(), alerts.Policy{TenantID: identity.TenantID, Thresholds: input.Thresholds, WebhookURL: input.WebhookURL, CooldownSeconds: input.CooldownSeconds, Enabled: enabled}))
}

func (a *api) listAlerts(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	limit := 100
	if raw := r.URL.Query().Get("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 || value > 1000 {
			writeError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		limit = value
	}
	items, err := a.alerts.List(r.Context(), identity.TenantID, limit)
	respond(w, items, err, http.StatusOK)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

func respond(w http.ResponseWriter, value any, err error, status int) {
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, status, value)
}

func respondEmpty(w http.ResponseWriter, err error) {
	if err != nil {
		writeServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeServiceError(w http.ResponseWriter, err error) {
	if errors.Is(err, rbac.ErrNotFound) || errors.Is(err, channel.ErrNotFound) || errors.Is(err, apikey.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeError(w, http.StatusBadRequest, err.Error())
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
