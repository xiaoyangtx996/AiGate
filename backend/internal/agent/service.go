package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/mcp"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
)

var (
	ErrForbidden = errors.New("project agent access denied")
	ErrNotFound  = errors.New("project agent not found")
)

type Agent struct {
	ID               string          `json:"id"`
	TenantID         string          `json:"tenant_id"`
	ProjectID        string          `json:"project_id"`
	Name             string          `json:"name"`
	Model            string          `json:"model"`
	SystemPrompt     string          `json:"system_prompt"`
	KnowledgeBaseIDs []string        `json:"knowledge_base_ids"`
	MCPAssetIDs      []string        `json:"mcp_asset_ids"`
	SkillIDs         []string        `json:"skill_ids,omitempty"`
	SkillHook        json.RawMessage `json:"skill_hook,omitempty"`
	Active           bool            `json:"active"`
	CreatedBy        string          `json:"created_by"`
}
type Citation = rag.Citation
type ChatResult struct {
	ConversationID string     `json:"conversation_id"`
	Answer         string     `json:"answer"`
	Citations      []Citation `json:"citations"`
	GatewayTraceID string     `json:"gateway_trace_id"`
	MCPCalls       int        `json:"mcp_calls,omitempty"`
}
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type Access interface {
	HasProjectAccess(context.Context, string, string, string) (bool, error)
}
type Retriever interface {
	Search(context.Context, string, string, string, string, string, int) ([]rag.Result, error)
}
type Gateway interface {
	Complete(context.Context, string, string, string, string, []Message) (string, string, error)
}
type MCPGranter interface {
	Grant(context.Context, mcp.Grant) error
	Authorized(context.Context, string, string, string, string) (bool, error)
	Invoke(context.Context, mcp.Invocation) (mcp.InvokeResult, error)
}
type Auditor interface {
	Append(context.Context, audit.Event) error
}
type Repository interface {
	Create(context.Context, Agent) error
	BindMCPAssets(context.Context, string, string, string, []string) error
	Get(context.Context, string, string, string) (Agent, error)
	List(context.Context, string, string) ([]Agent, error)
	SaveConversation(context.Context, string, string, string, string, string, string, string, []Citation) (string, error)
}

func (s *Service) List(ctx context.Context, tenant, project, user string) ([]Agent, error) {
	allowed, err := s.access.HasProjectAccess(ctx, tenant, project, user)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrForbidden
	}
	return s.repo.List(ctx, tenant, project)
}

type Service struct {
	repo      Repository
	access    Access
	retriever Retriever
	gateway   Gateway
	mcp       MCPGranter
	audit     Auditor
}

func NewService(repo Repository, access Access, retriever Retriever, gateway Gateway, mcpGranter MCPGranter, auditor Auditor) *Service {
	return &Service{repo: repo, access: access, retriever: retriever, gateway: gateway, mcp: mcpGranter, audit: auditor}
}

