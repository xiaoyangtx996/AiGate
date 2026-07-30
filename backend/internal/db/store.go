package db

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/rbac"
)

type Store struct{ pool *pgxpool.Pool }

func Open(ctx context.Context, dsn string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() { s.pool.Close() }

func (s *Store) FindLoginUser(ctx context.Context, tenantID, email string) (domain.User, []domain.Role, error) {
	user, err := scanUser(s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, organization_id, email, display_name, password_hash, active, created_at, updated_at
		FROM users WHERE tenant_id = $1 AND email = $2`, tenantID, email))
	if err != nil {
		return domain.User{}, nil, mapError(err)
	}
	rows, err := s.pool.Query(ctx, `
		SELECT r.id, r.tenant_id, r.code, r.name, r.description, r.created_at, r.updated_at
		FROM roles r JOIN user_roles ur ON ur.tenant_id = r.tenant_id AND ur.role_id = r.id
		WHERE ur.tenant_id = $1 AND ur.user_id = $2 ORDER BY r.code`, tenantID, user.ID)
	if err != nil {
		return domain.User{}, nil, err
	}
	defer rows.Close()
	roles, err := collectRoles(rows)
	return user, roles, err
}

func (s *Store) ListUsers(ctx context.Context, tenantID string) ([]domain.User, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, organization_id, email, display_name, password_hash, active, created_at, updated_at
		FROM users WHERE tenant_id = $1 ORDER BY email`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := make([]domain.User, 0)
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) GetUser(ctx context.Context, tenantID, id string) (domain.User, error) {
	user, err := scanUser(s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, organization_id, email, display_name, password_hash, active, created_at, updated_at
		FROM users WHERE tenant_id = $1 AND id = $2`, tenantID, id))
	return user, mapError(err)
}

func (s *Store) CreateUser(ctx context.Context, user domain.User, roleIDs []string) error {
	return s.writeUser(ctx, user, roleIDs, true)
}

func (s *Store) UpdateUser(ctx context.Context, user domain.User, roleIDs []string) error {
	return s.writeUser(ctx, user, roleIDs, false)
}

func (s *Store) writeUser(ctx context.Context, user domain.User, roleIDs []string, create bool) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if create {
		_, err = tx.Exec(ctx, `
			INSERT INTO users (id, tenant_id, organization_id, email, display_name, password_hash, active)
			SELECT $1, $2, o.id, $4, $5, $6, $7 FROM organizations o
			WHERE o.tenant_id = $2 AND o.id = $3`, user.ID, user.TenantID, user.OrganizationID, user.Email, user.DisplayName, user.PasswordHash, user.Active)
	} else {
		var tag pgconnCommandTag
		tag, err = execTag(tx.Exec(ctx, `
			UPDATE users u SET organization_id = o.id, email = $4, display_name = $5,
			password_hash = $6, active = $7, updated_at = now()
			FROM organizations o
			WHERE u.tenant_id = $1 AND u.id = $2 AND o.tenant_id = $1 AND o.id = $3`, user.TenantID, user.ID, user.OrganizationID, user.Email, user.DisplayName, user.PasswordHash, user.Active))
		if err == nil && tag.RowsAffected() == 0 {
			err = rbac.ErrNotFound
		}
	}
	if err != nil {
		return mapError(err)
	}
	if create {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE tenant_id = $1 AND id = $2)`, user.TenantID, user.ID).Scan(&exists); err != nil || !exists {
			if err != nil {
				return err
			}
			return rbac.ErrNotFound
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM user_roles WHERE tenant_id = $1 AND user_id = $2`, user.TenantID, user.ID); err != nil {
		return err
	}
	for _, roleID := range roleIDs {
		tag, err := tx.Exec(ctx, `
			INSERT INTO user_roles (tenant_id, user_id, role_id)
			SELECT $1, u.id, r.id FROM users u JOIN roles r ON r.tenant_id = u.tenant_id
			WHERE u.tenant_id = $1 AND u.id = $2 AND r.id = $3`, user.TenantID, user.ID, roleID)
		if err != nil {
			return mapError(err)
		}
		if tag.RowsAffected() != 1 {
			return rbac.ErrNotFound
		}
	}
	return tx.Commit(ctx)
}

func (s *Store) DeleteUser(ctx context.Context, tenantID, id string) error {
	return requireOne(s.pool.Exec(ctx, `DELETE FROM users WHERE tenant_id = $1 AND id = $2`, tenantID, id))
}

func (s *Store) ListRoles(ctx context.Context, tenantID string) ([]domain.Role, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, code, name, description, created_at, updated_at
		FROM roles WHERE tenant_id = $1 ORDER BY code`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectRoles(rows)
}

func (s *Store) GetRole(ctx context.Context, tenantID, id string) (domain.Role, error) {
	role, err := scanRole(s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, code, name, description, created_at, updated_at
		FROM roles WHERE tenant_id = $1 AND id = $2`, tenantID, id))
	return role, mapError(err)
}

func (s *Store) CreateRole(ctx context.Context, role domain.Role) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO roles (id, tenant_id, code, name, description) VALUES ($1, $2, $3, $4, $5)`,
		role.ID, role.TenantID, role.Code, role.Name, role.Description)
	return mapError(err)
}

func (s *Store) UpdateRole(ctx context.Context, role domain.Role) error {
	return requireOne(s.pool.Exec(ctx, `
		UPDATE roles SET code = $3, name = $4, description = $5, updated_at = now()
		WHERE tenant_id = $1 AND id = $2 AND system_role = false`, role.TenantID, role.ID, role.Code, role.Name, role.Description))
}

func (s *Store) DeleteRole(ctx context.Context, tenantID, id string) error {
	return requireOne(s.pool.Exec(ctx, `DELETE FROM roles WHERE tenant_id = $1 AND id = $2 AND system_role = false`, tenantID, id))
}

func (s *Store) GrantProject(ctx context.Context, tenantID, projectID, userID string) error {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO project_memberships (tenant_id, project_id, user_id)
		SELECT $1, p.id, u.id FROM projects p JOIN users u ON u.tenant_id = p.tenant_id
		WHERE p.tenant_id = $1 AND p.id = $2 AND u.id = $3
		ON CONFLICT DO NOTHING`, tenantID, projectID, userID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		var exists bool
		if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM project_memberships WHERE tenant_id = $1 AND project_id = $2 AND user_id = $3)`, tenantID, projectID, userID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return rbac.ErrNotFound
		}
	}
	return nil
}

func (s *Store) RevokeProject(ctx context.Context, tenantID, projectID, userID string) error {
	return requireOne(s.pool.Exec(ctx, `
		DELETE FROM project_memberships WHERE tenant_id = $1 AND project_id = $2 AND user_id = $3`, tenantID, projectID, userID))
}

func (s *Store) HasProjectAccess(ctx context.Context, tenantID, projectID, userID string) (bool, error) {
	var allowed bool
	err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM project_memberships pm
			JOIN projects p ON p.tenant_id = pm.tenant_id AND p.id = pm.project_id
			JOIN users u ON u.tenant_id = pm.tenant_id AND u.id = pm.user_id
			WHERE pm.tenant_id = $1 AND pm.project_id = $2 AND pm.user_id = $3
		)`, tenantID, projectID, userID).Scan(&allowed)
	return allowed, err
}

func (s *Store) ListOrganizations(ctx context.Context, tenantID string) ([]domain.Organization, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, name, created_at, updated_at FROM organizations
		WHERE tenant_id = $1 ORDER BY name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	organizations := make([]domain.Organization, 0)
	for rows.Next() {
		organization, err := scanOrganization(rows)
		if err != nil {
			return nil, err
		}
		organizations = append(organizations, organization)
	}
	return organizations, rows.Err()
}

func (s *Store) GetOrganization(ctx context.Context, tenantID, id string) (domain.Organization, error) {
	organization, err := scanOrganization(s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, name, created_at, updated_at FROM organizations
		WHERE tenant_id = $1 AND id = $2`, tenantID, id))
	return organization, mapError(err)
}

