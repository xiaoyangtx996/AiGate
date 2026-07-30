package domain

import "time"

// Organization represents the department level within a tenant.
type Organization struct {
	ID        string
	TenantID  string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}