func (s *Service) Create(ctx context.Context, tenant, project, user string, input Agent) (Agent, error) {
	allowed, err := s.access.HasProjectAccess(ctx, tenant, project, user)
	if err != nil {
		return Agent{}, err
	}
	if !allowed {
		return Agent{}, ErrForbidden
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Model = strings.TrimSpace(input.Model)
	if input.Name == "" || input.Model == "" {
		return Agent{}, errors.New("name and model are required")
	}
	id, err := domain.NewID()
	if err != nil {
		return Agent{}, err
	}
	mcpIDs := uniqueNonEmpty(input.MCPAssetIDs)
	kbIDs := uniqueNonEmpty(input.KnowledgeBaseIDs)
	if input.SkillIDs == nil {
		input.SkillIDs = []string{}
	}
	if len(input.SkillHook) == 0 {
		input.SkillHook = json.RawMessage(`{}`)
	}
	input.ID, input.TenantID, input.ProjectID, input.CreatedBy, input.Active = id, tenant, project, user, true
	input.KnowledgeBaseIDs, input.MCPAssetIDs = kbIDs, nil
	// Persist agent + KB first so a failed create cannot leave agent-scoped MCP grants behind.
	if err := s.repo.Create(ctx, input); err != nil {
		return Agent{}, err
	}
	for _, asset := range mcpIDs {
		ok, err := s.mcp.Authorized(ctx, tenant, asset, project, "")
		if err != nil {
			return Agent{}, err
		}
		if !ok {
			return Agent{}, fmt.Errorf("%w: mcp asset %s is not granted to the project", ErrForbidden, asset)
		}
		if err := s.mcp.Grant(ctx, mcp.Grant{TenantID: tenant, AssetID: asset, ProjectID: project, AgentID: id, GrantedBy: user}); err != nil {
			return Agent{}, err
		}
	}
	if err := s.repo.BindMCPAssets(ctx, tenant, project, id, mcpIDs); err != nil {
		return Agent{}, err
	}
	input.MCPAssetIDs = mcpIDs
	return input, nil
}

func (s *Service) Chat(ctx context.Context, tenant, project, agentID, user, gatewayKey, question string) (ChatResult, error) {
	allowed, err := s.access.HasProjectAccess(ctx, tenant, project, user)
	if err != nil {
		return ChatResult{}, err
	}
	if !allowed {
		return ChatResult{}, ErrForbidden
	}
	a, err := s.repo.Get(ctx, tenant, project, agentID)
	if err != nil {
		return ChatResult{}, err
	}
	gatewayKey = strings.TrimSpace(gatewayKey)
	question = strings.TrimSpace(question)
	if gatewayKey == "" || question == "" {
		return ChatResult{}, errors.New("gateway_api_key and question are required")
	}
	citations := []Citation{}
	var contextText strings.Builder
	for _, kb := range a.KnowledgeBaseIDs {
		items, err := s.retriever.Search(ctx, tenant, project, kb, user, question, 3)
		if err != nil {
			return ChatResult{}, err
		}
		for _, item := range items {
			citations = append(citations, item.Citation)
			fmt.Fprintf(&contextText, "\n[document=%s span=%d:%d]\n%s\n", item.Citation.DocumentID, item.Citation.SpanStart, item.Citation.SpanEnd, item.Content)
		}
	}
	mcpCalls := 0
	for _, assetID := range a.MCPAssetIDs {
		body, err := json.Marshal(map[string]any{
			"jsonrpc": "2.0",
			"id":      1,
			"method":  "tools/call",
			"params": map[string]any{
				"name":      "assistant_context",
				"arguments": map[string]string{"question": question},
			},
		})
		if err != nil {
			return ChatResult{}, err
		}
		result, invErr := s.mcp.Invoke(ctx, mcp.Invocation{
			TenantID:  tenant,
			ProjectID: project,
			AgentID:   agentID,
			UserID:    user,
			AssetID:   assetID,
			ToolName:  "assistant_context",
			Body:      body,
		})
		mcpCalls++
		if invErr != nil {
			fmt.Fprintf(&contextText, "\n[mcp=%s error=%v]\n", assetID, invErr)
			continue
		}
		fmt.Fprintf(&contextText, "\n[mcp=%s status=%d]\n%s\n", assetID, result.StatusCode, truncateRunes(string(result.Body), 4000))
	}
	system := a.SystemPrompt + "\nAnswer only from the supplied project context when relevant. Preserve citation markers in the answer.\nProject context:" + contextText.String()
	answer, trace, err := s.gateway.Complete(ctx, gatewayKey, a.Model, system, project, []Message{{Role: "user", Content: question}})
	if err != nil {
		return ChatResult{}, err
	}
	conversation, err := s.repo.SaveConversation(ctx, tenant, project, agentID, user, question, answer, trace, citations)
	if err != nil {
		return ChatResult{}, err
	}
	metadata, _ := json.Marshal(map[string]any{"project_id": project, "conversation_id": conversation, "gateway_trace_id": trace, "citation_count": len(citations), "mcp_calls": mcpCalls})
	if err := s.audit.Append(ctx, audit.Event{TenantID: tenant, TraceID: trace, EventType: "agent.chat", ActorUserID: user, ResourceType: "project_agent", ResourceID: agentID, Outcome: "success", Metadata: metadata}); err != nil {
		return ChatResult{}, err
	}
	return ChatResult{ConversationID: conversation, Answer: answer, Citations: citations, GatewayTraceID: trace, MCPCalls: mcpCalls}, nil
}

func uniqueNonEmpty(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func truncateRunes(s string, max int) string {
	if max <= 0 || len(s) <= max {
		return s
	}
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "…"
}
