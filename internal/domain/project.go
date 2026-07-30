package domain

import "time"

// Project is an asset container, not an additional organization level.
type Project struct {
	ID             string
	TenantID       string
	OrganizationID string
	Name           string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
