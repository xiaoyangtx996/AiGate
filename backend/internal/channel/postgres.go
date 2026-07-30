package channel

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/billing"
	"github.com/xiaoyangtx996/AiGate/internal/db"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) Create(ctx context.Context, c Config) error {
	_, err := p.db.Pool().Exec(ctx, `INSERT INTO channels(id,tenant_id,name,base_url,encrypted_credential,active) VALUES($1,$2,$3,$4,$5,$6)`,
		c.ID, c.TenantID, c.Name, c.BaseURL, c.EncryptedCredential, c.Active)
	return err
}

func (p *Postgres) List(ctx context.Context, tenantID string) ([]Config, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT id,tenant_id,name,base_url,active FROM channels WHERE tenant_id=$1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Config
	for rows.Next() {
		var c Config
		if err := rows.Scan(&c.ID, &c.TenantID, &c.Name, &c.BaseURL, &c.Active); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (p *Postgres) Get(ctx context.Context, tenantID, id string) (Config, error) {
	var c Config
	err := p.db.Pool().QueryRow(ctx, `SELECT id,tenant_id,name,base_url,encrypted_credential,active FROM channels WHERE tenant_id=$1 AND id=$2`, tenantID, id).
		Scan(&c.ID, &c.TenantID, &c.Name, &c.BaseURL, &c.EncryptedCredential, &c.Active)
	if errors.Is(err, pgx.ErrNoRows) {
		return Config{}, ErrNotFound
	}
	return c, err
}

func (p *Postgres) Update(ctx context.Context, c Config) error {
	tag, err := p.db.Pool().Exec(ctx, `UPDATE channels SET name=$3, base_url=$4, encrypted_credential=$5, active=$6, updated_at=now() WHERE tenant_id=$1 AND id=$2`,
		c.TenantID, c.ID, c.Name, c.BaseURL, c.EncryptedCredential, c.Active)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *Postgres) DeactivateOthers(ctx context.Context, tenantID, keepID string) error {
	if keepID == "" {
		_, err := p.db.Pool().Exec(ctx, `UPDATE channels SET active=false, updated_at=now() WHERE tenant_id=$1 AND active=true`, tenantID)
		return err
	}
	_, err := p.db.Pool().Exec(ctx, `UPDATE channels SET active=false, updated_at=now() WHERE tenant_id=$1 AND active=true AND id<>$2`, tenantID, keepID)
	return err
}

func (p *Postgres) SetPrice(ctx context.Context, tenantID, model, upstream string, inputPrice, outputPrice int64) error {
	_, err := p.db.Pool().Exec(ctx, `INSERT INTO model_prices(tenant_id,model,upstream_model,input_micros_per_million,output_micros_per_million) VALUES($1,$2,$3,$4,$5)
		ON CONFLICT(tenant_id,model) DO UPDATE SET upstream_model=EXCLUDED.upstream_model,input_micros_per_million=EXCLUDED.input_micros_per_million,output_micros_per_million=EXCLUDED.output_micros_per_million,updated_at=now()`,
		tenantID, model, upstream, inputPrice, outputPrice)
	return err
}

func (p *Postgres) Resolve(ctx context.Context, tenantID, model string) (Config, string, *billing.Price, error) {
	var c Config
	var upstream string
	var in, out int64
	err := p.db.Pool().QueryRow(ctx, `SELECT c.id,c.tenant_id,c.name,c.base_url,c.encrypted_credential,c.active,m.upstream_model,m.input_micros_per_million,m.output_micros_per_million
		FROM channels c JOIN model_prices m ON m.tenant_id=c.tenant_id AND m.model=$2
		WHERE c.active=true AND c.tenant_id=$1 ORDER BY c.created_at LIMIT 1`, tenantID, model).
		Scan(&c.ID, &c.TenantID, &c.Name, &c.BaseURL, &c.EncryptedCredential, &c.Active, &upstream, &in, &out)
	if errors.Is(err, pgx.ErrNoRows) {
		return Config{}, "", nil, ErrNoRoute
	}
	if err != nil {
		return Config{}, "", nil, err
	}
	return c, upstream, &billing.Price{InputMicrosPerMillion: in, OutputMicrosPerMillion: out}, nil
}
