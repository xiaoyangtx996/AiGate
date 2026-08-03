package bot

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Usage struct {
	Scope          string     `json:"scope"`
	TenantID       string     `json:"tenant_id"`
	OrganizationID string     `json:"organization_id,omitempty"`
	Window         string     `json:"window,omitempty"`
	From           *time.Time `json:"from,omitempty"`
	To             *time.Time `json:"to,omitempty"`
	LLMCalls       int64      `json:"llm_calls"`
	InputTokens    int64      `json:"input_tokens"`
	OutputTokens   int64      `json:"output_tokens"`
	CostMicros     int64      `json:"cost_micros"`
	MCPCalls       int64      `json:"mcp_calls"`
}

type Answer struct {
	Text  string `json:"answer"`
	Usage Usage  `json:"usage"`
}

type Repository interface {
	UserOrganization(context.Context, string, string) (string, error)
	Summarize(ctx context.Context, tenant, organization string, from, to *time.Time) (Usage, error)
}

type Service struct {
	repo Repository
	now  func() time.Time
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo, now: func() time.Time { return time.Now().UTC() }}
}

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
	window := parseWindow(question, s.now())
	usage, err := s.repo.Summarize(ctx, identity.TenantID, organization, window.From, window.To)
	if err != nil {
		return Answer{}, err
	}
	usage.Scope, usage.TenantID, usage.OrganizationID = scope, identity.TenantID, organization
	usage.Window, usage.From, usage.To = window.Label, window.From, window.To
	scopeLabel := map[string]string{"tenant": "租户", "organization": "组织"}[scope]
	period := "累计"
	if window.Label != "" {
		period = window.Label
	}
	text := fmt.Sprintf("当前%s范围%s共有 %d 次 LLM 调用，输入 %d tokens，输出 %d tokens，成本 %d 微美元；MCP 调用 %d 次。",
		scopeLabel, period, usage.LLMCalls, usage.InputTokens, usage.OutputTokens, usage.CostMicros, usage.MCPCalls)
	return Answer{Text: text, Usage: usage}, nil
}

type window struct {
	From, To *time.Time
	Label    string
}

func parseWindow(question string, now time.Time) window {
	now = now.UTC()
	normalized := strings.ToLower(compactSpaces(question))
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	switch {
	case containsAny(normalized, "今天", "今日", "today"):
		to := dayStart.Add(24 * time.Hour)
		return window{From: &dayStart, To: &to, Label: "今日（UTC）"}
	case containsAny(normalized, "昨天", "昨日", "yesterday"):
		from := dayStart.Add(-24 * time.Hour)
		return window{From: &from, To: &dayStart, Label: "昨日（UTC）"}
	case containsAny(normalized, "本月", "这个月", "this month"):
		from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		to := from.AddDate(0, 1, 0)
		return window{From: &from, To: &to, Label: "本月（UTC）"}
	default:
		return window{}
	}
}

func containsAny(s string, needles ...string) bool {
	for _, n := range needles {
		if strings.Contains(s, n) {
			return true
		}
	}
	return false
}

func compactSpaces(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	prevSpace := false
	for _, r := range s {
		if unicode.IsSpace(r) {
			if !prevSpace {
				b.WriteByte(' ')
				prevSpace = true
			}
			continue
		}
		prevSpace = false
		b.WriteRune(r)
	}
	return strings.TrimSpace(b.String())
}
