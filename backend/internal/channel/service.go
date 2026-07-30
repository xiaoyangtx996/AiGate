package channel

import (
	"context"
	"errors"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/billing"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

var (
	ErrNoRoute  = errors.New("no active channel for model")
	ErrNotFound = errors.New("channel not found")
)

type Config struct {
	ID                  string `json:"id"`
	TenantID            string `json:"tenant_id"`
	Name                string `json:"name"`
	BaseURL             string `json:"base_url"`
	EncryptedCredential string `json:"-"`
	Active              bool   `json:"active"`
}

type Route struct {
	BaseURL, Credential, UpstreamModel string
	Price                              *billing.Price
}

type UpdateInput struct {
	Name       *string
	BaseURL    *string
	Credential *string // nil = keep; empty string rejected
	Active     *bool
}

type Repository interface {
	Create(context.Context, Config) error
	List(context.Context, string) ([]Config, error)
	Get(context.Context, string, string) (Config, error)
	Update(context.Context, Config) error
	DeactivateOthers(context.Context, string, string) error
	SetPrice(context.Context, string, string, string, int64, int64) error
	Resolve(context.Context, string, string) (Config, string, *billing.Price, error)
}

type Service struct {
	repo   Repository
	cipher *Cipher
}

func NewService(repo Repository, cipher *Cipher) *Service {
	return &Service{repo: repo, cipher: cipher}
}

func (s *Service) SetPrice(ctx context.Context, tenantID, model, upstream string, inputPrice, outputPrice int64) error {
	return s.repo.SetPrice(ctx, tenantID, model, upstream, inputPrice, outputPrice)
}

func (s *Service) List(ctx context.Context, tenantID string) ([]Config, error) {
	return s.repo.List(ctx, tenantID)
}

func (s *Service) Create(ctx context.Context, tenantID, name, baseURL, credential string) (Config, error) {
	name, baseURL = strings.TrimSpace(name), strings.TrimSpace(baseURL)
	if tenantID == "" || name == "" || baseURL == "" || strings.TrimSpace(credential) == "" {
		return Config{}, errors.New("tenant, name, base_url and credential are required")
	}
	id, err := domain.NewID()
	if err != nil {
		return Config{}, err
	}
	encrypted, err := s.cipher.Encrypt(credential)
	if err != nil {
		return Config{}, err
	}
	c := Config{ID: id, TenantID: tenantID, Name: name, BaseURL: baseURL, EncryptedCredential: encrypted, Active: true}
	if err = s.repo.DeactivateOthers(ctx, tenantID, ""); err != nil {
		return Config{}, err
	}
	if err = s.repo.Create(ctx, c); err != nil {
		return Config{}, err
	}
	return Config{ID: c.ID, TenantID: c.TenantID, Name: c.Name, BaseURL: c.BaseURL, Active: c.Active}, nil
}

func (s *Service) Update(ctx context.Context, tenantID, id string, input UpdateInput) (Config, error) {
	current, err := s.repo.Get(ctx, tenantID, id)
	if err != nil {
		return Config{}, err
	}
	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)
		if name == "" {
			return Config{}, errors.New("name cannot be empty")
		}
		current.Name = name
	}
	if input.BaseURL != nil {
		baseURL := strings.TrimSpace(*input.BaseURL)
		if baseURL == "" {
			return Config{}, errors.New("base_url cannot be empty")
		}
		current.BaseURL = baseURL
	}
	if input.Credential != nil {
		credential := strings.TrimSpace(*input.Credential)
		if credential == "" {
			return Config{}, errors.New("credential cannot be empty")
		}
		encrypted, err := s.cipher.Encrypt(credential)
		if err != nil {
			return Config{}, err
		}
		current.EncryptedCredential = encrypted
	}
	if input.Active != nil {
		current.Active = *input.Active
		if current.Active {
			if err = s.repo.DeactivateOthers(ctx, tenantID, id); err != nil {
				return Config{}, err
			}
		}
	}
	if err = s.repo.Update(ctx, current); err != nil {
		return Config{}, err
	}
	return Config{ID: current.ID, TenantID: current.TenantID, Name: current.Name, BaseURL: current.BaseURL, Active: current.Active}, nil
}

func (s *Service) Resolve(ctx context.Context, tenantID, model string) (Route, error) {
	c, upstream, price, err := s.repo.Resolve(ctx, tenantID, model)
	if err != nil {
		return Route{}, err
	}
	credential, err := s.cipher.Decrypt(c.EncryptedCredential)
	if err != nil {
		return Route{}, err
	}
	return Route{BaseURL: c.BaseURL, Credential: credential, UpstreamModel: upstream, Price: price}, nil
}
