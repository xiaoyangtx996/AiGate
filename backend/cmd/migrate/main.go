package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/migrate"
)

func main() {
	if len(os.Args) < 2 {
		fatalUsage()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	dsn := env("AIGATE_DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/AiGate?sslmode=disable")
	dir := env("AIGATE_MIGRATIONS_DIR", filepath.Join("migrations"))
	if abs, err := filepath.Abs(dir); err == nil {
		dir = abs
	}
	store, err := db.Open(ctx, dsn)
	if err != nil {
		fail(err)
	}
	defer store.Close()
	m := migrate.New(store.Pool(), dir)
	switch os.Args[1] {
	case "up":
		ran, err := m.Up(ctx)
		if err != nil {
			fail(err)
		}
		if len(ran) == 0 {
			fmt.Println("migrate: already up to date")
			return
		}
		for _, v := range ran {
			fmt.Println("applied", v)
		}
	case "baseline":
		n, err := m.Baseline(ctx)
		if err != nil {
			fail(err)
		}
		fmt.Printf("migrate: baselined %d version(s)\n", n)
	default:
		fatalUsage()
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func fatalUsage() {
	fmt.Fprintln(os.Stderr, "usage: go run ./cmd/migrate up|baseline")
	os.Exit(2)
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "migrate:", err)
	os.Exit(1)
}
