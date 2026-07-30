package apikey

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) Create(ctx context.Context, key Key, hash string) error {
	tag, err := p.db.Pool().Exec(ctx, `INSERT INTO api_keys(id,tenant_id,organization_id,user_id,name,key_prefix,key_hash,allowed_cidrs)
		SELECT $1,$2,u.organization_id,u.id,$5,$6,$7,$8 FROM users u
		WHERE u.tenant_id=$2 AND u.id=$4 AND u.organization_id=$3 AND u.active=true`, key.ID, key.TenantID, key.OrganizationID, key.UserID, key.Name, key.Prefix, hash, key.AllowedCIDRs)
	if err == nil && tag.RowsAffected() != 1 {
		return ErrInvalidKey
	}
	return err
}
func (p *Postgres) FindByHash(ctx context.Context, hash string) (Principal, error) {
	var out Principal
	// Always use the user's current organization_id so department moves stay consistent with quota/logs.
	err := p.db.Pool().QueryRow(ctx, `SELECT k.id,k.tenant_id,u.organization_id,k.user_id,k.allowed_cidrs
		FROM api_keys k JOIN users u ON u.tenant_id=k.tenant_id AND u.id=k.user_id
		WHERE k.key_hash=$1 AND k.active=true AND u.active=true`, hash).
		Scan(&out.KeyID, &out.TenantID, &out.OrganizationID, &out.UserID, &out.AllowedCIDRs)
	if errors.Is(err, pgx.ErrNoRows) {
		return Principal{}, ErrInvalidKey
	}
	return out, err
}
func (p *Postgres) Touch(ctx context.Context, id string) error {
	_, err := p.db.Pool().Exec(ctx, `UPDATE api_keys SET last_used_at=now(),updated_at=now() WHERE id=$1`, id)
	return err
}
func (p *Postgres) List(ctx context.Context, tenantID string) ([]Key, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT id,tenant_id,organization_id,user_id,name,key_prefix,allowed_cidrs,active FROM api_keys WHERE tenant_id=$1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Key{}
	for rows.Next() {
		var k Key
		if err := rows.Scan(&k.ID, &k.TenantID, &k.OrganizationID, &k.UserID, &k.Name, &k.Prefix, &k.AllowedCIDRs, &k.Active); err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}
func (p *Postgres) Revoke(ctx context.Context, tenantID, id string) error {
	tag, err := p.db.Pool().Exec(ctx, `UPDATE api_keys SET active=false,updated_at=now() WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	if err == nil && tag.RowsAffected() != 1 {
		return ErrNotFound
	}
	return err
}