func (s *Store) CreateOrganization(ctx context.Context, organization domain.Organization) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO organizations (id, tenant_id, name) VALUES ($1, $2, $3)`, organization.ID, organization.TenantID, organization.Name)
	return mapError(err)
}

func (s *Store) UpdateOrganization(ctx context.Context, organization domain.Organization) error {
	return requireOne(s.pool.Exec(ctx, `
		UPDATE organizations SET name = $3, updated_at = now() WHERE tenant_id = $1 AND id = $2`,
		organization.TenantID, organization.ID, organization.Name))
}

func (s *Store) DeleteOrganization(ctx context.Context, tenantID, id string) error {
	return requireOne(s.pool.Exec(ctx, `DELETE FROM organizations WHERE tenant_id = $1 AND id = $2`, tenantID, id))
}

func (s *Store) AttachUser(ctx context.Context, tenantID, organizationID, userID string) error {
	return requireOne(s.pool.Exec(ctx, `
		UPDATE users u SET organization_id = o.id, updated_at = now()
		FROM organizations o
		WHERE u.tenant_id = $1 AND u.id = $2 AND o.tenant_id = $1 AND o.id = $3`,
		tenantID, userID, organizationID))
}

type scanner interface{ Scan(...any) error }

func scanUser(row scanner) (domain.User, error) {
	var user domain.User
	err := row.Scan(&user.ID, &user.TenantID, &user.OrganizationID, &user.Email, &user.DisplayName, &user.PasswordHash, &user.Active, &user.CreatedAt, &user.UpdatedAt)
	return user, err
}

func scanRole(row scanner) (domain.Role, error) {
	var role domain.Role
	err := row.Scan(&role.ID, &role.TenantID, &role.Code, &role.Name, &role.Description, &role.CreatedAt, &role.UpdatedAt)
	return role, err
}

func scanOrganization(row scanner) (domain.Organization, error) {
	var organization domain.Organization
	err := row.Scan(&organization.ID, &organization.TenantID, &organization.Name, &organization.CreatedAt, &organization.UpdatedAt)
	return organization, err
}

func collectRoles(rows pgx.Rows) ([]domain.Role, error) {
	roles := make([]domain.Role, 0)
	for rows.Next() {
		role, err := scanRole(rows)
		if err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

type pgconnCommandTag interface{ RowsAffected() int64 }

func execTag(tag pgconnCommandTag, err error) (pgconnCommandTag, error) { return tag, err }

func requireOne(tag pgconnCommandTag, err error) error {
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return rbac.ErrNotFound
	}
	return nil
}

func mapError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return rbac.ErrNotFound
	}
	return err
}
