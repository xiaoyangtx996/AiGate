package quota

import (
	"context"
	"errors"
)

var (
	ErrExhausted     = errors.New("quota exhausted")
	ErrNotConfigured = errors.New("quota not configured")
	ErrConservation  = errors.New("quota conservation violated")
)

type Scope string

const (
	Tenant       Scope = "tenant"
	Organization Scope = "organization"
	User         Scope = "user"
)

type Account struct {
	TenantID                                string
	Scope                                   Scope
	ScopeID                                 string
	LimitTokens, UsedTokens, ReservedTokens int64
}

type Reservation struct {
	ID, TenantID, OrganizationID, UserID string
	Tokens                               int64
}

type Repository interface {
	SetLimit(context.Context, Account) error
	Reserve(context.Context, string, string, string, int64) (Reservation, error)
	Settle(context.Context, Reservation, int64) error
	Cancel(context.Context, Reservation) error
}

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }
func (s *Service) SetLimit(ctx context.Context, account Account) error {
	if account.LimitTokens < 0 || account.TenantID == "" || account.ScopeID == "" {
		return ErrConservation
	}
	return s.repo.SetLimit(ctx, account)
}
func (s *Service) Reserve(ctx context.Context, tenantID, organizationID, userID string, tokens int64) (Reservation, error) {
	if tokens <= 0 {
		tokens = 1
	}
	return s.repo.Reserve(ctx, tenantID, organizationID, userID, tokens)
}
func (s *Service) Settle(ctx context.Context, reservation Reservation, actual int64) error {
	if actual < 0 {
		actual = 0
	}
	return s.repo.Settle(ctx, reservation, actual)
}
func (s *Service) Cancel(ctx context.Context, reservation Reservation) error {
	return s.repo.Cancel(ctx, reservation)
}
