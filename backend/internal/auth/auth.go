package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type UserStore interface {
	FindLoginUser(ctx context.Context, tenantID, email string) (domain.User, []domain.Role, error)
}

type Service struct {
	users  UserStore
	tokens *TokenManager
}

func NewService(users UserStore, tokens *TokenManager) *Service {
	return &Service{users: users, tokens: tokens}
}

func (s *Service) Login(ctx context.Context, tenantID, email, password string) (string, error) {
	if tenantID == "" || strings.TrimSpace(email) == "" || password == "" {
		return "", ErrInvalidCredentials
	}
	user, roles, err := s.users.FindLoginUser(ctx, tenantID, strings.ToLower(strings.TrimSpace(email)))
	if err != nil || !user.Active || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return "", ErrInvalidCredentials
	}
	codes := make([]string, len(roles))
	for i := range roles {
		codes[i] = roles[i].Code
	}
	return s.tokens.Issue(Identity{TenantID: tenantID, UserID: user.ID, Roles: codes}, 8*time.Hour)
}
