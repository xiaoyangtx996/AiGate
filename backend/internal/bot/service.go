package bot

import (
	"context"
	"fmt"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Usage struct {
	Scope          string `json:"scope"`
	TenantID       string `json:"tenant_id"`
	OrganizationID string `json:"organization_id,omitempty"`
	LLMCalls       int64  `json:"llm_calls"`
	InputTokens    int64  `json:"input_tokens"`
	OutputTokens   int64  `json:"output_tokens"`
	CostMicros     int64  `json:"cost_micros"`
	MCPCalls       int64  `json:"mcp_calls"`
}
type Answer struct {
	Text  string `json:"answer"`
	Usage Usage  `json:"usage"`
}
type Repository interface {
	UserOrganization(context.Context, string, string) (string, error)
	Summarize(context.Context, string, string) (Usage, error)
}
type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) Ask(ctx context.Context, identity auth.Identity, question string) (Answer, error) {
	if strings.TrimSpace(question) == "" {
		return Answer{Text: "请提出用量问题。"}, nil
	}
	organization := ""
	scope := "tenant"
	if !identity.Platform && !identity.HasRole(domain.RolePlatformAdmin) {
		var err error
		organization, err = s.repo.UserOrganization(ctx, identity.TenantID, identity.UserID)
		if err != nil {
			return Answer{}, err
		}
		scope = "organization"
	}
	usage, err := s.repo.Summarize(ctx, identity.TenantID, organization)
	if err != nil {
		return Answer{}, err
	}
	usage.Scope, usage.TenantID, usage.OrganizationID = scope, identity.TenantID, organization
	text := fmt.Sprintf("当前%s范围共有 %d 次 LLM 调用，输入 %d tokens，输出 %d tokens，成本 %d 微美元；MCP 调用 %d 次。", map[string]string{"tenant": "租户", "organization": "组织"}[scope], usage.LLMCalls, usage.InputTokens, usage.OutputTokens, usage.CostMicros, usage.MCPCalls)
	return Answer{Text: text, Usage: usage}, nil
}
