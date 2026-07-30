package quota

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

func TestPostgresConservationAndReservation(t *testing.T) {
	dsn := os.Getenv("AIGATE_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("AIGATE_TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	store, err := db.Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	tenantID, _ := domain.NewID()
	organizationID, _ := domain.NewID()
	userID, _ := domain.NewID()
	defer func() { _, _ = store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, tenantID) }()
	if _, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,'quota test')`, tenantID); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO organizations(id,tenant_id,name) VALUES($2,$1,'IT')`, tenantID, organizationID); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO users(id,tenant_id,organization_id,email,password_hash) VALUES($3,$1,$2,$4,'test-hash')`, tenantID, organizationID, userID, userID+"@example.test"); err != nil {
		t.Fatal(err)
	}
	repo := NewPostgres(store)
	service := NewService(repo)
	for _, account := range []Account{{TenantID: tenantID, Scope: Tenant, ScopeID: tenantID, LimitTokens: 100}, {TenantID: tenantID, Scope: Organization, ScopeID: organizationID, LimitTokens: 80}, {TenantID: tenantID, Scope: User, ScopeID: userID, LimitTokens: 30}} {
		if err = service.SetLimit(ctx, account); err != nil {
			t.Fatal(err)
		}
	}
	if err = service.SetLimit(ctx, Account{TenantID: tenantID, Scope: Organization, ScopeID: organizationID, LimitTokens: 101}); !errors.Is(err, ErrConservation) {
		t.Fatalf("organization conservation err=%v", err)
	}
	if err = service.SetLimit(ctx, Account{TenantID: tenantID, Scope: User, ScopeID: userID, LimitTokens: 81}); !errors.Is(err, ErrConservation) {
		t.Fatalf("user conservation err=%v", err)
	}
	r, err := service.Reserve(ctx, tenantID, organizationID, userID, 20)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = service.Reserve(ctx, tenantID, organizationID, userID, 11); !errors.Is(err, ErrExhausted) {
		t.Fatalf("reserve err=%v", err)
	}
	if err = service.Cancel(ctx, r); err != nil {
		t.Fatal(err)
	}
	r, err = service.Reserve(ctx, tenantID, organizationID, userID, 25)
	if err != nil {
		t.Fatal(err)
	}
	if err = service.Settle(ctx, r, 1000); err != nil {
		t.Fatal(err)
	}
	var used, reservedLeft, limit int64
	if err = store.Pool().QueryRow(ctx, `SELECT used_tokens,reserved_tokens,limit_tokens FROM quota_accounts WHERE tenant_id=$1 AND scope_type='user' AND scope_id=$2`, tenantID, userID).Scan(&used, &reservedLeft, &limit); err != nil {
		t.Fatal(err)
	}
	if reservedLeft != 0 || used > limit || used != limit {
		t.Fatalf("user quota used=%d reserved=%d limit=%d", used, reservedLeft, limit)
	}

	otherTenant, _ := domain.NewID()
	otherOrg, _ := domain.NewID()
	otherUser, _ := domain.NewID()
	defer func() { _, _ = store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, otherTenant) }()
	if _, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,'quota missing')`, otherTenant); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO organizations(id,tenant_id,name) VALUES($2,$1,'IT')`, otherTenant, otherOrg); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO users(id,tenant_id,organization_id,email,password_hash) VALUES($3,$1,$2,$4,'test-hash')`, otherTenant, otherOrg, otherUser, otherUser+"@example.test"); err != nil {
		t.Fatal(err)
	}
	if _, err = service.Reserve(ctx, otherTenant, otherOrg, otherUser, 1); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("missing quota err=%v", err)
	}
}
