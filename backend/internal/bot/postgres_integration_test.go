package bot

import (
	"context"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"os"
	"testing"
)

func TestPostgresSummaryCannotCrossTenant(t *testing.T) {
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
	id := func() string { x, _ := domain.NewID(); return x }
	t1, t2, o1, o2, u1, u2 := id(), id(), id(), id(), id(), id()
	for _, x := range []struct{ t, o, u string }{{t1, o1, u1}, {t2, o2, u2}} {
		_, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,$2)`, x.t, "bot-"+x.t)
		if err != nil {
			t.Fatal(err)
		}
		defer store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, x.t)
		_, _ = store.Pool().Exec(ctx, `INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'d')`, x.o, x.t)
		_, _ = store.Pool().Exec(ctx, `INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'u','x')`, x.u, x.t, x.o, x.u+"@test")
	}
	usage, err := NewPostgres(store).Summarize(ctx, t1, "", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if usage.TenantID != "" || usage.LLMCalls != 0 || usage.MCPCalls != 0 {
		t.Fatalf("unexpected %+v", usage)
	}
}
