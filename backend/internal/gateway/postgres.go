package gateway

import (
	"context"
	"encoding/json"

	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type PostgresLogger struct{ db *db.Store }

func NewPostgresLogger(store *db.Store) *PostgresLogger { return &PostgresLogger{db: store} }

func (l *PostgresLogger) Write(ctx context.Context, e Log) error {
	id, err := domain.NewID()
	if err != nil {
		return err
	}
	tx, err := l.db.Pool().Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var projectID any
	if e.ProjectID != "" {
		projectID = e.ProjectID
	}
	if _, err = tx.Exec(ctx, `INSERT INTO api_logs(id,trace_id,tenant_id,organization_id,user_id,api_key_id,project_id,model,input_tokens,output_tokens,total_tokens,cost_micros,estimated,blocked,status_code,error_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`, id, e.TraceID, e.TenantID, e.OrganizationID, e.UserID, e.APIKeyID, projectID, e.Model, e.InputTokens, e.OutputTokens, e.TotalTokens, e.CostMicros, e.Estimated, e.Blocked, e.StatusCode, e.ErrorCode); err != nil {
		return err
	}
	auditID, err := domain.NewID()
	if err != nil {
		return err
	}
	eventType, outcome := "gateway.call", "success"
	if e.Blocked {
		eventType, outcome = "quota.blocked", "blocked"
	} else if e.ErrorCode != "" || e.StatusCode >= 400 {
		outcome = "failure"
	}
	metadata, err := json.Marshal(map[string]any{"api_key_id": e.APIKeyID, "project_id": e.ProjectID, "cost_micros": e.CostMicros, "error_code": e.ErrorCode, "estimated": e.Estimated, "input_tokens": e.InputTokens, "output_tokens": e.OutputTokens, "status_code": e.StatusCode, "total_tokens": e.TotalTokens})
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO audit_events(id,tenant_id,trace_id,event_type,actor_user_id,resource_type,resource_id,outcome,metadata) VALUES($1,$2,$3,$4,$5,'model',$6,$7,$8)`, auditID, e.TenantID, e.TraceID, eventType, e.UserID, e.Model, outcome, metadata); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (l *PostgresLogger) List(ctx context.Context, filter LogFilter) ([]LogRecord, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 1000 {
		limit = 50
	}
	var userFilter any
	if filter.UserID != "" {
		userFilter = filter.UserID
	}
	rows, err := l.db.Pool().Query(ctx, `
SELECT l.id,l.trace_id,l.tenant_id,l.organization_id,l.user_id,COALESCE(l.api_key_id::text,''),COALESCE(l.project_id::text,''),COALESCE(p.name,''),l.model,l.input_tokens,l.output_tokens,l.total_tokens,l.cost_micros,l.estimated,l.blocked,l.status_code,COALESCE(l.error_code,''),l.created_at
FROM api_logs l LEFT JOIN projects p ON p.tenant_id=l.tenant_id AND p.id=l.project_id
WHERE l.tenant_id=$1
  AND ($2::uuid IS NULL OR l.user_id=$2)
  AND ($3::boolean IS NULL OR l.blocked=$3)
  AND ($4::timestamptz IS NULL OR l.created_at >= $4)
  AND ($5::timestamptz IS NULL OR l.created_at < $5)
ORDER BY l.created_at DESC
LIMIT $6`, filter.TenantID, userFilter, filter.Blocked, filter.From, filter.To, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]LogRecord, 0)
	for rows.Next() {
		var item LogRecord
		if err := rows.Scan(&item.ID, &item.TraceID, &item.TenantID, &item.OrganizationID, &item.UserID, &item.APIKeyID, &item.ProjectID, &item.ProjectName, &item.Model, &item.InputTokens, &item.OutputTokens, &item.TotalTokens, &item.CostMicros, &item.Estimated, &item.Blocked, &item.StatusCode, &item.ErrorCode, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
