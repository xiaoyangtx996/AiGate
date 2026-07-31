package usage

import (
	"context"
	"errors"
	"time"
)

var ErrInvalidRange = errors.New("invalid usage date range")

type Filter struct {
	TenantID       string
	OrganizationID string
	ProjectID      string
	From           time.Time
	To             time.Time
}

type Daily struct {
	Day              string `json:"day"`
	OrganizationID   string `json:"organization_id"`
	OrganizationName string `json:"organization_name"`
	ProjectID        string `json:"project_id"`
	ProjectName      string `json:"project_name"`
	Calls            int64  `json:"calls"`
	InputTokens      int64  `json:"input_tokens"`
	OutputTokens     int64  `json:"output_tokens"`
	CostMicros       int64  `json:"cost_micros"`
	LLMCostMicros    int64  `json:"llm_cost_micros"`
	MCPCostMicros    int64  `json:"mcp_cost_micros"`
	LLMCalls         int64  `json:"llm_calls"`
	MCPCalls         int64  `json:"mcp_calls"`
	EstimatedCalls   int64  `json:"estimated_calls"`
}

type QuotaUtilization struct {
	ScopeType      string  `json:"scope_type"`
	ScopeID        string  `json:"scope_id"`
	LimitTokens    int64   `json:"limit_tokens"`
	UsedTokens     int64   `json:"used_tokens"`
	ReservedTokens int64   `json:"reserved_tokens"`
	Percent        float64 `json:"percent"`
}

type Summary struct {
	Daily  []Daily            `json:"daily"`
	Quotas []QuotaUtilization `json:"quotas"`
}

type Repository interface {
	Summary(context.Context, Filter) (Summary, error)
}

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) Summary(ctx context.Context, filter Filter) (Summary, error) {
	if filter.TenantID == "" || filter.From.IsZero() || filter.To.IsZero() || filter.To.Before(filter.From) {
		return Summary{}, ErrInvalidRange
	}
	return s.repo.Summary(ctx, filter)
}
