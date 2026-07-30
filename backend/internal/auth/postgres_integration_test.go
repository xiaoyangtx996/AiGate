package auth_test

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

func TestPostgresMultiTenantLoginAndPlatformSwitch(t *testing.T) {
	dsn := os.Getenv("AIGATE_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("AIGATE_TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	store, err := db.Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(store.Close)
	tenantA, _ := domain.NewID()
	tenantB, _ := domain.NewID()
	orgA, _ := domain.NewID()
	orgB, _ := domain.NewID()
	userA, _ := domain.NewID()
	userB, _ := domain.NewID()
	operatorID, _ := domain.NewID()
	operatorEmail := "hq-" + operatorID + "@example.com"
	sharedEmail := "shared-" + operatorID + "@example.com"
	hash, _ := bcrypt.GenerateFromPassword([]byte("tenant-password"), bcrypt.MinCost)
	operatorHash, _ := bcrypt.GenerateFromPassword([]byte("platform-password"), bcrypt.MinCost)
	for _, item := range []struct{ id, name string }{{tenantA, "Login Tenant A"}, {tenantB, "Login Tenant B"}} {
		if _, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,$2)`, item.id, item.name); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		if _, err := store.Pool().Exec(ctx, `DELETE FROM platform_operators WHERE id=$1`, operatorID); err != nil {
			t.Errorf("cleanup operator: %v", err)
		}
		if _, err := store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=ANY($1)`, []string{tenantA, tenantB}); err != nil {
			t.Errorf("cleanup tenants: %v", err)
		}
	})
	if _, err = store.Pool().Exec(ctx, `INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'Department A'),($3,$4,'Department B')`, orgA, tenantA, orgB, tenantB); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'User A',$5),($6,$7,$8,$4,'User B',$5)`, userA, tenantA, orgA, sharedEmail, string(hash), userB, tenantB, orgB); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO user_roles(tenant_id,user_id,role_id) SELECT $1,$2,id FROM roles WHERE tenant_id=$1 AND code='platform_admin'`, tenantA, userA); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO user_roles(tenant_id,user_id,role_id) SELECT $1,$2,id FROM roles WHERE tenant_id=$1 AND code='platform_admin'`, tenantB, userB); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO platform_operators(id,email,display_name,password_hash,default_tenant_id) VALUES($1,$2,'HQ Admin',$3,$4)`, operatorID, operatorEmail, string(operatorHash), tenantA); err != nil {
		t.Fatal(err)
	}
	manager, _ := auth.NewTokenManager("01234567890123456789012345678901")
	service := auth.NewService(store, manager)
	result, err := service.Login(ctx, sharedEmail, "tenant-password", "")
	if !errors.Is(err, auth.ErrTenantRequired) || len(result.Tenants) != 2 {
		t.Fatalf("result=%+v err=%v", result, err)
	}
	result, err = service.Login(ctx, sharedEmail, "tenant-password", tenantA)
	if err != nil {
		t.Fatal(err)
	}
	tenantIdentity, _ := manager.Parse(result.Token)
	if tenantIdentity.TenantID != tenantA || tenantIdentity.Platform {
		t.Fatalf("identity=%+v", tenantIdentity)
	}
	if _, err = service.SwitchTenant(ctx, tenantIdentity, tenantB); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("switch err=%v", err)
	}
	result, err = service.Login(ctx, operatorEmail, "platform-password", "")
	if err != nil {
		t.Fatal(err)
	}
	platformIdentity, _ := manager.Parse(result.Token)
	token, err := service.SwitchTenant(ctx, platformIdentity, tenantB)
	if err != nil {
		t.Fatal(err)
	}
	switched, _ := manager.Parse(token)
	users, err := store.ListUsers(ctx, switched.TenantID)
	if err != nil || len(users) != 1 || users[0].TenantID != tenantB {
		t.Fatalf("users=%+v err=%v", users, err)
	}
}
