package main

import (
	"context"
	"encoding/base64"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/agent"
	"github.com/xiaoyangtx996/AiGate/internal/alerts"
	"github.com/xiaoyangtx996/AiGate/internal/apikey"
	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/bot"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/gateway"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
	"github.com/xiaoyangtx996/AiGate/internal/knowledge"
	"github.com/xiaoyangtx996/AiGate/internal/mcp"
	"github.com/xiaoyangtx996/AiGate/internal/org"
	"github.com/xiaoyangtx996/AiGate/internal/quota"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
	"github.com/xiaoyangtx996/AiGate/internal/storage"
	"github.com/xiaoyangtx996/AiGate/internal/usage"
	"golang.org/x/crypto/bcrypt"
)

const defaultDSN = "postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable"

func main() {
	ctx := context.Background()
	dsn := envOr("AIGATE_DATABASE_URL", defaultDSN)
	store, err := db.Open(ctx, dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	tokens, err := auth.NewTokenManager(os.Getenv("AIGATE_JWT_SECRET"))
	if err != nil {
		log.Fatal(err)
	}
	rbacService := rbac.NewService(store)
	if err := bootstrapAdmin(ctx, rbacService); err != nil {
		log.Fatal(err)
	}
	if err := bootstrapPlatformOperator(ctx, store); err != nil {
		log.Fatal(err)
	}
	encryptionKey, err := base64.StdEncoding.DecodeString(os.Getenv("AIGATE_CHANNEL_ENCRYPTION_KEY"))
	if err != nil {
		log.Fatal(err)
	}
	cipher, err := channel.NewCipher(encryptionKey)
	if err != nil {
		log.Fatal(err)
	}
	alertService := alerts.NewService(alerts.NewPostgres(store), nil)
	objects := storage.Local{Root: envOr("AIGATE_OBJECT_STORAGE_PATH", "./data/objects"), MaxBytes: envInt64("AIGATE_OBJECT_MAX_BYTES", 20<<20)}
	embedder := rag.NewEmbedder(rag.EmbedderConfig{
		BaseURL:    os.Getenv("AIGATE_EMBEDDING_BASE_URL"),
		APIKey:     os.Getenv("AIGATE_EMBEDDING_API_KEY"),
		Model:      envOr("AIGATE_EMBEDDING_MODEL", "text-embedding-3-small"),
		Dimensions: int(envInt64("AIGATE_EMBEDDING_DIMENSIONS", 384)),
	})
	knowledgeService := knowledge.NewService(knowledge.NewPostgres(store), store, objects, jobs.NewPostgres(store), embedder)
	mcpService := mcp.NewService(mcp.NewPostgres(store), store, cipher, jobs.NewPostgres(store), audit.NewService(audit.NewPostgres(store)), nil)
	ragService := rag.NewService(store, rag.NewPostgres(store), embedder)
	agentService := agent.NewService(agent.NewPostgres(store), store, ragService, agent.GatewayClient{BaseURL: envOr("AIGATE_GATEWAY_BASE_URL", "http://127.0.0.1:8081")}, mcpService, audit.NewService(audit.NewPostgres(store)))
	app := &api{
		auth: auth.NewService(store, tokens), tokens: tokens,
		rbac: rbacService, org: org.NewService(store),
		keys:      apikey.NewService(apikey.NewPostgres(store)),
		quota:     quota.NewService(quota.NewPostgres(store), alertService),
		channels:  channel.NewService(channel.NewPostgres(store), cipher),
		logs:      gateway.NewPostgresLogger(store),
		audit:     audit.NewService(audit.NewPostgres(store)),
		alerts:    alertService,
		sessions:  store,
		projects:  store,
		knowledge: knowledgeService,
		rag:       ragService,
		mcp:       mcpService,
		agents:    agentService,
		bot:       bot.NewService(bot.NewPostgres(store)),
		usage:     usage.NewService(usage.NewPostgres(store)),
	}
	addr := envOr("AIGATE_HTTP_ADDR", ":8080")
	log.Printf("AiGate API listening on %s", addr)
	origins := envOr("AIGATE_CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
	log.Fatal(http.ListenAndServe(addr, corsMiddleware(strings.Split(origins, ","), app.handler())))
}

type platformOperatorStore interface {
	UpsertPlatformOperator(context.Context, auth.PlatformOperator) error
}

func bootstrapPlatformOperator(ctx context.Context, store platformOperatorStore) error {
	password := os.Getenv("AIGATE_PLATFORM_ADMIN_PASSWORD")
	if password == "" {
		return nil
	}
	email := strings.ToLower(strings.TrimSpace(os.Getenv("AIGATE_PLATFORM_ADMIN_EMAIL")))
	tenantID := os.Getenv("AIGATE_PLATFORM_DEFAULT_TENANT_ID")
	if email == "" || tenantID == "" {
		return errors.New("platform admin email and default tenant are required")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	id := os.Getenv("AIGATE_PLATFORM_ADMIN_ID")
	if id == "" {
		id, err = domain.NewID()
		if err != nil {
			return err
		}
	}
	return store.UpsertPlatformOperator(ctx, auth.PlatformOperator{ID: id, Email: email, DisplayName: "总公司管理员", PasswordHash: string(hash), DefaultTenantID: tenantID, Active: true})
}

func bootstrapAdmin(ctx context.Context, service *rbac.Service) error {
	password := os.Getenv("AIGATE_BOOTSTRAP_ADMIN_PASSWORD")
	if password == "" {
		return nil
	}
	tenantID := os.Getenv("AIGATE_BOOTSTRAP_TENANT_ID")
	organizationID := os.Getenv("AIGATE_BOOTSTRAP_ORGANIZATION_ID")
	email := os.Getenv("AIGATE_BOOTSTRAP_ADMIN_EMAIL")
	roles, err := service.ListRoles(ctx, tenantID)
	if err != nil {
		return err
	}
	var adminRoleID string
	for _, role := range roles {
		if role.Code == domain.RolePlatformAdmin {
			adminRoleID = role.ID
		}
	}
	if adminRoleID == "" {
		return rbac.ErrNotFound
	}
	users, err := service.ListUsers(ctx, tenantID)
	if err != nil {
		return err
	}
	for _, user := range users {
		if strings.EqualFold(user.Email, email) {
			_, err = service.UpdateUser(ctx, tenantID, rbac.UserInput{
				ID: user.ID, OrganizationID: organizationID, Email: email,
				DisplayName: user.DisplayName, Password: password, Active: true,
				RoleIDs: []string{adminRoleID},
			})
			return err
		}
	}
	_, err = service.CreateUser(ctx, tenantID, rbac.UserInput{
		OrganizationID: organizationID, Email: email, DisplayName: "Platform Admin",
		Password: password, Active: true, RoleIDs: []string{adminRoleID},
	})
	return err
}

func envOr(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
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
