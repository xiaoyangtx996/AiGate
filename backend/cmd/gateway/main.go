package main

import (
	"context"
	"encoding/base64"
	"github.com/xiaoyangtx996/AiGate/internal/apikey"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/gateway"
	"github.com/xiaoyangtx996/AiGate/internal/quota"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	ctx := context.Background()
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
	h := &gateway.Handler{Keys: apikey.NewService(apikey.NewPostgres(store)), Quota: quota.NewService(quota.NewPostgres(store)), Channels: channel.NewService(channel.NewPostgres(store), cipher), Logs: gateway.NewPostgresLogger(store), Client: &http.Client{Timeout: 2 * time.Minute}, TrustedProxyCIDRs: split(os.Getenv("TRUSTED_PROXY_CIDRS"))}
	addr := env("AIGATE_GATEWAY_ADDR", ":8081")
	log.Printf("AiGate gateway listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, h))
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
