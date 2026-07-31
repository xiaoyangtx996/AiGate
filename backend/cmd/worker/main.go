package main

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/alerts"
	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
	"github.com/xiaoyangtx996/AiGate/internal/knowledge"
	"github.com/xiaoyangtx996/AiGate/internal/mcp"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
	"github.com/xiaoyangtx996/AiGate/internal/storage"
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
	objects := storage.Local{Root: env("AIGATE_OBJECT_STORAGE_PATH", "./data/objects"), MaxBytes: envInt64("AIGATE_OBJECT_MAX_BYTES", 20<<20)}
	embedder := rag.NewEmbedder(rag.EmbedderConfig{
		BaseURL:    os.Getenv("AIGATE_EMBEDDING_BASE_URL"),
		APIKey:     os.Getenv("AIGATE_EMBEDDING_API_KEY"),
		Model:      env("AIGATE_EMBEDDING_MODEL", "text-embedding-3-small"),
		Dimensions: int(envInt64("AIGATE_EMBEDDING_DIMENSIONS", 384)),
	})
	knowledgeService := knowledge.NewService(knowledge.NewPostgres(store), store, objects, jobs.NewPostgres(store), embedder)
	encryptionKey, err := base64.StdEncoding.DecodeString(os.Getenv("AIGATE_CHANNEL_ENCRYPTION_KEY"))
	if err != nil {
		log.Fatal(err)
	}
	cipher, err := channel.NewCipher(encryptionKey)
	if err != nil {
		log.Fatal(err)
	}
	mcpService := mcp.NewService(mcp.NewPostgres(store), store, cipher, jobs.NewPostgres(store), audit.NewService(audit.NewPostgres(store)), nil)
	hostname, _ := os.Hostname()
	runner := jobs.Runner{
		Queue: jobs.NewPostgres(store), WorkerID: env("AIGATE_WORKER_ID", fmt.Sprintf("%s-%d", hostname, os.Getpid())), Lease: 30 * time.Second,
		Handlers: map[string]jobs.Handler{"alert.webhook": alertService.WebhookHandler, knowledge.ProcessJobType: knowledgeService.Handler, mcp.HealthJobType: mcpService.HealthHandler},
	}
	log.Printf("AiGate worker started as %s", runner.WorkerID)
	if err := runner.Run(ctx, time.Second); err != nil && !errors.Is(err, context.Canceled) {
		log.Fatal(err)
	}
}

func envInt64(name string, fallback int64) int64 {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed <= 0 {
		log.Fatalf("%s must be a positive integer", name)
	}
	return parsed
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
