package auth

import (
	"context"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type loginStore struct{ user domain.User }

func (s loginStore) FindLoginUser(_ context.Context, tenantID, email string) (domain.User, []domain.Role, error) {
	if tenantID != s.user.TenantID || email != s.user.Email {
		return domain.User{}, nil, ErrInvalidCredentials
	}
	return s.user, []domain.Role{{Code: domain.RolePlatformAdmin}}, nil
}

func TestLoginIssuesTenantScopedToken(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	manager, err := NewTokenManager("01234567890123456789012345678901")
	if err != nil {
		t.Fatal(err)
	}
	service := NewService(loginStore{user: domain.User{ID: "user-a", TenantID: "tenant-a", Email: "admin@example.com", PasswordHash: string(hash), Active: true}}, manager)
	token, err := service.Login(context.Background(), "tenant-a", "ADMIN@example.com", "correct-password")
	if err != nil {
		t.Fatal(err)
	}
	identity, err := manager.Parse(token)
	if err != nil {
		t.Fatal(err)
	}
	if identity.TenantID != "tenant-a" || identity.UserID != "user-a" || !identity.HasRole(domain.RolePlatformAdmin) {
		t.Fatalf("unexpected identity: %+v", identity)
	}
}

func TestTokenRejectsTamperingAndExpiry(t *testing.T) {
	manager, _ := NewTokenManager("01234567890123456789012345678901")
	manager.now = func() time.Time { return time.Unix(100, 0) }
	token, _ := manager.Issue(Identity{TenantID: "tenant-a", UserID: "user-a"}, time.Second)
	if _, err := manager.Parse(token + "x"); err == nil {
		t.Fatal("tampered token was accepted")
	}
	manager.now = func() time.Time { return time.Unix(102, 0) }
	if _, err := manager.Parse(token); err == nil {
		t.Fatal("expired token was accepted")
	}
}
