package db

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
)

func TestCreateProjectRequiresOrganizationAndAddsCreator(t *testing.T) {
	dsn := os.Getenv("AIGATE_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("AIGATE_TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	store, err := Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	tenant, _ := domain.NewID()
	organization, _ := domain.NewID()
	user, _ := domain.NewID()
	otherUser, _ := domain.NewID()
	otherOrganization, _ := domain.NewID()
	otherOrganizationUser, _ := domain.NewID()
	project, _ := domain.NewID()
	missingOrganization, _ := domain.NewID()
	missingProject, _ := domain.NewID()
	batch := &pgx.Batch{}
	batch.Queue(`INSERT INTO tenants(id,name) VALUES($1,$2)`, tenant, "project-test-"+tenant)
	batch.Queue(`INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'dept')`, organization, tenant)
	batch.Queue(`INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'creator','x')`, user, tenant, organization, "creator-"+user+"@test")
	batch.Queue(`INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'candidate','x')`, otherUser, tenant, organization, "candidate-"+otherUser+"@test")
	batch.Queue(`INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'other dept')`, otherOrganization, tenant)
	batch.Queue(`INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'other','x')`, otherOrganizationUser, tenant, otherOrganization, "other-"+otherOrganizationUser+"@test")
	results := store.Pool().SendBatch(ctx, batch)
	for range 6 {
		if _, err = results.Exec(); err != nil {
			break
		}
	}
	_ = results.Close()
	if err != nil {
		t.Fatal(err)
	}
	defer store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, tenant)

	err = store.CreateProject(ctx, domain.Project{ID: missingProject, TenantID: tenant, OrganizationID: missingOrganization, Name: "invalid"}, user)
	if !errors.Is(err, rbac.ErrNotFound) {
		t.Fatalf("invalid organization err=%v", err)
	}
	var count int
	if err = store.Pool().QueryRow(ctx, `SELECT count(*) FROM projects WHERE id=$1`, missingProject).Scan(&count); err != nil || count != 0 {
		t.Fatalf("invalid project count=%d err=%v", count, err)
	}

	err = store.CreateProject(ctx, domain.Project{ID: project, TenantID: tenant, OrganizationID: organization, Name: "valid"}, user)
	if err != nil {
		t.Fatal(err)
	}
	if err = store.Pool().QueryRow(ctx, `SELECT count(*) FROM project_memberships WHERE tenant_id=$1 AND project_id=$2 AND user_id=$3`, tenant, project, user).Scan(&count); err != nil || count != 1 {
		t.Fatalf("membership count=%d err=%v", count, err)
	}
	memberMap, err := store.ListProjectMembersBatch(ctx, tenant, user, false)
	if err != nil || len(memberMap[project]) != 1 || memberMap[project][0].ID != user {
		t.Fatalf("member map=%+v err=%v", memberMap, err)
	}
	outsiderMap, err := store.ListProjectMembersBatch(ctx, tenant, otherUser, false)
	if err != nil || len(outsiderMap) != 0 {
		t.Fatalf("outsider map=%+v err=%v", outsiderMap, err)
	}
	candidates, err := store.ListProjectMemberCandidates(ctx, tenant, project)
	if err != nil || len(candidates) != 1 || candidates[0].ID != otherUser {
		t.Fatalf("candidates=%+v err=%v", candidates, err)
	}
	candidateMap, err := store.ListProjectMemberCandidatesBatch(ctx, tenant, user, false)
	if err != nil || len(candidateMap[project]) != 1 || candidateMap[project][0].ID != otherUser {
		t.Fatalf("candidate map=%+v err=%v", candidateMap, err)
	}
	outsiderCandidates, err := store.ListProjectMemberCandidatesBatch(ctx, tenant, otherUser, false)
	if err != nil || len(outsiderCandidates) != 0 {
		t.Fatalf("outsider candidates=%+v err=%v", outsiderCandidates, err)
	}
	adminCandidates, err := store.ListProjectMemberCandidatesBatch(ctx, tenant, otherUser, true)
	if err != nil || len(adminCandidates[project]) != 1 || adminCandidates[project][0].ID != otherUser {
		t.Fatalf("includeAll candidates=%+v err=%v", adminCandidates, err)
	}
	if err = store.GrantProject(ctx, tenant, project, otherOrganizationUser); !errors.Is(err, rbac.ErrNotFound) {
		t.Fatalf("cross-organization grant err=%v", err)
	}
}
