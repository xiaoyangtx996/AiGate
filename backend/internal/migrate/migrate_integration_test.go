package migrate

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/db"
)

func TestUpIsIdempotentOnExistingDB(t *testing.T) {
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
	dir := filepath.Join("..", "..", "migrations")
	m := New(store.Pool(), dir)
	if _, err := m.Up(ctx); err != nil {
		t.Fatal(err)
	}
	ran, err := m.Up(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(ran) != 0 {
		t.Fatalf("second up should be no-op, ran=%v", ran)
	}
}
