package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/alerts"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	store, err := db.Open(ctx, env("AIGATE_DATABASE_URL", "postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable"))
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()
	alertService := alerts.NewService(alerts.NewPostgres(store), nil)
	hostname, _ := os.Hostname()
	runner := jobs.Runner{
		Queue: jobs.NewPostgres(store), WorkerID: env("AIGATE_WORKER_ID", fmt.Sprintf("%s-%d", hostname, os.Getpid())), Lease: 30 * time.Second,
		Handlers: map[string]jobs.Handler{"alert.webhook": alertService.WebhookHandler},
	}
	log.Printf("AiGate worker started as %s", runner.WorkerID)
	if err := runner.Run(ctx, time.Second); err != nil && !errors.Is(err, context.Canceled) {
		log.Fatal(err)
	}
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
