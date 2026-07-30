package alerts

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) GetPolicy(ctx context.Context, tenantID string) (Policy, error) {
	var policy Policy
	err := p.db.Pool().QueryRow(ctx, `SELECT tenant_id,thresholds,webhook_url,cooldown_seconds,enabled,created_at,updated_at FROM alert_policies WHERE tenant_id=$1`, tenantID).Scan(&policy.TenantID, &policy.Thresholds, &policy.WebhookURL, &policy.CooldownSeconds, &policy.Enabled, &policy.CreatedAt, &policy.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Policy{TenantID: tenantID, Thresholds: append([]int16(nil), DefaultThresholds...), CooldownSeconds: 3600, Enabled: true}, nil
	}
	return policy, err
}
func (p *Postgres) SetPolicy(ctx context.Context, policy Policy) error {
	_, err := p.db.Pool().Exec(ctx, `INSERT INTO alert_policies(tenant_id,thresholds,webhook_url,cooldown_seconds,enabled) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id) DO UPDATE SET thresholds=EXCLUDED.thresholds,webhook_url=EXCLUDED.webhook_url,cooldown_seconds=EXCLUDED.cooldown_seconds,enabled=EXCLUDED.enabled,updated_at=now()`, policy.TenantID, policy.Thresholds, policy.WebhookURL, policy.CooldownSeconds, policy.Enabled)
	return err
}
func (p *Postgres) Evaluate(ctx context.Context, tenantID string) error {
	policy, err := p.GetPolicy(ctx, tenantID)
	if err != nil || !policy.Enabled {
		return err
	}
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	rows, err := tx.Query(ctx, `SELECT scope_type,scope_id,used_tokens,limit_tokens FROM quota_accounts WHERE tenant_id=$1 AND limit_tokens>0`, tenantID)
	if err != nil {
		return err
	}
	type account struct {
		scope, id   string
		used, limit int64
	}
	accounts := []account{}
	for rows.Next() {
		var a account
		if err = rows.Scan(&a.scope, &a.id, &a.used, &a.limit); err != nil {
			rows.Close()
			return err
		}
		accounts = append(accounts, a)
	}
	if err = rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()
	bucket := time.Now().Unix() / int64(policy.CooldownSeconds)
	for _, a := range accounts {
		percent := float64(a.used) * 100 / float64(a.limit)
		for _, threshold := range policy.Thresholds {
			if percent < float64(threshold) {
				continue
			}
			alertID, err := domain.NewID()
			if err != nil {
				return err
			}
			status := "not_configured"
			if policy.WebhookURL != "" {
				status = "pending"
			}
			var inserted string
			err = tx.QueryRow(ctx, `INSERT INTO quota_alerts(id,tenant_id,scope_type,scope_id,threshold,usage_percent,used_tokens,limit_tokens,cooldown_bucket,delivery_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING RETURNING id`, alertID, tenantID, a.scope, a.id, threshold, percent, a.used, a.limit, bucket, status).Scan(&inserted)
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			if err != nil {
				return err
			}
			if policy.WebhookURL != "" {
				jobID, err := domain.NewID()
				if err != nil {
					return err
				}
				payload, _ := json.Marshal(map[string]string{"alert_id": inserted})
				if _, err = tx.Exec(ctx, `INSERT INTO jobs(id,tenant_id,job_type,payload) VALUES($1,$2,'alert.webhook',$3)`, jobID, tenantID, payload); err != nil {
					return err
				}
			}
		}
	}
	return tx.Commit(ctx)
}
func (p *Postgres) List(ctx context.Context, tenantID string, limit int) ([]Alert, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT id,tenant_id,scope_type,scope_id,threshold,usage_percent::float8,used_tokens,limit_tokens,delivery_status,last_error,created_at FROM quota_alerts WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2`, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []Alert{}
	for rows.Next() {
		var a Alert
		if err := rows.Scan(&a.ID, &a.TenantID, &a.ScopeType, &a.ScopeID, &a.Threshold, &a.UsagePercent, &a.UsedTokens, &a.LimitTokens, &a.DeliveryStatus, &a.LastError, &a.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, a)
	}
	return result, rows.Err()
}
func (p *Postgres) Delivery(ctx context.Context, tenantID, alertID string) (Delivery, error) {
	var d Delivery
	err := p.db.Pool().QueryRow(ctx, `SELECT a.id,a.tenant_id,a.scope_type,a.scope_id,a.threshold,a.usage_percent::float8,a.used_tokens,a.limit_tokens,a.delivery_status,a.last_error,a.created_at,p.webhook_url FROM quota_alerts a JOIN alert_policies p ON p.tenant_id=a.tenant_id WHERE a.tenant_id=$1 AND a.id=$2 AND p.enabled AND p.webhook_url<>''`, tenantID, alertID).Scan(&d.Alert.ID, &d.Alert.TenantID, &d.Alert.ScopeType, &d.Alert.ScopeID, &d.Alert.Threshold, &d.Alert.UsagePercent, &d.Alert.UsedTokens, &d.Alert.LimitTokens, &d.Alert.DeliveryStatus, &d.Alert.LastError, &d.Alert.CreatedAt, &d.WebhookURL)
	return d, err
}
func (p *Postgres) MarkDelivered(ctx context.Context, tenantID, alertID string) error {
	_, err := p.db.Pool().Exec(ctx, `UPDATE quota_alerts SET delivery_status='delivered',delivered_at=now(),last_error='' WHERE tenant_id=$1 AND id=$2`, tenantID, alertID)
	return err
}
func (p *Postgres) MarkFailed(ctx context.Context, tenantID, alertID, message string) error {
	if len(message) > 2000 {
		message = message[:2000]
	}
	_, err := p.db.Pool().Exec(ctx, `UPDATE quota_alerts SET delivery_status='failed',last_error=$3 WHERE tenant_id=$1 AND id=$2`, tenantID, alertID, message)
	return err
}
