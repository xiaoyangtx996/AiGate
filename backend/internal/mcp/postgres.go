package mcp

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }
func (p *Postgres) CreateAsset(ctx context.Context, a Asset) error {
	var market any
	if a.MarketplaceID != "" {
		market = a.MarketplaceID
	}
	_, err := p.db.Pool().Exec(ctx, `INSERT INTO mcp_assets(id,tenant_id,name,source,marketplace_id,encrypted_endpoint,encrypted_credential,version,health_status,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, a.ID, a.TenantID, a.Name, a.Source, market, a.EncryptedEndpoint, a.EncryptedCredential, a.Version, a.HealthStatus, a.Active)
	return err
}
func (p *Postgres) ListAssets(ctx context.Context, tenant string) ([]Asset, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT id,tenant_id,name,source,COALESCE(marketplace_id,''),version,health_status,consecutive_failures,active FROM mcp_assets WHERE tenant_id=$1 ORDER BY name,id`, tenant)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Asset{}
	for rows.Next() {
		var a Asset
		if err := rows.Scan(&a.ID, &a.TenantID, &a.Name, &a.Source, &a.MarketplaceID, &a.Version, &a.HealthStatus, &a.ConsecutiveFailures, &a.Active); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, rows.Err()
}
func (p *Postgres) GetAsset(ctx context.Context, tenant, id string) (Asset, error) {
	var a Asset
	err := p.db.Pool().QueryRow(ctx, `SELECT id,tenant_id,name,source,COALESCE(marketplace_id,''),version,health_status,consecutive_failures,active,encrypted_endpoint,encrypted_credential FROM mcp_assets WHERE tenant_id=$1 AND id=$2 AND active`, tenant, id).Scan(&a.ID, &a.TenantID, &a.Name, &a.Source, &a.MarketplaceID, &a.Version, &a.HealthStatus, &a.ConsecutiveFailures, &a.Active, &a.EncryptedEndpoint, &a.EncryptedCredential)
	if errors.Is(err, pgx.ErrNoRows) {
		err = ErrNotFound
	}
	return a, err
}
func (p *Postgres) ListMarketplace(ctx context.Context) ([]MarketplaceEntry, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT id,name,description,version FROM mcp_marketplace_entries WHERE active ORDER BY name,id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []MarketplaceEntry{}
	for rows.Next() {
		var e MarketplaceEntry
		if err := rows.Scan(&e.ID, &e.Name, &e.Description, &e.Version); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	return items, rows.Err()
}
func (p *Postgres) GetMarketplace(ctx context.Context, id string) (MarketplaceEntry, error) {
	var e MarketplaceEntry
	err := p.db.Pool().QueryRow(ctx, `SELECT id,name,description,endpoint_template,version FROM mcp_marketplace_entries WHERE id=$1 AND active`, id).Scan(&e.ID, &e.Name, &e.Description, &e.EndpointTemplate, &e.Version)
	if errors.Is(err, pgx.ErrNoRows) {
		err = ErrNotFound
	}
	return e, err
}
func (p *Postgres) Grant(ctx context.Context, g Grant) error {
	tag, err := p.db.Pool().Exec(ctx, `INSERT INTO mcp_grants(tenant_id,mcp_asset_id,project_id,agent_id,granted_by) SELECT $1,a.id,p.id,$4,u.id FROM mcp_assets a JOIN projects p ON p.tenant_id=a.tenant_id JOIN users u ON u.tenant_id=a.tenant_id WHERE a.tenant_id=$1 AND a.id=$2 AND a.active AND p.id=$3 AND u.id=$5 ON CONFLICT DO NOTHING`, g.TenantID, g.AssetID, g.ProjectID, g.AgentID, g.GrantedBy)
	if err == nil && tag.RowsAffected() == 0 {
		var exists bool
		err = p.db.Pool().QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM mcp_grants WHERE tenant_id=$1 AND mcp_asset_id=$2 AND project_id=$3 AND agent_id=$4)`, g.TenantID, g.AssetID, g.ProjectID, g.AgentID).Scan(&exists)
		if err == nil && !exists {
			err = ErrNotFound
		}
	}
	return err
}
func (p *Postgres) Authorized(ctx context.Context, tenant, asset, project, agent string) (bool, error) {
	var ok bool
	err := p.db.Pool().QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM mcp_grants g JOIN mcp_assets a ON a.tenant_id=g.tenant_id AND a.id=g.mcp_asset_id WHERE g.tenant_id=$1 AND g.mcp_asset_id=$2 AND g.project_id=$3 AND g.agent_id=$4 AND a.active)`, tenant, asset, project, agent).Scan(&ok)
	return ok, err
}
func (p *Postgres) WriteUsage(ctx context.Context, u Usage) error {
	id, err := domain.NewID()
	if err != nil {
		return err
	}
	_, err = p.db.Pool().Exec(ctx, `INSERT INTO mcp_usage_logs(id,tenant_id,trace_id,mcp_asset_id,project_id,agent_id,user_id,tool_name,input_tokens,output_tokens,cost_micros,status_code,duration_ms) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, id, u.TenantID, u.TraceID, u.AssetID, u.ProjectID, u.AgentID, u.UserID, u.ToolName, u.InputTokens, u.OutputTokens, u.CostMicros, u.StatusCode, u.DurationMS)
	return err
}
func (p *Postgres) RecordHealth(ctx context.Context, tenant, asset string, healthy bool, version, message string) (bool, bool, error) {
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return false, false, err
	}
	defer tx.Rollback(ctx)
	var failures int
	var old string
	err = tx.QueryRow(ctx, `SELECT consecutive_failures,health_status FROM mcp_assets WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, tenant, asset).Scan(&failures, &old)
	if err != nil {
		return false, false, err
	}
	status := "healthy"
	if healthy {
		failures = 0
	} else {
		failures++
		status = "unknown"
		if failures >= 3 {
			status = "unhealthy"
		}
	}
	_, err = tx.Exec(ctx, `UPDATE mcp_assets SET health_status=$3,consecutive_failures=$4,last_checked_at=now(),version=CASE WHEN $5='' THEN version ELSE $5 END,updated_at=now() WHERE tenant_id=$1 AND id=$2`, tenant, asset, status, failures, version)
	if err != nil {
		return false, false, err
	}
	alerted := status == "unhealthy" && old != "unhealthy"
	if alerted {
		id, err := domain.NewID()
		if err != nil {
			return false, false, err
		}
		_, err = tx.Exec(ctx, `INSERT INTO mcp_health_alerts(id,tenant_id,mcp_asset_id,consecutive_failures,message) VALUES($1,$2,$3,$4,$5)`, id, tenant, asset, failures, message)
		if err != nil {
			return false, false, err
		}
	}
	// Retry only while still accumulating toward the unhealthy threshold.
	retry := !healthy && status != "unhealthy"
	return alerted, retry, tx.Commit(ctx)
}
