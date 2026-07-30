package jobs

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/db"
)

func TestPostgresClaimRetryAndDeadLetter(t *testing.T) {
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
	repo := NewPostgres(store)
	prefix := "jobs-integration-" + time.Now().Format("150405.000000000")
	for i := 0; i < 2; i++ {
		if err = repo.Enqueue(ctx, Job{Type: prefix, MaxAttempts: 2}); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		if _, err := store.Pool().Exec(ctx, `DELETE FROM jobs WHERE job_type=$1`, prefix); err != nil {
			t.Errorf("cleanup jobs: %v", err)
		}
	})
	first, err := repo.Claim(ctx, "worker-a", time.Minute, []string{prefix})
	if err != nil {
		t.Fatal(err)
	}
	second, err := repo.Claim(ctx, "worker-b", time.Minute, []string{prefix})
	if err != nil {
		t.Fatal(err)
	}
	if first.ID == second.ID {
		t.Fatal("workers claimed the same job")
	}
	if err = repo.Complete(ctx, second.ID, "worker-b"); err != nil {
		t.Fatal(err)
	}
	if err = repo.Fail(ctx, first, "first failure", 0); err != nil {
		t.Fatal(err)
	}
	retry, err := repo.Claim(ctx, "worker-a", time.Minute, []string{prefix})
	if err != nil {
		t.Fatal(err)
	}
	if retry.ID != first.ID || retry.Attempts != 2 {
		t.Fatalf("retry=%+v", retry)
	}
	if err = repo.Fail(ctx, retry, "second failure", 0); err != nil {
		t.Fatal(err)
	}
	var status string
	if err = store.Pool().QueryRow(ctx, `SELECT status FROM jobs WHERE id=$1`, first.ID).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != "dead_letter" {
		t.Fatalf("status=%s", status)
	}
}
