package rbac

import (
	"context"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type memoryRepository struct {
	projects map[string]string
	users    map[string]string
	members  map[string]bool
}

func newMemoryRepository() *memoryRepository {
	return &memoryRepository{
		projects: map[string]string{"project-a": "tenant-a", "project-b": "tenant-b"},
		users:    map[string]string{"user-a": "tenant-a", "user-b": "tenant-b"},
		members:  map[string]bool{},
	}
}

func (r *memoryRepository) key(tenantID, projectID, userID string) string {
	return tenantID + "/" + projectID + "/" + userID
}

func (r *memoryRepository) GrantProject(_ context.Context, tenantID, projectID, userID string) error {
	if r.projects[projectID] != tenantID || r.users[userID] != tenantID {
		return ErrNotFound
	}
	r.members[r.key(tenantID, projectID, userID)] = true
	return nil
}

func (r *memoryRepository) RevokeProject(_ context.Context, tenantID, projectID, userID string) error {
	key := r.key(tenantID, projectID, userID)
	if !r.members[key] {
		return ErrNotFound
	}
	delete(r.members, key)
	return nil
}

func (r *memoryRepository) HasProjectAccess(_ context.Context, tenantID, projectID, userID string) (bool, error) {
	if r.projects[projectID] != tenantID || r.users[userID] != tenantID {
		return false, nil
	}
	return r.members[r.key(tenantID, projectID, userID)], nil
}

func (r *memoryRepository) ListUsers(context.Context, string) ([]domain.User, error) { return nil, nil }
func (r *memoryRepository) GetUser(context.Context, string, string) (domain.User, error) {
	return domain.User{}, ErrNotFound
}
func (r *memoryRepository) CreateUser(context.Context, domain.User, []string) error { return nil }
func (r *memoryRepository) UpdateUser(context.Context, domain.User, []string) error { return nil }
func (r *memoryRepository) DeleteUser(context.Context, string, string) error        { return nil }
func (r *memoryRepository) ListRoles(context.Context, string) ([]domain.Role, error) {
	return nil, nil
}
func (r *memoryRepository) GetRole(context.Context, string, string) (domain.Role, error) {
	return domain.Role{}, ErrNotFound
}
func (r *memoryRepository) CreateRole(context.Context, domain.Role) error { return nil }
func (r *memoryRepository) UpdateRole(context.Context, domain.Role) error { return nil }
func (r *memoryRepository) DeleteRole(context.Context, string, string) error {
	return nil
}

func TestProjectMembershipGrantAndRevoke(t *testing.T) {
	service := NewService(newMemoryRepository())
	ctx := context.Background()
	if err := service.GrantProject(ctx, "tenant-a", "project-a", "user-a"); err != nil {
		t.Fatal(err)
	}
	allowed, err := service.CanAccessProject(ctx, "tenant-a", "project-a", "user-a")
	if err != nil || !allowed {
		t.Fatalf("grant not effective: allowed=%v err=%v", allowed, err)
	}
	if err := service.RevokeProject(ctx, "tenant-a", "project-a", "user-a"); err != nil {
		t.Fatal(err)
	}
	allowed, err = service.CanAccessProject(ctx, "tenant-a", "project-a", "user-a")
	if err != nil || allowed {
		t.Fatalf("revoke not effective: allowed=%v err=%v", allowed, err)
	}
}

func TestProjectMembershipRejectsCrossTenantWrite(t *testing.T) {
	service := NewService(newMemoryRepository())
	err := service.GrantProject(context.Background(), "tenant-a", "project-b", "user-a")
	if err != ErrNotFound {
		t.Fatalf("cross-tenant grant error = %v, want not found", err)
	}
}

func TestProjectMembershipCrossTenantReadDenied(t *testing.T) {
	repo := newMemoryRepository()
	service := NewService(repo)
	ctx := context.Background()
	if err := service.GrantProject(ctx, "tenant-b", "project-b", "user-b"); err != nil {
		t.Fatal(err)
	}
	allowed, err := service.CanAccessProject(ctx, "tenant-a", "project-b", "user-a")
	if err != nil {
		t.Fatal(err)
	}
	if allowed {
		t.Fatal("cross-tenant read must be denied")
	}
	allowed, err = service.CanAccessProject(ctx, "tenant-a", "project-b", "user-b")
	if err != nil || allowed {
		t.Fatalf("foreign user must be denied: allowed=%v err=%v", allowed, err)
	}
}
