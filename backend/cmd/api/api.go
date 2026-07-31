package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/agent"
	"github.com/xiaoyangtx996/AiGate/internal/alerts"
	"github.com/xiaoyangtx996/AiGate/internal/apikey"
	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/bot"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/gateway"
	"github.com/xiaoyangtx996/AiGate/internal/knowledge"
	"github.com/xiaoyangtx996/AiGate/internal/mcp"
	"github.com/xiaoyangtx996/AiGate/internal/org"
	"github.com/xiaoyangtx996/AiGate/internal/quota"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
)

type api struct {
	auth      *auth.Service
	tokens    *auth.TokenManager
	rbac      *rbac.Service
	org       *org.Service
	keys      *apikey.Service
	quota     *quota.Service
	channels  *channel.Service
	logs      logReader
	audit     *audit.Service
	alerts    *alerts.Service
	sessions  menuStore
	knowledge *knowledge.Service
	rag       *rag.Service
	mcp       *mcp.Service
	agents    *agent.Service
	bot       *bot.Service
}

type logReader interface {
	List(context.Context, gateway.LogFilter) ([]gateway.LogRecord, error)
}

type menuStore interface {
	auth.MenuStore
	SetMenuEnabled(context.Context, string, string, bool) error
}

func (a *api) handler() http.Handler {
	root := http.NewServeMux()
	root.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	root.HandleFunc("POST /v1/auth/login", a.login)

	protected := http.NewServeMux()
	protected.HandleFunc("GET /v1/session", a.getSession)
	protected.HandleFunc("POST /v1/auth/switch-tenant", a.switchTenant)
	protected.HandleFunc("GET /v1/menu-settings", a.admin(a.listMenuSettings))
	protected.HandleFunc("PUT /v1/menu-settings/{code}", a.admin(a.setMenuSetting))
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
	protected.HandleFunc("POST /v1/projects/{projectID}/knowledge-bases", a.createKnowledgeBase)
	protected.HandleFunc("POST /v1/projects/{projectID}/knowledge-bases/{kbID}/documents", a.uploadKnowledgeDocument)
	protected.HandleFunc("GET /v1/projects/{projectID}/documents/{documentID}", a.knowledgeDocumentStatus)
	protected.HandleFunc("POST /v1/projects/{projectID}/documents/{documentID}/retry", a.retryKnowledgeDocument)
	protected.HandleFunc("POST /v1/projects/{projectID}/knowledge-bases/{kbID}/search", a.searchKnowledgeBase)
	protected.HandleFunc("GET /v1/mcp/marketplace", a.admin(a.listMCPMarketplace))
	protected.HandleFunc("POST /v1/mcp/marketplace/{entryID}/install", a.admin(a.installMCPMarketplace))
	protected.HandleFunc("GET /v1/mcp/assets", a.admin(a.listMCPAssets))
	protected.HandleFunc("POST /v1/mcp/assets", a.admin(a.registerMCPAsset))
	protected.HandleFunc("PUT /v1/projects/{projectID}/mcp/{assetID}/grants", a.admin(a.grantMCPAsset))
	protected.HandleFunc("POST /v1/projects/{projectID}/mcp/{assetID}/invoke", a.invokeMCPAsset)
	protected.HandleFunc("POST /v1/projects/{projectID}/agents", a.createProjectAgent)
	protected.HandleFunc("POST /v1/projects/{projectID}/agents/{agentID}/chat", a.chatProjectAgent)
	protected.HandleFunc("POST /v1/bot/chat", a.chatManagementBot)
	protected.HandleFunc("GET /v1/api-keys", a.admin(a.listAPIKeys))
	protected.HandleFunc("POST /v1/api-keys", a.admin(a.createAPIKey))
	protected.HandleFunc("DELETE /v1/api-keys/{id}", a.admin(a.revokeAPIKey))
	protected.HandleFunc("PUT /v1/quotas/{scope}/{id}", a.admin(a.setQuota))
	protected.HandleFunc("GET /v1/channels", a.admin(a.listChannels))
	protected.HandleFunc("POST /v1/channels", a.admin(a.createChannel))
	protected.HandleFunc("PUT /v1/channels/{id}", a.admin(a.updateChannel))
	protected.HandleFunc("PUT /v1/model-prices/{model}", a.admin(a.setModelPrice))
	protected.HandleFunc("GET /v1/api-logs", a.admin(a.listAPILogs))
	protected.HandleFunc("GET /v1/api-logs.csv", a.admin(a.exportAPILogs))
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

func (a *api) createKnowledgeBase(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	var input struct {
		Name string `json:"name"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	kb, err := a.knowledge.Create(r.Context(), identity.TenantID, r.PathValue("projectID"), identity.UserID, input.Name)
	respond(w, kb, err, http.StatusCreated)
}

func (a *api) uploadKnowledgeDocument(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	filename := r.URL.Query().Get("filename")
	if filename == "" {
		writeError(w, http.StatusBadRequest, "filename is required")
		return
	}
	doc, err := a.knowledge.Upload(r.Context(), identity.TenantID, r.PathValue("projectID"), r.PathValue("kbID"), identity.UserID, filename, r.Header.Get("Content-Type"), r.Body)
	respond(w, doc, err, http.StatusAccepted)
}

func (a *api) knowledgeDocumentStatus(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	doc, err := a.knowledge.Status(r.Context(), identity.TenantID, r.PathValue("projectID"), r.PathValue("documentID"), identity.UserID)
	respond(w, doc, err, http.StatusOK)
}

func (a *api) retryKnowledgeDocument(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	err := a.knowledge.Retry(r.Context(), identity.TenantID, r.PathValue("projectID"), r.PathValue("documentID"), identity.UserID)
	respondEmpty(w, err)
}

func (a *api) searchKnowledgeBase(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	var input struct {
		Query string `json:"query"`
		Limit int    `json:"limit"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	results, err := a.rag.Search(r.Context(), identity.TenantID, r.PathValue("projectID"), r.PathValue("kbID"), identity.UserID, input.Query, input.Limit)
	respond(w, map[string]any{"results": results}, err, http.StatusOK)
}

func (a *api) listMCPMarketplace(w http.ResponseWriter, r *http.Request) {
	items, err := a.mcp.Marketplace(r.Context())
	respond(w, items, err, http.StatusOK)
}

func (a *api) installMCPMarketplace(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	var input struct {
		Name string `json:"name"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	asset, err := a.mcp.Install(r.Context(), identity.TenantID, r.PathValue("entryID"), input.Name)
	respond(w, asset, err, http.StatusCreated)
}

func (a *api) listMCPAssets(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	items, err := a.mcp.List(r.Context(), identity.TenantID)
	respond(w, items, err, http.StatusOK)
}

func (a *api) registerMCPAsset(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	var input struct {
		Name       string `json:"name"`
		Endpoint   string `json:"endpoint"`
		Credential string `json:"credential"`
		Version    string `json:"version"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	asset, err := a.mcp.Register(r.Context(), identity.TenantID, input.Name, input.Endpoint, input.Credential, input.Version)
	respond(w, asset, err, http.StatusCreated)
}

func (a *api) grantMCPAsset(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	var input struct {
		AgentID string `json:"agent_id"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	err := a.mcp.Grant(r.Context(), mcp.Grant{TenantID: identity.TenantID, AssetID: r.PathValue("assetID"), ProjectID: r.PathValue("projectID"), AgentID: input.AgentID, GrantedBy: identity.UserID})
	respondEmpty(w, err)
}

func (a *api) invokeMCPAsset(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	var envelope struct {
		Method string `json:"method"`
		Params struct {
			Name string `json:"name"`
		} `json:"params"`
	}
	if json.Unmarshal(body, &envelope) != nil || envelope.Method != "tools/call" || envelope.Params.Name == "" {
		writeError(w, http.StatusBadRequest, "MCP tools/call with params.name is required")
		return
	}
	result, err := a.mcp.Invoke(r.Context(), mcp.Invocation{TenantID: identity.TenantID, ProjectID: r.PathValue("projectID"), AssetID: r.PathValue("assetID"), AgentID: r.URL.Query().Get("agent_id"), UserID: identity.UserID, ToolName: envelope.Params.Name, Body: body})
	if errors.Is(err, mcp.ErrForbidden) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	if errors.Is(err, mcp.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadGateway, "MCP upstream failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Trace-ID", result.TraceID)
	w.WriteHeader(result.StatusCode)
	_, _ = w.Write(result.Body)
}

func (a *api) createProjectAgent(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	var input agent.Agent
	if !decodeJSON(w, r, &input) {
		return
	}
	created, err := a.agents.Create(r.Context(), identity.TenantID, r.PathValue("projectID"), identity.UserID, input)
	respond(w, created, err, http.StatusCreated)
}
func (a *api) chatProjectAgent(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	var input struct {
		Question      string `json:"question"`
		GatewayAPIKey string `json:"gateway_api_key"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	result, err := a.agents.Chat(r.Context(), identity.TenantID, r.PathValue("projectID"), r.PathValue("agentID"), identity.UserID, input.GatewayAPIKey, input.Question)
	respond(w, result, err, http.StatusOK)
}
func (a *api) chatManagementBot(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	var input struct {
		Question string `json:"question"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	answer, err := a.bot.Ask(r.Context(), identity, input.Question)
	respond(w, answer, err, http.StatusOK)
}

func (a *api) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		TenantID string `json:"tenant_id,omitempty"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	result, err := a.auth.Login(r.Context(), input.Email, input.Password, input.TenantID)
	if errors.Is(err, auth.ErrTenantRequired) {
		writeJSON(w, http.StatusConflict, map[string]any{"error": "tenant_selection_required", "tenants": result.Tenants})
		return
	}
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *api) getSession(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	session, err := auth.BuildSession(r.Context(), a.sessions, identity)
	respond(w, session, err, http.StatusOK)
}

func (a *api) switchTenant(w http.ResponseWriter, r *http.Request) {
	var input struct {
		TenantID string `json:"tenant_id"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	identity, _ := auth.FromContext(r.Context())
	token, err := a.auth.SwitchTenant(r.Context(), identity, input.TenantID)
	if errors.Is(err, auth.ErrForbidden) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	respond(w, map[string]string{"token": token, "token_type": "Bearer"}, err, http.StatusOK)
}

func (a *api) listMenuSettings(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.FromContext(r.Context())
	settings, err := a.sessions.EnabledMenuCodes(r.Context(), identity.TenantID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	type item struct {
		auth.Menu
		Enabled bool `json:"enabled"`
	}
	items := make([]item, 0)
	for _, menu := range auth.AdminMenuCatalog() {
		enabled, configured := settings[menu.Code]
		items = append(items, item{Menu: menu, Enabled: !configured || enabled})
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *api) setMenuSetting(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Enabled bool `json:"enabled"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	code := r.PathValue("code")
	valid := false
	for _, menu := range auth.AdminMenuCatalog() {
		if menu.Code == code {
			valid = true
			break
		}
	}
	if !valid || code == "organization" && !input.Enabled {
		writeError(w, http.StatusBadRequest, "invalid menu setting")
		return
	}
	identity, _ := auth.FromContext(r.Context())
	respondEmpty(w, a.sessions.SetMenuEnabled(r.Context(), identity.TenantID, code, input.Enabled))
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
	filter, ok := a.apiLogFilter(w, r, 200)
	if !ok {
		return
	}
	logs, err := a.logs.List(r.Context(), filter)
	respond(w, logs, err, http.StatusOK)
}

func (a *api) apiLogFilter(w http.ResponseWriter, r *http.Request, defaultLimit int) (gateway.LogFilter, bool) {
	identity, _ := auth.FromContext(r.Context())
	filter := gateway.LogFilter{TenantID: identity.TenantID, UserID: r.URL.Query().Get("user_id")}
	if raw := r.URL.Query().Get("blocked"); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid blocked query")
			return gateway.LogFilter{}, false
		}
		filter.Blocked = &value
	}
	for value, target := range map[string]**time.Time{"from": &filter.From, "to": &filter.To} {
		raw := r.URL.Query().Get(value)
		if raw == "" {
			continue
		}
		parsed, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid "+value+" query")
			return gateway.LogFilter{}, false
		}
		*target = &parsed
	}
	if filter.From != nil && filter.To != nil && filter.From.After(*filter.To) {
		writeError(w, http.StatusBadRequest, "from must not be after to")
		return gateway.LogFilter{}, false
	}
	filter.Limit = defaultLimit
	if raw := r.URL.Query().Get("limit"); raw != "" {
		limit, err := strconv.Atoi(raw)
		if err != nil || limit <= 0 || limit > 1000 {
			writeError(w, http.StatusBadRequest, "invalid limit query")
			return gateway.LogFilter{}, false
		}
		filter.Limit = limit
	}
	return filter, true
}

func (a *api) exportAPILogs(w http.ResponseWriter, r *http.Request) {
	filter, ok := a.apiLogFilter(w, r, 1000)
	if !ok {
		return
	}
	logs, err := a.logs.List(r.Context(), filter)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	var output bytes.Buffer
	writer := csv.NewWriter(&output)
	_ = writer.Write([]string{"trace_id", "created_at", "user_id", "organization_id", "model", "input_tokens", "output_tokens", "total_tokens", "cost_micros", "estimated", "blocked", "status_code", "error_code"})
	for _, item := range logs {
		cost := ""
		if item.CostMicros != nil {
			cost = strconv.FormatInt(*item.CostMicros, 10)
		}
		_ = writer.Write([]string{item.TraceID, item.CreatedAt.UTC().Format(time.RFC3339Nano), item.UserID, item.OrganizationID, item.Model, strconv.FormatInt(item.InputTokens, 10), strconv.FormatInt(item.OutputTokens, 10), strconv.FormatInt(item.TotalTokens, 10), cost, strconv.FormatBool(item.Estimated), strconv.FormatBool(item.Blocked), strconv.Itoa(item.StatusCode), item.ErrorCode})
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		writeServiceError(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="api-logs.csv"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
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
	if errors.Is(err, knowledge.ErrForbidden) || errors.Is(err, rag.ErrForbidden) || errors.Is(err, agent.ErrForbidden) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	if errors.Is(err, knowledge.ErrNotFound) || errors.Is(err, mcp.ErrNotFound) || errors.Is(err, agent.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, status, value)
}

func respondEmpty(w http.ResponseWriter, err error) {
	if err != nil {
		if errors.Is(err, knowledge.ErrForbidden) || errors.Is(err, rag.ErrForbidden) {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		if errors.Is(err, knowledge.ErrNotFound) || errors.Is(err, mcp.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		writeServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeServiceError(w http.ResponseWriter, err error) {
	if errors.Is(err, rbac.ErrNotFound) || errors.Is(err, channel.ErrNotFound) || errors.Is(err, apikey.ErrNotFound) || errors.Is(err, mcp.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if errors.Is(err, quota.ErrConservation) {
		writeError(w, http.StatusBadRequest, "配额守恒校验失败：子级配额之和不能超过上级，且限额不能低于已用量")
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
