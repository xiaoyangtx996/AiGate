package usage

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

func TestPostgresSummaryScopesTenantAndAttributesAgentProject(t *testing.T) {
	dsn := os.Getenv("AIGATE_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("AIGATE_TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	store, err := db.Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	ids := make([]string, 17)
	for i := range ids {
		ids[i], err = domain.NewID()
		if err != nil {
			t.Fatal(err)
		}
	}
	tenant, org, user, project, agentID, conversation, message, logID := ids[0], ids[1], ids[2], ids[3], ids[4], ids[5], ids[6], ids[7]
	otherTenant, otherOrg, otherUser, otherLog, directLog := ids[8], ids[9], ids[10], ids[11], ids[12]
	assetID, mcpLogID := ids[13], ids[14]
	callerOrg, callerUser := ids[15], ids[16]
	trace := "usage-" + logID
	day := time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)
	batch := &pgx.Batch{}
	batch.Queue(`INSERT INTO tenants(id,name) VALUES($1,$2),($3,$4)`, tenant, "usage-"+tenant, otherTenant, "usage-"+otherTenant)
	batch.Queue(`INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'Dept A'),($3,$4,'Dept B')`, org, tenant, otherOrg, otherTenant)
	batch.Queue(`INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'Caller Dept')`, callerOrg, tenant)
	batch.Queue(`INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'A','x'),($5,$6,$7,$8,'B','x')`, user, tenant, org, "a-"+user+"@test", otherUser, otherTenant, otherOrg, "b-"+otherUser+"@test")
	batch.Queue(`INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'Caller','x')`, callerUser, tenant, callerOrg, "caller-"+callerUser+"@test")
	batch.Queue(`INSERT INTO projects(id,tenant_id,organization_id,name) VALUES($1,$2,$3,'Project A')`, project, tenant, org)
	batch.Queue(`INSERT INTO project_agents(id,tenant_id,project_id,name,model,created_by) VALUES($1,$2,$3,'Agent','model',$4)`, agentID, tenant, project, user)
	batch.Queue(`INSERT INTO agent_conversations(id,tenant_id,project_id,agent_id,user_id) VALUES($1,$2,$3,$4,$5)`, conversation, tenant, project, agentID, user)
	batch.Queue(`INSERT INTO agent_messages(id,tenant_id,conversation_id,role,content,gateway_trace_id) VALUES($1,$2,$3,'assistant','answer',$4)`, message, tenant, conversation, trace)
	batch.Queue(`INSERT INTO api_logs(id,trace_id,tenant_id,organization_id,user_id,model,input_tokens,output_tokens,total_tokens,cost_micros,estimated,status_code,created_at) VALUES($1,$2,$3,$4,$5,'model',10,5,15,25,false,200,$6),($7,$8,$9,$10,$11,'model',99,99,198,999,false,200,$6)`, logID, trace, tenant, org, user, day, otherLog, "other-"+otherLog, otherTenant, otherOrg, otherUser)
	batch.Queue(`INSERT INTO api_logs(id,trace_id,tenant_id,organization_id,user_id,project_id,model,input_tokens,output_tokens,total_tokens,cost_micros,estimated,status_code,created_at) VALUES($1,$2,$3,$4,$5,$6,'model',1,2,3,4,false,200,$7)`, directLog, "direct-"+directLog, tenant, callerOrg, callerUser, project, day)
	batch.Queue(`INSERT INTO mcp_assets(id,tenant_id,name,source,encrypted_endpoint) VALUES($1,$2,$3,'private','encrypted')`, assetID, tenant, "asset-"+assetID)
	batch.Queue(`INSERT INTO mcp_usage_logs(id,tenant_id,trace_id,mcp_asset_id,project_id,user_id,tool_name,input_tokens,output_tokens,cost_micros,status_code,duration_ms,created_at) VALUES($1,$2,$3,$4,$5,$6,'search',3,4,8,200,1,$7)`, mcpLogID, tenant, "mcp-"+mcpLogID, assetID, project, user, day)
	batch.Queue(`INSERT INTO quota_accounts(tenant_id,scope_type,scope_id,limit_tokens) VALUES($1,'tenant',$1,1000),($1,'organization',$2,500),($1,'organization',$3,500),($1,'user',$4,100),($1,'user',$5,100)`, tenant, org, callerOrg, user, callerUser)
	results := store.Pool().SendBatch(ctx, batch)
	for range 14 {
		if _, err = results.Exec(); err != nil {
			break
		}
	}
	_ = results.Close()
	if err != nil {
		t.Fatal(err)
	}
	defer store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id IN($1,$2)`, tenant, otherTenant)
	result, err := NewPostgres(store).Summary(ctx, Filter{TenantID: tenant, ProjectID: project, From: day.Add(-time.Hour), To: day.Add(time.Hour)})
	if err != nil || len(result.Daily) != 1 {
		t.Fatalf("result=%+v err=%v", result, err)
	}
	got := result.Daily[0]
	if got.ProjectID != project || got.OrganizationID != org || got.Calls != 3 || got.LLMCalls != 2 || got.MCPCalls != 1 || got.InputTokens != 14 || got.OutputTokens != 11 || got.CostMicros != 37 || got.LLMCostMicros != 29 || got.MCPCostMicros != 8 {
		t.Fatalf("daily=%+v", got)
	}
	filtered, err := NewPostgres(store).Summary(ctx, Filter{TenantID: tenant, OrganizationID: org, From: day.Add(-time.Hour), To: day.Add(time.Hour)})
	if err != nil || len(filtered.Daily) != 1 || len(filtered.Quotas) != 3 {
		t.Fatalf("organization filtered=%+v err=%v", filtered, err)
	}
	for _, quota := range filtered.Quotas {
		if quota.ScopeID == callerOrg || quota.ScopeID == callerUser {
			t.Fatalf("unrelated quota leaked: %+v", quota)
		}
	}
}
