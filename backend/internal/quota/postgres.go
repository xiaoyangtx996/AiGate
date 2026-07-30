package quota

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) SetLimit(ctx context.Context, a Account) error {
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, a.TenantID); err != nil {
		return err
	}
	if a.Scope == Organization {
		var parent bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM quota_accounts WHERE tenant_id=$1 AND scope_type='tenant' AND scope_id=$1)`, a.TenantID).Scan(&parent); err != nil || !parent {
			if err != nil {
				return err
			}
			return ErrConservation
		}
	}
	if a.Scope == User {
		var parent bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users u JOIN quota_accounts q ON q.tenant_id=u.tenant_id AND q.scope_type='organization' AND q.scope_id=u.organization_id WHERE u.tenant_id=$1 AND u.id=$2)`, a.TenantID, a.ScopeID).Scan(&parent); err != nil || !parent {
			if err != nil {
				return err
			}
			return ErrConservation
		}
	}
	var valid bool
	switch a.Scope {
	case Tenant:
		err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM tenants WHERE id=$1 AND id=$2)`, a.TenantID, a.ScopeID).Scan(&valid)
	case Organization:
		err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM organizations WHERE tenant_id=$1 AND id=$2)`, a.TenantID, a.ScopeID).Scan(&valid)
	case User:
		err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE tenant_id=$1 AND id=$2)`, a.TenantID, a.ScopeID).Scan(&valid)
	default:
		return ErrConservation
	}
	if err != nil {
		return err
	}
	if !valid {
		return ErrConservation
	}
	_, err = tx.Exec(ctx, `INSERT INTO quota_accounts(tenant_id,scope_type,scope_id,limit_tokens) VALUES($1,$2,$3,$4)
		ON CONFLICT(tenant_id,scope_type,scope_id) DO UPDATE SET limit_tokens=EXCLUDED.limit_tokens,updated_at=now()`, a.TenantID, a.Scope, a.ScopeID, a.LimitTokens)
	if err != nil {
		return err
	}
	var violations int
	err = tx.QueryRow(ctx, `WITH tenant_limit AS (
		SELECT limit_tokens FROM quota_accounts WHERE tenant_id=$1 AND scope_type='tenant' AND scope_id=$1
	), org_bad AS (
		SELECT 1 FROM quota_accounts o,tenant_limit t WHERE o.tenant_id=$1 AND o.scope_type='organization'
		GROUP BY t.limit_tokens HAVING sum(o.limit_tokens)>t.limit_tokens
	), self_bad AS (
		SELECT 1 FROM quota_accounts WHERE tenant_id=$1 AND limit_tokens < used_tokens + reserved_tokens
	), user_bad AS (
		SELECT 1 FROM quota_accounts u JOIN users usr ON usr.tenant_id=u.tenant_id AND usr.id=u.scope_id
		JOIN quota_accounts o ON o.tenant_id=usr.tenant_id AND o.scope_type='organization' AND o.scope_id=usr.organization_id
		WHERE u.tenant_id=$1 AND u.scope_type='user' GROUP BY o.scope_id,o.limit_tokens HAVING sum(u.limit_tokens)>o.limit_tokens
	) SELECT (SELECT count(*) FROM self_bad)+(SELECT count(*) FROM org_bad)+(SELECT count(*) FROM user_bad)`, a.TenantID).Scan(&violations)
	if err != nil {
		return err
	}
	if violations > 0 {
		return ErrConservation
	}
	return tx.Commit(ctx)
}

func (p *Postgres) Reserve(ctx context.Context, tenantID, organizationID, userID string, tokens int64) (Reservation, error) {
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return Reservation{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, tenantID); err != nil {
		return Reservation{}, err
	}
	rows, err := tx.Query(ctx, `SELECT scope_type,limit_tokens,used_tokens,reserved_tokens FROM quota_accounts WHERE tenant_id=$1 AND ((scope_type='tenant' AND scope_id=$1) OR (scope_type='organization' AND scope_id=$2) OR (scope_type='user' AND scope_id=$3)) FOR UPDATE`, tenantID, organizationID, userID)
	if err != nil {
		return Reservation{}, err
	}
	defer rows.Close()
	scopes := []Scope{}
	for rows.Next() {
		var scope Scope
		var limit, used, reserved int64
		if err = rows.Scan(&scope, &limit, &used, &reserved); err != nil {
			return Reservation{}, err
		}
		if used+reserved+tokens > limit {
			return Reservation{}, ErrExhausted
		}
		scopes = append(scopes, scope)
	}
	if err = rows.Err(); err != nil {
		return Reservation{}, err
	}
	// Pilot policy: tenant + organization + user quotas must all exist; missing any = deny (no unlimited bypass).
	if len(scopes) != 3 {
		return Reservation{}, ErrNotConfigured
	}
	id, err := domain.NewID()
	if err != nil {
		return Reservation{}, err
	}
	tag, err := tx.Exec(ctx, `INSERT INTO quota_reservations(id,tenant_id,organization_id,user_id,reserved_tokens) SELECT $1,$2,o.id,u.id,$5 FROM organizations o JOIN users u ON u.tenant_id=o.tenant_id AND u.organization_id=o.id WHERE o.tenant_id=$2 AND o.id=$3 AND u.id=$4`, id, tenantID, organizationID, userID, tokens)
	if err != nil {
		return Reservation{}, err
	}
	if tag.RowsAffected() != 1 {
		return Reservation{}, ErrExhausted
	}
	for _, scope := range scopes {
		scopeID := tenantID
		if scope == Organization {
			scopeID = organizationID
		} else if scope == User {
			scopeID = userID
		}
		if _, err = tx.Exec(ctx, `UPDATE quota_accounts SET reserved_tokens=reserved_tokens+$4,updated_at=now() WHERE tenant_id=$1 AND scope_type=$2 AND scope_id=$3`, tenantID, scope, scopeID, tokens); err != nil {
			return Reservation{}, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return Reservation{}, err
	}
	return Reservation{ID: id, TenantID: tenantID, OrganizationID: organizationID, UserID: userID, Tokens: tokens}, nil
}

func (p *Postgres) Settle(ctx context.Context, r Reservation, actual int64) error {
	return p.finish(ctx, r, actual, true)
}
func (p *Postgres) Cancel(ctx context.Context, r Reservation) error {
	return p.finish(ctx, r, 0, false)
}
func (p *Postgres) finish(ctx context.Context, r Reservation, actual int64, settle bool) error {
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, r.TenantID); err != nil {
		return err
	}
	var reserved int64
	err = tx.QueryRow(ctx, `DELETE FROM quota_reservations WHERE id=$1 AND tenant_id=$2 RETURNING reserved_tokens`, r.ID, r.TenantID).Scan(&reserved)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if !settle {
		_, err = tx.Exec(ctx, `UPDATE quota_accounts SET reserved_tokens=GREATEST(0,reserved_tokens-$4),updated_at=now() WHERE tenant_id=$1 AND ((scope_type='tenant' AND scope_id=$1) OR (scope_type='organization' AND scope_id=$2) OR (scope_type='user' AND scope_id=$3))`, r.TenantID, r.OrganizationID, r.UserID, reserved)
		if err != nil {
			return err
		}
		return tx.Commit(ctx)
	}
	if actual < 0 {
		actual = 0
	}
	rows, err := tx.Query(ctx, `SELECT scope_type,scope_id,limit_tokens,used_tokens,reserved_tokens FROM quota_accounts WHERE tenant_id=$1 AND ((scope_type='tenant' AND scope_id=$1) OR (scope_type='organization' AND scope_id=$2) OR (scope_type='user' AND scope_id=$3)) FOR UPDATE`, r.TenantID, r.OrganizationID, r.UserID)
	if err != nil {
		return err
	}
	type accountSnap struct {
		scope                          Scope
		scopeID                        string
		limit, used, reservedOnAccount int64
	}
	var accounts []accountSnap
	for rows.Next() {
		var item accountSnap
		if err = rows.Scan(&item.scope, &item.scopeID, &item.limit, &item.used, &item.reservedOnAccount); err != nil {
			rows.Close()
			return err
		}
		accounts = append(accounts, item)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return err
	}
	charge := actual
	for _, item := range accounts {
		if c := chargeAgainstLimit(actual, item.limit, item.used, item.reservedOnAccount, reserved); c < charge {
			charge = c
		}
	}
	for _, item := range accounts {
		if _, err = tx.Exec(ctx, `UPDATE quota_accounts SET reserved_tokens=GREATEST(0,reserved_tokens-$1),used_tokens=used_tokens+$2,updated_at=now() WHERE tenant_id=$3 AND scope_type=$4 AND scope_id=$5`, reserved, charge, r.TenantID, item.scope, item.scopeID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
