package main

import (
	"context"
	"encoding/base64"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/alerts"
	"github.com/xiaoyangtx996/AiGate/internal/apikey"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/gateway"
	"github.com/xiaoyangtx996/AiGate/internal/quota"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	dsn := env("AIGATE_DATABASE_URL", "postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable")
	store, err := db.Open(ctx, dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()
	key, err := base64.StdEncoding.DecodeString(os.Getenv("AIGATE_CHANNEL_ENCRYPTION_KEY"))
	if err != nil {
		log.Fatal(err)
	}
	cipher, err := channel.NewCipher(key)
	if err != nil {
		log.Fatal(err)
	}
	alertService := alerts.NewService(alerts.NewPostgres(store), nil)
	h := &gateway.Handler{
		Keys:              apikey.NewService(apikey.NewPostgres(store)),
		Quota:             quota.NewService(quota.NewPostgres(store), alertService),
		Channels:          channel.NewService(channel.NewPostgres(store), cipher),
		Logs:              gateway.NewPostgresLogger(store),
		Projects:          store,
		Ready:             store.Pool().Ping,
		Client:            &http.Client{Timeout: 2 * time.Minute},
		TrustedProxyCIDRs: split(os.Getenv("TRUSTED_PROXY_CIDRS")),
	}
	addr := env("AIGATE_GATEWAY_ADDR", ":8081")
	origins := env("AIGATE_CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
	server := &http.Server{Addr: addr, Handler: corsMiddleware(strings.Split(origins, ","), h)}
	log.Printf("AiGate gateway listening on %s", addr)
	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()
	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatal(err)
	}
}

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func split(v string) []string {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}
