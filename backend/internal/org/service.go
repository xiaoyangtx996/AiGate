package org

import (
	"context"
	"errors"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Repository interface {
	ListOrganizations(context.Context, string) ([]domain.Organization, error)
	GetOrganization(context.Context, string, string) (domain.Organization, error)
	CreateOrganization(context.Context, domain.Organization) error
	UpdateOrganization(context.Context, domain.Organization) error
	DeleteOrganization(context.Context, string, string) error
	AttachUser(context.Context, string, string, string) error
}

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) List(ctx context.Context, tenantID string) ([]domain.Organization, error) {
	return s.repo.ListOrganizations(ctx, tenantID)
}

func (s *Service) Create(ctx context.Context, tenantID, name string) (domain.Organization, error) {
	if tenantID == "" || strings.TrimSpace(name) == "" {
		return domain.Organization{}, errors.New("tenant and organization name are required")
	}
	id, err := domain.NewID()
	if err != nil {
		return domain.Organization{}, err
	}
	organization := domain.Organization{ID: id, TenantID: tenantID, Name: strings.TrimSpace(name)}
	if err := s.repo.CreateOrganization(ctx, organization); err != nil {
		return domain.Organization{}, err
	}
	return s.repo.GetOrganization(ctx, tenantID, id)
}

func (s *Service) Update(ctx context.Context, tenantID, id, name string) (domain.Organization, error) {
	organization := domain.Organization{ID: id, TenantID: tenantID, Name: strings.TrimSpace(name)}
	if err := s.repo.UpdateOrganization(ctx, organization); err != nil {
		return domain.Organization{}, err
	}
	return s.repo.GetOrganization(ctx, tenantID, id)
}

func (s *Service) Delete(ctx context.Context, tenantID, id string) error {
	return s.repo.DeleteOrganization(ctx, tenantID, id)
}

func (s *Service) AttachUser(ctx context.Context, tenantID, organizationID, userID string) error {
	return s.repo.AttachUser(ctx, tenantID, organizationID, userID)
}
