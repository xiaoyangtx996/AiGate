package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTenantRequired     = errors.New("tenant selection required")
	ErrForbidden          = errors.New("forbidden")
)

type TenantOption struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type LoginAccount struct {
	User       domain.User
	Roles      []domain.Role
	TenantName string
}

type PlatformOperator struct {
	ID, Email, DisplayName, PasswordHash, DefaultTenantID string
	Active                                                bool
}

type UserStore interface {
	FindLoginAccounts(context.Context, string) ([]LoginAccount, error)
	FindPlatformOperator(context.Context, string) (PlatformOperator, error)
	ListTenants(context.Context) ([]TenantOption, error)
	TenantExists(context.Context, string) (bool, error)
}

type LoginResult struct {
	Token   string         `json:"token,omitempty"`
	Type    string         `json:"token_type,omitempty"`
	Tenants []TenantOption `json:"tenants,omitempty"`
}

type Service struct {
	users  UserStore
	tokens *TokenManager
}

func NewService(users UserStore, tokens *TokenManager) *Service {
	return &Service{users: users, tokens: tokens}
}

func (s *Service) Login(ctx context.Context, email, password, tenantID string) (LoginResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return LoginResult{}, ErrInvalidCredentials
	}
	if operator, err := s.users.FindPlatformOperator(ctx, email); err == nil {
		if !operator.Active || bcrypt.CompareHashAndPassword([]byte(operator.PasswordHash), []byte(password)) != nil {
			return LoginResult{}, ErrInvalidCredentials
		}
		selected := operator.DefaultTenantID
		if tenantID != "" {
			exists, err := s.users.TenantExists(ctx, tenantID)
			if err != nil || !exists {
				return LoginResult{}, ErrForbidden
			}
			selected = tenantID
		}
		token, err := s.tokens.Issue(Identity{TenantID: selected, UserID: operator.ID, Roles: []string{domain.RolePlatformAdmin}, Platform: true, DisplayName: operator.DisplayName}, 8*time.Hour)
		return LoginResult{Token: token, Type: "Bearer"}, err
	}
	accounts, err := s.users.FindLoginAccounts(ctx, email)
	if err != nil || len(accounts) == 0 {
		return LoginResult{}, ErrInvalidCredentials
	}
	valid := make([]LoginAccount, 0, len(accounts))
	for _, account := range accounts {
		if account.User.Active && bcrypt.CompareHashAndPassword([]byte(account.User.PasswordHash), []byte(password)) == nil {
			valid = append(valid, account)
		}
	}
	if len(valid) == 0 {
		return LoginResult{}, ErrInvalidCredentials
	}
	selected := valid[0]
	if tenantID != "" {
		found := false
		for _, account := range valid {
			if account.User.TenantID == tenantID {
				selected, found = account, true
				break
			}
		}
		if !found {
			return LoginResult{}, ErrForbidden
		}
	} else if len(valid) > 1 {
		options := make([]TenantOption, len(valid))
		for i, account := range valid {
			options[i] = TenantOption{ID: account.User.TenantID, Name: account.TenantName}
		}
		return LoginResult{Tenants: options}, ErrTenantRequired
	}
	codes := make([]string, len(selected.Roles))
	for i := range selected.Roles {
		codes[i] = selected.Roles[i].Code
	}
	token, err := s.tokens.Issue(Identity{TenantID: selected.User.TenantID, UserID: selected.User.ID, Roles: codes, DisplayName: selected.User.DisplayName}, 8*time.Hour)
	return LoginResult{Token: token, Type: "Bearer"}, err
}

func (s *Service) SwitchTenant(ctx context.Context, identity Identity, tenantID string) (string, error) {
	if !identity.Platform || tenantID == "" {
		return "", ErrForbidden
	}
	exists, err := s.users.TenantExists(ctx, tenantID)
	if err != nil || !exists {
		return "", ErrForbidden
	}
	identity.TenantID = tenantID
	return s.tokens.Issue(identity, 8*time.Hour)
}
