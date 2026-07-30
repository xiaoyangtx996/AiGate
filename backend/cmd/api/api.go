package main

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/org"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
)

type api struct {
	auth   *auth.Service
	tokens *auth.TokenManager
	rbac   *rbac.Service
	org    *org.Service
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
	if errors.Is(err, rbac.ErrNotFound) {
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
