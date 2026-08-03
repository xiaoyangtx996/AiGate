package agent

import (
	"context"
	"encoding/json"
	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/mcp"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
	"os"
	"testing"
)

type pgGateway struct{}

func (pgGateway) Complete(context.Context, string, string, string, string, []Message) (string, string, error) {
	return "cited answer [document=doc span=0:10]", "agent-trace", nil
}

type pgRetriever struct{}

func (pgRetriever) Search(context.Context, string, string, string, string, string, int) ([]rag.Result, error) {
	return []rag.Result{{Content: "project evidence", Citation: rag.Citation{DocumentID: "doc", SpanStart: 0, SpanEnd: 10}}}, nil
}

type pgMCP struct{}

func (pgMCP) Grant(context.Context, mcp.Grant) error { return nil }
func (pgMCP) Authorized(context.Context, string, string, string, string) (bool, error) {
	return true, nil
}
func (pgMCP) Invoke(context.Context, mcp.Invocation) (mcp.InvokeResult, error) {
	return mcp.InvokeResult{StatusCode: 200, Body: []byte(`{"ok":true}`), TraceID: "mcp"}, nil
}
func TestPostgresCitedConversationPersistence(t *testing.T) {
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
	id := func() string { x, _ := domain.NewID(); return x }
	tenant, org, user, project := id(), id(), id(), id()
	_, err = store.Pool().Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,$2)`, tenant, "agent-"+tenant)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Pool().Exec(ctx, `DELETE FROM tenants WHERE id=$1`, tenant)
	_, err = store.Pool().Exec(ctx, `INSERT INTO organizations(id,tenant_id,name) VALUES($1,$2,'dept')`, org, tenant)
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.Pool().Exec(ctx, `INSERT INTO users(id,tenant_id,organization_id,email,display_name,password_hash) VALUES($1,$2,$3,$4,'u','x')`, user, tenant, org, user+"@test")
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.Pool().Exec(ctx, `INSERT INTO projects(id,tenant_id,organization_id,name) VALUES($1,$2,$3,$4)`, project, tenant, org, "p-"+project)
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.Pool().Exec(ctx, `INSERT INTO project_memberships(tenant_id,project_id,user_id) VALUES($1,$2,$3)`, tenant, project, user)
	if err != nil {
		t.Fatal(err)
	}
	aud := audit.NewService(audit.NewPostgres(store))
	svc := NewService(NewPostgres(store), store, pgRetriever{}, pgGateway{}, pgMCP{}, aud)
	created, err := svc.Create(ctx, tenant, project, user, Agent{Name: "a", Model: "m", SkillIDs: []string{"reserved"}, SkillHook: json.RawMessage(`{"hook":"future"}`)})
	if err != nil {
		t.Fatal(err)
	}
	result, err := svc.Chat(ctx, tenant, project, created.ID, user, "employee-key", "question")
	if err != nil {
		t.Fatal(err)
	}
	var citations []byte
	var trace string
	err = store.Pool().QueryRow(ctx, `SELECT citations,gateway_trace_id FROM agent_messages WHERE tenant_id=$1 AND conversation_id=$2 AND role='assistant'`, tenant, result.ConversationID).Scan(&citations, &trace)
	if err != nil || trace != "agent-trace" || !json.Valid(citations) {
		t.Fatalf("trace=%s citations=%s err=%v", trace, citations, err)
	}
	var auditCount int
	_ = store.Pool().QueryRow(ctx, `SELECT count(*) FROM audit_events WHERE tenant_id=$1 AND trace_id='agent-trace' AND event_type='agent.chat'`, tenant).Scan(&auditCount)
	if auditCount != 1 {
		t.Fatalf("audit=%d", auditCount)
	}
}
