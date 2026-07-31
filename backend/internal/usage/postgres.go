package usage

import (
	"context"

	"github.com/xiaoyangtx996/AiGate/internal/db"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) Summary(ctx context.Context, filter Filter) (Summary, error) {
	rows, err := p.db.Pool().Query(ctx, `
		WITH trace_projects AS (
			SELECT DISTINCT ON (m.gateway_trace_id) m.gateway_trace_id, c.project_id
			FROM agent_messages m
			JOIN api_logs al ON al.tenant_id=m.tenant_id AND al.trace_id=m.gateway_trace_id AND al.project_id IS NULL
			  AND al.created_at >= $2 AND al.created_at < $3
			JOIN agent_conversations c ON c.tenant_id=m.tenant_id AND c.id=m.conversation_id
			WHERE m.tenant_id=$1 AND m.gateway_trace_id <> ''
			ORDER BY m.gateway_trace_id, m.created_at DESC
		), combined AS (
			SELECT l.created_at,COALESCE(lp.organization_id,l.organization_id) organization_id,COALESCE(l.project_id,tp.project_id) project_id,
			       l.input_tokens,l.output_tokens,l.cost_micros,l.estimated,
			       1::bigint llm_calls,0::bigint mcp_calls,l.cost_micros llm_cost_micros,0::bigint mcp_cost_micros
			FROM api_logs l
			LEFT JOIN trace_projects tp ON tp.gateway_trace_id=l.trace_id
			LEFT JOIN projects lp ON lp.tenant_id=l.tenant_id AND lp.id=COALESCE(l.project_id,tp.project_id)
			WHERE l.tenant_id=$1 AND l.created_at >= $2 AND l.created_at < $3
			  AND ($4='' OR COALESCE(lp.organization_id,l.organization_id)=$4::uuid)
			UNION ALL
			SELECT ml.created_at,p.organization_id,ml.project_id,
			       COALESCE(ml.input_tokens,0),COALESCE(ml.output_tokens,0),COALESCE(ml.cost_micros,0),ml.cost_micros IS NULL,
			       0,1,0,COALESCE(ml.cost_micros,0)
			FROM mcp_usage_logs ml
			JOIN projects p ON p.tenant_id=ml.tenant_id AND p.id=ml.project_id
			WHERE ml.tenant_id=$1 AND ml.created_at >= $2 AND ml.created_at < $3
			  AND ($4='' OR p.organization_id=$4::uuid)
		)
		SELECT to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD'),r.organization_id::text,COALESCE(o.name,''),
		       COALESCE(r.project_id::text,''),COALESCE(p.name,''),count(*),
		       COALESCE(sum(r.input_tokens),0),COALESCE(sum(r.output_tokens),0),COALESCE(sum(r.cost_micros),0),
		       count(*) FILTER (WHERE r.estimated),COALESCE(sum(r.llm_cost_micros),0),COALESCE(sum(r.mcp_cost_micros),0),
		       COALESCE(sum(r.llm_calls),0),COALESCE(sum(r.mcp_calls),0)
		FROM combined r
		LEFT JOIN organizations o ON o.tenant_id=$1 AND o.id=r.organization_id
		LEFT JOIN projects p ON p.tenant_id=$1 AND p.id=r.project_id
		WHERE ($5='' OR r.project_id=$5::uuid)
		GROUP BY 1,2,3,4,5 ORDER BY 1,3,5`, filter.TenantID, filter.From, filter.To, filter.OrganizationID, filter.ProjectID)
	if err != nil {
		return Summary{}, err
	}
	defer rows.Close()
	out := Summary{Daily: []Daily{}, Quotas: []QuotaUtilization{}}
	for rows.Next() {
		var d Daily
		if err := rows.Scan(&d.Day, &d.OrganizationID, &d.OrganizationName, &d.ProjectID, &d.ProjectName, &d.Calls, &d.InputTokens, &d.OutputTokens, &d.CostMicros, &d.EstimatedCalls, &d.LLMCostMicros, &d.MCPCostMicros, &d.LLMCalls, &d.MCPCalls); err != nil {
			return Summary{}, err
		}
		out.Daily = append(out.Daily, d)
	}
	if err := rows.Err(); err != nil {
		return Summary{}, err
	}
	quotaRows, err := p.db.Pool().Query(ctx, `
		SELECT q.scope_type,q.scope_id::text,q.limit_tokens,q.used_tokens,q.reserved_tokens,
		       CASE WHEN q.limit_tokens=0 THEN 0 ELSE ((q.used_tokens+q.reserved_tokens)::float8/q.limit_tokens::float8)*100 END
		FROM quota_accounts q
		LEFT JOIN users u ON q.scope_type='user' AND u.tenant_id=q.tenant_id AND u.id=q.scope_id
		WHERE q.tenant_id=$1 AND ($2='' OR q.scope_type='tenant'
		  OR (q.scope_type='organization' AND q.scope_id=$2::uuid)
		  OR (q.scope_type='user' AND u.organization_id=$2::uuid))
		ORDER BY q.scope_type,q.scope_id`, filter.TenantID, filter.OrganizationID)
	if err != nil {
		return Summary{}, err
	}
	defer quotaRows.Close()
	for quotaRows.Next() {
		var q QuotaUtilization
		if err := quotaRows.Scan(&q.ScopeType, &q.ScopeID, &q.LimitTokens, &q.UsedTokens, &q.ReservedTokens, &q.Percent); err != nil {
			return Summary{}, err
		}
		out.Quotas = append(out.Quotas, q)
	}
	return out, quotaRows.Err()
}
