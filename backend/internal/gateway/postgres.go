package gateway

import (
	"context"

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
	_, err = l.db.Pool().Exec(ctx, `INSERT INTO api_logs(id,trace_id,tenant_id,organization_id,user_id,api_key_id,model,input_tokens,output_tokens,total_tokens,cost_micros,estimated,blocked,status_code,error_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, id, e.TraceID, e.TenantID, e.OrganizationID, e.UserID, e.APIKeyID, e.Model, e.InputTokens, e.OutputTokens, e.TotalTokens, e.CostMicros, e.Estimated, e.Blocked, e.StatusCode, e.ErrorCode)
	return err
}

func (l *PostgresLogger) List(ctx context.Context, filter LogFilter) ([]LogRecord, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := l.db.Pool().Query(ctx, `
SELECT id,trace_id,tenant_id,organization_id,user_id,COALESCE(api_key_id,''),model,input_tokens,output_tokens,total_tokens,cost_micros,estimated,blocked,status_code,COALESCE(error_code,''),created_at
FROM api_logs
WHERE tenant_id=$1
  AND ($2='' OR user_id=$2)
  AND ($3::boolean IS NULL OR blocked=$3)
ORDER BY created_at DESC
LIMIT $4`, filter.TenantID, filter.UserID, filter.Blocked, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]LogRecord, 0)
	for rows.Next() {
		var item LogRecord
		if err := rows.Scan(&item.ID, &item.TraceID, &item.TenantID, &item.OrganizationID, &item.UserID, &item.APIKeyID, &item.Model, &item.InputTokens, &item.OutputTokens, &item.TotalTokens, &item.CostMicros, &item.Estimated, &item.Blocked, &item.StatusCode, &item.ErrorCode, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
