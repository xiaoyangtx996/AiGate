package alerts

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

func TestThresholdDedupeAndWebhookJob(t *testing.T) {
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
	if _, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,'alerts integration')`, tenant); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'dept')`, organization, tenant); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Pool().Exec(ctx, `INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'user','hash')`, user, tenant, organization, user+"@example.test"); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, tenant); err != nil {
			t.Errorf("cleanup tenant: %v", err)
		}
	})
	for _, item := range []struct{ scope, id string }{{"tenant", tenant}, {"organization", organization}, {"user", user}} {
		if _, err = store.Pool().Exec(ctx, `INSERT INTO quota_accounts(tenant_id,scope_type,scope_id,limit_tokens,used_tokens) VALUES($1,$2,$3,100,95)`, tenant, item.scope, item.id); err != nil {
			t.Fatal(err)
		}
	}
	called := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called++; w.WriteHeader(http.StatusNoContent) }))
	defer server.Close()
	repo := NewPostgres(store)
	service := NewService(repo, server.Client())
	if err = service.SetPolicy(ctx, Policy{TenantID: tenant, Thresholds: []int16{70, 90, 100}, WebhookURL: server.URL, CooldownSeconds: 3600, Enabled: true}); err != nil {
		t.Fatal(err)
	}
	if err = service.Evaluate(ctx, tenant); err != nil {
		t.Fatal(err)
	}
	if err = service.Evaluate(ctx, tenant); err != nil {
		t.Fatal(err)
	}
	var alertsCount, jobsCount int
	if err = store.Pool().QueryRow(ctx, `SELECT count(*) FROM quota_alerts WHERE tenant_id=$1`, tenant).Scan(&alertsCount); err != nil {
		t.Fatal(err)
	}
	if err = store.Pool().QueryRow(ctx, `SELECT count(*) FROM jobs WHERE tenant_id=$1`, tenant).Scan(&jobsCount); err != nil {
		t.Fatal(err)
	}
	if alertsCount != 6 || jobsCount != 6 {
		t.Fatalf("alerts=%d jobs=%d", alertsCount, jobsCount)
	}
	var job jobs.Job
	var payload []byte
	if err = store.Pool().QueryRow(ctx, `SELECT id,payload FROM jobs WHERE tenant_id=$1 AND job_type='alert.webhook' ORDER BY created_at LIMIT 1`, tenant).Scan(&job.ID, &payload); err != nil {
		t.Fatal(err)
	}
	job.TenantID, job.Type, job.Payload = tenant, "alert.webhook", payload
	if err = service.WebhookHandler(ctx, job); err != nil {
		t.Fatal(err)
	}
	if called != 1 {
		t.Fatalf("webhook calls=%d", called)
	}
	var delivered int
	if err = store.Pool().QueryRow(ctx, `SELECT count(*) FROM quota_alerts WHERE tenant_id=$1 AND delivery_status='delivered'`, tenant).Scan(&delivered); err != nil {
		t.Fatal(err)
	}
	if delivered != 1 {
		t.Fatalf("delivered=%d", delivered)
	}
}
