package agent

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/mcp"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
)

type accessStub bool

func (a accessStub) HasProjectAccess(context.Context, string, string, string) (bool, error) {
	return bool(a), nil
}

type repoStub struct {
	agent Agent
	bound []string
	saved bool
}

func (r *repoStub) Create(_ context.Context, a Agent) error { r.agent = a; return nil }
func (r *repoStub) BindMCPAssets(_ context.Context, _, _, _ string, assets []string) error {
	r.bound = append([]string{}, assets...)
	r.agent.MCPAssetIDs = append([]string{}, assets...)
	return nil
}
func (r *repoStub) Get(context.Context, string, string, string) (Agent, error) { return r.agent, nil }
func (r *repoStub) SaveConversation(context.Context, string, string, string, string, string, string, string, []Citation) (string, error) {
	r.saved = true
	return "conversation", nil
}

type retrieverStub struct{}

func (retrieverStub) Search(context.Context, string, string, string, string, string, int) ([]rag.Result, error) {
	return []rag.Result{{Content: "AiGate uses project-scoped knowledge.", Citation: rag.Citation{DocumentID: "doc-1", SpanStart: 5, SpanEnd: 42}}}, nil
}

type gatewayStub struct{ system, key string }

func (g *gatewayStub) Complete(_ context.Context, key, model, system string, m []Message) (string, string, error) {
	g.key, g.system = key, system
	return "Answer [document=doc-1 span=5:42]", "trace-1", nil
}

type mcpStub struct {
	projectGranted map[string]bool
	grants         []mcp.Grant
}

func (m *mcpStub) Grant(_ context.Context, g mcp.Grant) error {
	m.grants = append(m.grants, g)
	return nil
}
func (m *mcpStub) Authorized(_ context.Context, _, asset, _, agent string) (bool, error) {
	if agent != "" {
		return false, nil
	}
	if m.projectGranted == nil {
		return true, nil
	}
	return m.projectGranted[asset], nil
}

type auditStub struct{ events []audit.Event }

func (a *auditStub) Append(_ context.Context, e audit.Event) error {
	a.events = append(a.events, e)
	return nil
}

func TestCreateBindsKBMCPAndReservesSkills(t *testing.T) {
	repo := &repoStub{}
	m := &mcpStub{projectGranted: map[string]bool{"mcp": true}}
	svc := NewService(repo, accessStub(true), retrieverStub{}, &gatewayStub{}, m, &auditStub{})
	created, err := svc.Create(context.Background(), "t", "p", "u", Agent{Name: "assistant", Model: "model", KnowledgeBaseIDs: []string{"kb"}, MCPAssetIDs: []string{"mcp"}, SkillIDs: []string{"future-skill"}, SkillHook: json.RawMessage(`{"before":"reserved"}`)})
	if err != nil || created.ID == "" || len(m.grants) != 1 || m.grants[0].AgentID != created.ID || repo.agent.SkillIDs[0] != "future-skill" || len(repo.bound) != 1 {
		t.Fatalf("created=%+v grants=%+v bound=%v err=%v", created, m.grants, repo.bound, err)
	}
}

func TestCreateRejectsMCPWithoutProjectGrant(t *testing.T) {
	m := &mcpStub{projectGranted: map[string]bool{"mcp": false}}
	_, err := NewService(&repoStub{}, accessStub(true), retrieverStub{}, &gatewayStub{}, m, &auditStub{}).Create(context.Background(), "t", "p", "u", Agent{Name: "assistant", Model: "model", MCPAssetIDs: []string{"mcp"}})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("got %v", err)
	}
}

func TestChatDeniedBeforeRAGAndGateway(t *testing.T) {
	_, err := NewService(&repoStub{}, accessStub(false), retrieverStub{}, &gatewayStub{}, &mcpStub{}, &auditStub{}).Chat(context.Background(), "t", "other", "a", "u", "key", "q")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("got %v", err)
	}
}

func TestCitedRAGChatUsesGateway(t *testing.T) {
	repo := &repoStub{agent: Agent{ID: "a", Model: "public-model", KnowledgeBaseIDs: []string{"kb"}}}
	gateway := &gatewayStub{}
	aud := &auditStub{}
	result, err := NewService(repo, accessStub(true), retrieverStub{}, gateway, &mcpStub{}, aud).Chat(context.Background(), "t", "p", "a", "u", "employee-key", "What is AiGate?")
	if err != nil || result.Citations[0].DocumentID != "doc-1" || result.GatewayTraceID != "trace-1" || !strings.Contains(gateway.system, "project-scoped knowledge") || gateway.key != "employee-key" || !repo.saved || len(aud.events) != 1 {
		t.Fatalf("result=%+v system=%q err=%v", result, gateway.system, err)
	}
}
