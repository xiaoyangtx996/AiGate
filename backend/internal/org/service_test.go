package org

import (
	"context"
	"errors"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

var errNotFound = errors.New("not found")

type memoryRepository struct {
	organizations map[string]domain.Organization
	users         map[string]string
}

func newMemoryRepository() *memoryRepository {
	return &memoryRepository{
		organizations: map[string]domain.Organization{
			"org-a": {ID: "org-a", TenantID: "tenant-a", Name: "A"},
			"org-b": {ID: "org-b", TenantID: "tenant-b", Name: "B"},
		},
		users: map[string]string{"user-a": "tenant-a", "user-b": "tenant-b"},
	}
}

func (r *memoryRepository) ListOrganizations(_ context.Context, tenantID string) ([]domain.Organization, error) {
	result := make([]domain.Organization, 0)
	for _, item := range r.organizations {
		if item.TenantID == tenantID {
			result = append(result, item)
		}
	}
	return result, nil
}
func (r *memoryRepository) GetOrganization(_ context.Context, tenantID, id string) (domain.Organization, error) {
	item, ok := r.organizations[id]
	if !ok || item.TenantID != tenantID {
		return domain.Organization{}, errNotFound
	}
	return item, nil
}
func (r *memoryRepository) CreateOrganization(_ context.Context, item domain.Organization) error {
	r.organizations[item.ID] = item
	return nil
}
func (r *memoryRepository) UpdateOrganization(_ context.Context, item domain.Organization) error {
	current, ok := r.organizations[item.ID]
	if !ok || current.TenantID != item.TenantID {
		return errNotFound
	}
	r.organizations[item.ID] = item
	return nil
}
func (r *memoryRepository) DeleteOrganization(_ context.Context, tenantID, id string) error {
	item, ok := r.organizations[id]
	if !ok || item.TenantID != tenantID {
		return errNotFound
	}
	delete(r.organizations, id)
	return nil
}
func (r *memoryRepository) AttachUser(_ context.Context, tenantID, organizationID, userID string) error {
	organization, ok := r.organizations[organizationID]
	if !ok || organization.TenantID != tenantID || r.users[userID] != tenantID {
		return errNotFound
	}
	return nil
}

func TestOrganizationListsOnlyRequestedTenant(t *testing.T) {
	service := NewService(newMemoryRepository())
	items, err := service.List(context.Background(), "tenant-a")
	if err != nil || len(items) != 1 || items[0].TenantID != "tenant-a" {
		t.Fatalf("unexpected organizations: %+v, err=%v", items, err)
	}
}

func TestAttachUserRejectsCrossTenantOrganization(t *testing.T) {
	service := NewService(newMemoryRepository())
	if err := service.AttachUser(context.Background(), "tenant-a", "org-b", "user-a"); !errors.Is(err, errNotFound) {
		t.Fatalf("cross-tenant attach error = %v", err)
	}
	if err := service.AttachUser(context.Background(), "tenant-a", "org-a", "user-b"); !errors.Is(err, errNotFound) {
		t.Fatalf("cross-tenant user attach error = %v", err)
	}
}
