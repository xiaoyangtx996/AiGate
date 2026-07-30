package apikey

import (
	"context"
	"errors"
	"net"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

var (
	ErrInvalidKey = errors.New("invalid API key")
	ErrNotFound   = errors.New("api key not found")
)

type Key struct {
	ID             string   `json:"id"`
	TenantID       string   `json:"tenant_id"`
	OrganizationID string   `json:"organization_id"`
	UserID         string   `json:"user_id"`
	Name           string   `json:"name"`
	Prefix         string   `json:"prefix"`
	AllowedCIDRs   []string `json:"allowed_cidrs"`
	Active         bool     `json:"active"`
}

type Repository interface {
	Create(context.Context, Key, string) error
	FindByHash(context.Context, string) (Principal, error)
	Touch(context.Context, string) error
	List(context.Context, string) ([]Key, error)
	Revoke(context.Context, string, string) error
}

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) Issue(ctx context.Context, tenantID, organizationID, userID, name string, allowed []string) (Key, string, error) {
	for _, cidr := range allowed {
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			return Key{}, "", err
		}
	}
	id, err := domain.NewID()
	if err != nil {
		return Key{}, "", err
	}
	plain, prefix, hash, err := Generate()
	if err != nil {
		return Key{}, "", err
	}
	key := Key{ID: id, TenantID: tenantID, OrganizationID: organizationID, UserID: userID, Name: name, Prefix: prefix, AllowedCIDRs: allowed, Active: true}
	if err := s.repo.Create(ctx, key, hash); err != nil {
		return Key{}, "", err
	}
	return key, plain, nil
}

func (s *Service) Authenticate(ctx context.Context, plain string, ip net.IP) (Principal, error) {
	if plain == "" {
		return Principal{}, ErrInvalidKey
	}
	p, err := s.repo.FindByHash(ctx, Hash(plain))
	if err != nil {
		return Principal{}, ErrInvalidKey
	}
	if err := CheckIP(ip, p.AllowedCIDRs); err != nil {
		return Principal{}, err
	}
	if err := s.repo.Touch(ctx, p.KeyID); err != nil {
		return Principal{}, ErrInvalidKey
	}
	return p, nil
}
func (s *Service) List(ctx context.Context, tenantID string) ([]Key, error) {
	return s.repo.List(ctx, tenantID)
}
func (s *Service) Revoke(ctx context.Context, tenantID, id string) error {
	return s.repo.Revoke(ctx, tenantID, id)
}
