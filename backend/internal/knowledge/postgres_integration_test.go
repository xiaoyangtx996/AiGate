package knowledge

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
	"github.com/xiaoyangtx996/AiGate/internal/storage"
)

func TestPostgresUploadWorkerSearchAndIsolation(t *testing.T) {
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
	ids := make([]string, 7)
	for i := range ids {
		ids[i], err = domain.NewID()
		if err != nil {
			t.Fatal(err)
		}
	}
	tenant, org, user, outsider, project, otherProject := ids[0], ids[1], ids[2], ids[3], ids[4], ids[5]
	batch := &pgx.Batch{}
	batch.Queue(`INSERT INTO tenants(id,name) VALUES($1,$2)`, tenant, "rag-"+tenant)
	batch.Queue(`INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,$3)`, org, tenant, "dept")
	batch.Queue(`INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'member','x'),($5,$2,$3,$6,'outsider','x')`, user, tenant, org, "member-"+user+"@test", outsider, "outsider-"+outsider+"@test")
	batch.Queue(`INSERT INTO projects(id,tenant_id,organization_id,name) VALUES($1,$2,$3,$4),($5,$2,$3,$6)`, project, tenant, org, "project-a-"+project, otherProject, "project-b-"+otherProject)
	batch.Queue(`INSERT INTO project_memberships(tenant_id,project_id,user_id) VALUES($1,$2,$3)`, tenant, project, user)
	batchResults := store.Pool().SendBatch(ctx, batch)
	for range 5 {
		if _, err = batchResults.Exec(); err != nil {
			break
		}
	}
	_ = batchResults.Close()
	if err != nil {
		t.Fatal(err)
	}
	defer store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, tenant)
	queue := jobs.NewPostgres(store)
	embedder := rag.HashEmbedder{}
	svc := NewService(NewPostgres(store), store, storage.Local{Root: t.TempDir(), MaxBytes: 1024}, queue, embedder)
	kb, err := svc.Create(ctx, tenant, project, user, "manual")
	if err != nil {
		t.Fatal(err)
	}
	doc, err := svc.Upload(ctx, tenant, project, kb.ID, user, "guide.md", "text/markdown", strings.NewReader("AiGate knowledge retrieval keeps project citations isolated."))
	if err != nil {
		t.Fatal(err)
	}
	runner := jobs.Runner{Queue: queue, WorkerID: "rag-test", Lease: time.Minute, Handlers: map[string]jobs.Handler{ProcessJobType: svc.Handler}}
	if err := runner.RunOnce(ctx); err != nil {
		t.Fatal(err)
	}
	ready, err := svc.Status(ctx, tenant, project, doc.ID, user)
	if err != nil || ready.Status != "ready" {
		t.Fatalf("doc=%+v err=%v", ready, err)
	}
	search := rag.NewService(store, rag.NewPostgres(store), embedder)
	results, err := search.Search(ctx, tenant, project, kb.ID, user, "project citations", 5)
	if err != nil || len(results) == 0 || results[0].Citation.DocumentID != doc.ID {
		t.Fatalf("results=%+v err=%v", results, err)
	}
	if _, err := search.Search(ctx, tenant, project, kb.ID, outsider, "project citations", 5); err != rag.ErrForbidden {
		t.Fatalf("cross-project/member search err=%v", err)
	}
	if _, err := search.Search(ctx, tenant, otherProject, kb.ID, user, "project citations", 5); err != rag.ErrForbidden {
		t.Fatalf("other project search err=%v", err)
	}
}
