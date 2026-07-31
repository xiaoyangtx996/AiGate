package domain

import "time"

const (
	// RolePlatformAdmin is retained for compatibility and represents a tenant administrator.
	RolePlatformAdmin  = "platform_admin"
	RoleProjectMember  = "project_member"
	RoleFinanceAuditor = "finance_auditor"
)

type User struct {
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	OrganizationID string    `json:"organization_id"`
	Email          string    `json:"email"`
	DisplayName    string    `json:"display_name"`
	PasswordHash   string    `json:"-"`
	Active         bool      `json:"active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Role struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ProjectMembership struct {
	TenantID  string    `json:"tenant_id"`
	ProjectID string    `json:"project_id"`
	UserID    string    `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
}
