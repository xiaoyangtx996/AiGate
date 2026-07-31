package mcp

import (
	"context"
	"os"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

func TestPostgresGrantMeterAndHealth(t *testing.T) {
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
	id := func() string { v, _ := domain.NewID(); return v }
	tenant, org, user, project, asset := id(), id(), id(), id(), id()
	_, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,$2)`, tenant, "mcp-"+tenant)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, tenant)
	_, err = store.Pool().Exec(ctx, `INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'dept')`, org, tenant)
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.Pool().Exec(ctx, `INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'user','x')`, user, tenant, org, user+"@test")
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.Pool().Exec(ctx, `INSERT INTO projects(id,tenant_id,organization_id,name) VALUES($1,$2,$3,$4)`, project, tenant, org, "p-"+project)
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.Pool().Exec(ctx, `INSERT INTO project_memberships(tenant_id,project_id,user_id) VALUES($1,$2,$3)`, tenant, project, user)
	if err != nil {
		t.Fatal(err)
	}
	repo := NewPostgres(store)
	if err = repo.CreateAsset(ctx, Asset{ID: asset, TenantID: tenant, Name: "private", Source: "private", EncryptedEndpoint: "cipher", HealthStatus: "unknown", Active: true}); err != nil {
		t.Fatal(err)
	}
	if err = repo.Grant(ctx, Grant{TenantID: tenant, AssetID: asset, ProjectID: project, GrantedBy: user}); err != nil {
		t.Fatal(err)
	}
	ok, err := repo.Authorized(ctx, tenant, asset, project, "")
	if err != nil || !ok {
		t.Fatalf("authorized=%v err=%v", ok, err)
	}
	trace := id()
	cost := int64(11)
	if err = repo.WriteUsage(ctx, Usage{TenantID: tenant, TraceID: trace, AssetID: asset, ProjectID: project, UserID: user, ToolName: "echo", CostMicros: &cost, StatusCode: 200}); err != nil {
		t.Fatal(err)
	}
	for i := 1; i <= 3; i++ {
		alerted, retry, err := repo.RecordHealth(ctx, tenant, asset, false, "", "down")
		if err != nil {
			t.Fatal(err)
		}
		if alerted != (i == 3) {
			t.Fatalf("attempt=%d alerted=%v", i, alerted)
		}
		if retry != (i < 3) {
			t.Fatalf("attempt=%d retry=%v", i, retry)
		}
	}
	var status string
	var failures, alerts int
	err = store.Pool().QueryRow(ctx, `SELECT health_status,consecutive_failures,(SELECT count(*) FROM mcp_health_alerts WHERE tenant_id=$1 AND mcp_asset_id=$2) FROM mcp_assets WHERE tenant_id=$1 AND id=$2`, tenant, asset).Scan(&status, &failures, &alerts)
	if err != nil || status != "unhealthy" || failures != 3 || alerts != 1 {
		t.Fatalf("status=%s failures=%d alerts=%d err=%v", status, failures, alerts, err)
	}
}
