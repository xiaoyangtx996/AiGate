package bot

import (
	"context"

	"github.com/xiaoyangtx996/AiGate/internal/db"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) UserOrganization(ctx context.Context, tenant, user string) (string, error) {
	var id string
	err := p.db.Pool().QueryRow(ctx, `SELECT organization_id FROM users WHERE tenant_id=$1 AND id=$2 AND active`, tenant, user).Scan(&id)
	return id, err
}

func (p *Postgres) Summarize(ctx context.Context, tenant, organization string) (Usage, error) {
	var u Usage
	err := p.db.Pool().QueryRow(ctx, `SELECT count(*),COALESCE(sum(input_tokens),0),COALESCE(sum(output_tokens),0),COALESCE(sum(cost_micros),0) FROM api_logs WHERE tenant_id=$1 AND ($2='' OR organization_id=$2::uuid)`, tenant, organization).Scan(&u.LLMCalls, &u.InputTokens, &u.OutputTokens, &u.CostMicros)
	if err != nil {
		return Usage{}, err
	}
	err = p.db.Pool().QueryRow(ctx, `SELECT count(*) FROM mcp_usage_logs ml JOIN users u ON u.tenant_id=ml.tenant_id AND u.id=ml.user_id WHERE ml.tenant_id=$1 AND ($2='' OR u.organization_id=$2::uuid)`, tenant, organization).Scan(&u.MCPCalls)
	return u, err
}
