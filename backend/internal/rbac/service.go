package rbac

import (
	"context"
	"errors"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrNotFound = errors.New("not found")
)

type Repository interface {
	ListUsers(context.Context, string) ([]domain.User, error)
	GetUser(context.Context, string, string) (domain.User, error)
	CreateUser(context.Context, domain.User, []string) error
	UpdateUser(context.Context, domain.User, []string) error
	DeleteUser(context.Context, string, string) error
	ListRoles(context.Context, string) ([]domain.Role, error)
	GetRole(context.Context, string, string) (domain.Role, error)
	CreateRole(context.Context, domain.Role) error
	UpdateRole(context.Context, domain.Role) error
	DeleteRole(context.Context, string, string) error
	GrantProject(context.Context, string, string, string) error
	RevokeProject(context.Context, string, string, string) error
	HasProjectAccess(context.Context, string, string, string) (bool, error)
}

type Service struct{ repo Repository }

type UserInput struct {
	ID             string
	OrganizationID string
	Email          string
	DisplayName    string
	Password       string
	Active         bool
	RoleIDs        []string
}

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) ListUsers(ctx context.Context, tenantID string) ([]domain.User, error) {
	return s.repo.ListUsers(ctx, tenantID)
}

func (s *Service) CreateUser(ctx context.Context, tenantID string, input UserInput) (domain.User, error) {
	if tenantID == "" || input.OrganizationID == "" || strings.TrimSpace(input.Email) == "" || input.Password == "" {
		return domain.User{}, errors.New("tenant, organization, email and password are required")
	}
	id, err := domain.NewID()
	if err != nil {
		return domain.User{}, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.User{}, err
	}
	user := domain.User{ID: id, TenantID: tenantID, OrganizationID: input.OrganizationID, Email: strings.ToLower(strings.TrimSpace(input.Email)), DisplayName: strings.TrimSpace(input.DisplayName), PasswordHash: string(hash), Active: input.Active}
	if err := s.repo.CreateUser(ctx, user, input.RoleIDs); err != nil {
		return domain.User{}, err
	}
	return s.repo.GetUser(ctx, tenantID, id)
}

func (s *Service) UpdateUser(ctx context.Context, tenantID string, input UserInput) (domain.User, error) {
	current, err := s.repo.GetUser(ctx, tenantID, input.ID)
	if err != nil {
		return domain.User{}, err
	}
	current.OrganizationID = input.OrganizationID
	current.Email = strings.ToLower(strings.TrimSpace(input.Email))
	current.DisplayName = strings.TrimSpace(input.DisplayName)
	current.Active = input.Active
	if input.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			return domain.User{}, err
		}
		current.PasswordHash = string(hash)
	}
	if err := s.repo.UpdateUser(ctx, current, input.RoleIDs); err != nil {
		return domain.User{}, err
	}
	return s.repo.GetUser(ctx, tenantID, input.ID)
}

func (s *Service) DeleteUser(ctx context.Context, tenantID, id string) error {
	return s.repo.DeleteUser(ctx, tenantID, id)
}

func (s *Service) ListRoles(ctx context.Context, tenantID string) ([]domain.Role, error) {
	return s.repo.ListRoles(ctx, tenantID)
}

func (s *Service) CreateRole(ctx context.Context, tenantID, code, name, description string) (domain.Role, error) {
	id, err := domain.NewID()
	if err != nil {
		return domain.Role{}, err
	}
	role := domain.Role{ID: id, TenantID: tenantID, Code: strings.TrimSpace(code), Name: strings.TrimSpace(name), Description: strings.TrimSpace(description)}
	if role.Code == "" || role.Name == "" {
		return domain.Role{}, errors.New("role code and name are required")
	}
	if err := s.repo.CreateRole(ctx, role); err != nil {
		return domain.Role{}, err
	}
	return s.repo.GetRole(ctx, tenantID, id)
}

func (s *Service) UpdateRole(ctx context.Context, role domain.Role) (domain.Role, error) {
	if err := s.repo.UpdateRole(ctx, role); err != nil {
		return domain.Role{}, err
	}
	return s.repo.GetRole(ctx, role.TenantID, role.ID)
}

func (s *Service) DeleteRole(ctx context.Context, tenantID, id string) error {
	return s.repo.DeleteRole(ctx, tenantID, id)
}

func (s *Service) GrantProject(ctx context.Context, tenantID, projectID, userID string) error {
	return s.repo.GrantProject(ctx, tenantID, projectID, userID)
}

func (s *Service) RevokeProject(ctx context.Context, tenantID, projectID, userID string) error {
	return s.repo.RevokeProject(ctx, tenantID, projectID, userID)
}

func (s *Service) CanAccessProject(ctx context.Context, tenantID, projectID, userID string) (bool, error) {
	return s.repo.HasProjectAccess(ctx, tenantID, projectID, userID)
}
