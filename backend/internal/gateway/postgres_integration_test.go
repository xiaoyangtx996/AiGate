package gateway

import (
	"context"
	"os"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

func TestPostgresLoggerWritesCorrelatedBlockedAudit(t *testing.T) {
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
	tenant, _ := domain.NewID()
	organization, _ := domain.NewID()
	user, _ := domain.NewID()
	key, _ := domain.NewID()
	project, _ := domain.NewID()
	trace := "gateway-audit-" + key
	if _, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,'gateway audit')`, tenant); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, tenant); err != nil {
			t.Errorf("cleanup tenant: %v", err)
		}
	})
	if _, err = store.Pool().Exec(ctx, `INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'dept')`, organization, tenant); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'user','hash')`, user, tenant, organization, user+"@example.test"); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO api_keys(id,tenant_id,organization_id,user_id,name,key_prefix,key_hash) VALUES($1,$2,$3,$4,'key','ag-test',$5)`, key, tenant, organization, user, "hash-"+key); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO projects(id,tenant_id,organization_id,name) VALUES($1,$2,$3,'Gateway Project')`, project, tenant, organization); err != nil {
		t.Fatal(err)
	}
	logger := NewPostgresLogger(store)
	if err = logger.Write(ctx, Log{TraceID: trace, TenantID: tenant, OrganizationID: organization, UserID: user, APIKeyID: key, ProjectID: project, Model: "test-model", Estimated: true, Blocked: true, StatusCode: 429, ErrorCode: "quota_exhausted"}); err != nil {
		t.Fatal(err)
	}
	var eventType, outcome string
	if err = store.Pool().QueryRow(ctx, `SELECT event_type,outcome FROM audit_events WHERE tenant_id=$1 AND trace_id=$2`, tenant, trace).Scan(&eventType, &outcome); err != nil {
		t.Fatal(err)
	}
	if eventType != "quota.blocked" || outcome != "blocked" {
		t.Fatalf("event_type=%s outcome=%s", eventType, outcome)
	}
	logs, err := logger.List(ctx, LogFilter{TenantID: tenant})
	if err != nil || len(logs) != 1 || logs[0].ProjectID != project || logs[0].ProjectName != "Gateway Project" {
		t.Fatalf("logs=%+v err=%v", logs, err)
	}
	var metadataProject string
	if err = store.Pool().QueryRow(ctx, `SELECT metadata->>'project_id' FROM audit_events WHERE tenant_id=$1 AND trace_id=$2`, tenant, trace).Scan(&metadataProject); err != nil || metadataProject != project {
		t.Fatalf("metadata project=%s err=%v", metadataProject, err)
	}
	if _, err = store.Pool().Exec(ctx, `DELETE FROM projects WHERE tenant_id=$1 AND id=$2`, tenant, project); err == nil {
		t.Fatal("attributed project deletion should preserve audit attribution")
	}
	var remainingTenant string
	var remainingProject *string
	if err = store.Pool().QueryRow(ctx, `SELECT tenant_id::text,project_id::text FROM api_logs WHERE tenant_id=$1 AND trace_id=$2`, tenant, trace).Scan(&remainingTenant, &remainingProject); err != nil || remainingTenant != tenant || remainingProject == nil || *remainingProject != project {
		t.Fatalf("tenant=%s project=%v err=%v", remainingTenant, remainingProject, err)
	}
}
