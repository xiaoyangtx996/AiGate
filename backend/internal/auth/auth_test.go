package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type loginStore struct {
	accounts []LoginAccount
	operator *PlatformOperator
	tenants  []TenantOption
}

func (s loginStore) FindLoginAccounts(_ context.Context, email string) ([]LoginAccount, error) {
	result := []LoginAccount{}
	for _, account := range s.accounts {
		if account.User.Email == email {
			result = append(result, account)
		}
	}
	return result, nil
}
func (s loginStore) FindPlatformOperator(_ context.Context, email string) (PlatformOperator, error) {
	if s.operator == nil || s.operator.Email != email {
		return PlatformOperator{}, errors.New("not found")
	}
	return *s.operator, nil
}
func (s loginStore) ListTenants(context.Context) ([]TenantOption, error) { return s.tenants, nil }
func (s loginStore) TenantExists(_ context.Context, id string) (bool, error) {
	for _, tenant := range s.tenants {
		if tenant.ID == id {
			return true, nil
		}
	}
	return false, nil
}

func passwordHash(t *testing.T) string {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	return string(hash)
}

func tokenManager(t *testing.T) *TokenManager {
	t.Helper()
	manager, err := NewTokenManager("01234567890123456789012345678901")
	if err != nil {
		t.Fatal(err)
	}
	return manager
}

func TestLoginAutomaticallySelectsOnlyTenant(t *testing.T) {
	manager := tokenManager(t)
	store := loginStore{accounts: []LoginAccount{{User: domain.User{ID: "user-a", TenantID: "tenant-a", Email: "admin@example.com", PasswordHash: passwordHash(t), Active: true}, Roles: []domain.Role{{Code: domain.RolePlatformAdmin}}, TenantName: "租户 A"}}}
	result, err := NewService(store, manager).Login(context.Background(), "ADMIN@example.com", "correct-password", "")
	if err != nil {
		t.Fatal(err)
	}
	identity, err := manager.Parse(result.Token)
	if err != nil || identity.TenantID != "tenant-a" || identity.Platform {
		t.Fatalf("identity=%+v err=%v", identity, err)
	}
}

func TestDuplicateEmailRequiresOwnedTenantSelection(t *testing.T) {
	manager := tokenManager(t)
	hash := passwordHash(t)
	store := loginStore{accounts: []LoginAccount{
		{User: domain.User{ID: "user-a", TenantID: "tenant-a", Email: "user@example.com", PasswordHash: hash, Active: true}, TenantName: "租户 A"},
		{User: domain.User{ID: "user-b", TenantID: "tenant-b", Email: "user@example.com", PasswordHash: hash, Active: true}, TenantName: "租户 B"},
	}}
	service := NewService(store, manager)
	result, err := service.Login(context.Background(), "user@example.com", "correct-password", "")
	if !errors.Is(err, ErrTenantRequired) || len(result.Tenants) != 2 {
		t.Fatalf("result=%+v err=%v", result, err)
	}
	if _, err = service.Login(context.Background(), "user@example.com", "correct-password", "tenant-c"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("cross-tenant selection err=%v", err)
	}
	result, err = service.Login(context.Background(), "user@example.com", "correct-password", "tenant-b")
	if err != nil {
		t.Fatal(err)
	}
	identity, _ := manager.Parse(result.Token)
	if identity.TenantID != "tenant-b" {
		t.Fatalf("identity=%+v", identity)
	}
}

func TestPlatformOperatorCanSwitchValidTenant(t *testing.T) {
	manager := tokenManager(t)
	store := loginStore{operator: &PlatformOperator{ID: "operator", Email: "hq@example.com", DisplayName: "总部", PasswordHash: passwordHash(t), DefaultTenantID: "tenant-a", Active: true}, tenants: []TenantOption{{ID: "tenant-a"}, {ID: "tenant-b"}}}
	service := NewService(store, manager)
	result, err := service.Login(context.Background(), "hq@example.com", "correct-password", "")
	if err != nil {
		t.Fatal(err)
	}
	identity, _ := manager.Parse(result.Token)
	if !identity.Platform || identity.TenantID != "tenant-a" {
		t.Fatalf("identity=%+v", identity)
	}
	token, err := service.SwitchTenant(context.Background(), identity, "tenant-b")
	if err != nil {
		t.Fatal(err)
	}
	switched, _ := manager.Parse(token)
	if switched.TenantID != "tenant-b" || !switched.Platform {
		t.Fatalf("identity=%+v", switched)
	}
	if _, err = service.SwitchTenant(context.Background(), Identity{TenantID: "tenant-a", UserID: "user-a"}, "tenant-b"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("tenant user switch err=%v", err)
	}
}

func TestTokenRejectsTamperingAndExpiry(t *testing.T) {
	manager := tokenManager(t)
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
