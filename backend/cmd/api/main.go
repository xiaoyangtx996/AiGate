package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/org"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
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
	app := &api{
		auth: auth.NewService(store, tokens), tokens: tokens,
		rbac: rbacService, org: org.NewService(store),
	}
	addr := envOr("AIGATE_HTTP_ADDR", ":8080")
	log.Printf("AiGate API listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, app.handler()))
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
