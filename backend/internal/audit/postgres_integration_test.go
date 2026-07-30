package audit

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

func TestPostgresTenantAndTimeIsolation(t *testing.T) {
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
	for _, id := range []string{tenantA, tenantB} {
		if _, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,$2)`, id, "audit-"+id); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		if _, err := store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=ANY($1)`, []string{tenantA, tenantB}); err != nil {
			t.Errorf("cleanup tenants: %v", err)
		}
	})
	repo := NewPostgres(store)
	service := NewService(repo)
	if err = service.Append(ctx, Event{TenantID: tenantA, TraceID: "trace-a", EventType: "gateway.call", Outcome: "success"}); err != nil {
		t.Fatal(err)
	}
	if err = service.Append(ctx, Event{TenantID: tenantB, TraceID: "trace-b", EventType: "gateway.call", Outcome: "success"}); err != nil {
		t.Fatal(err)
	}
	from := time.Now().Add(-time.Minute)
	to := time.Now().Add(time.Minute)
	events, err := service.List(ctx, Filter{TenantID: tenantA, From: &from, To: &to, Limit: 100})
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0].TraceID != "trace-a" {
		t.Fatalf("events=%+v", events)
	}
}
