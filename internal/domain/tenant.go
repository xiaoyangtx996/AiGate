package domain

import "time"

// Tenant is the isolation boundary for organizations, users, and assets.
type Tenant struct {
	ID        string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}
