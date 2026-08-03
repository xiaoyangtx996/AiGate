package bot

import (
	"context"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type repoStub struct {
	tenant, org string
	from, to    *time.Time
}

func (r *repoStub) UserOrganization(context.Context, string, string) (string, error) {
	return "org-a", nil
}

func (r *repoStub) Summarize(_ context.Context, tenant, org string, from, to *time.Time) (Usage, error) {
	r.tenant, r.org, r.from, r.to = tenant, org, from, to
	return Usage{LLMCalls: 2, MCPCalls: 1, InputTokens: 10, OutputTokens: 4, CostMicros: 7}, nil
}

func TestBotScopeNeverAcceptsCrossTenant(t *testing.T) {
	r := &repoStub{}
	answer, err := NewService(r).Ask(context.Background(), auth.Identity{TenantID: "tenant-a", UserID: "u", Roles: []string{domain.RoleProjectMember}}, "用量")
	if err != nil || r.tenant != "tenant-a" || r.org != "org-a" || answer.Usage.Scope != "organization" {
		t.Fatalf("answer=%+v tenant=%s org=%s err=%v", answer, r.tenant, r.org, err)
	}
	if r.from != nil || r.to != nil || answer.Usage.Window != "" {
		t.Fatalf("expected all-time window, got from=%v to=%v window=%q", r.from, r.to, answer.Usage.Window)
	}
	if answer.Text != "当前组织范围累计共有 2 次 LLM 调用，输入 10 tokens，输出 4 tokens，成本 7 微美元；MCP 调用 1 次。" {
		t.Fatalf("text=%q", answer.Text)
	}
}

func TestEmptyQuestionDoesNotLeakUsage(t *testing.T) {
	r := &repoStub{}
	answer, err := NewService(r).Ask(context.Background(), auth.Identity{TenantID: "tenant-a", UserID: "u", Roles: []string{domain.RoleProjectMember}}, "  ")
	if err != nil || answer.Text != "请提出用量问题。" || r.tenant != "" || answer.Usage.LLMCalls != 0 {
		t.Fatalf("answer=%+v repo=%+v err=%v", answer, r, err)
	}
}

func TestAdminGetsCurrentTenantOnly(t *testing.T) {
	r := &repoStub{}
	answer, err := NewService(r).Ask(context.Background(), auth.Identity{TenantID: "tenant-a", UserID: "u", Roles: []string{domain.RolePlatformAdmin}}, "用量")
	if err != nil || r.tenant != "tenant-a" || r.org != "" || answer.Usage.Scope != "tenant" {
		t.Fatalf("answer=%+v tenant=%s org=%s", answer, r.tenant, r.org)
	}
}

func TestAskTodayUsesUTCDayWindow(t *testing.T) {
	r := &repoStub{}
	svc := NewService(r)
	svc.now = func() time.Time { return time.Date(2026, 8, 3, 17, 30, 0, 0, time.UTC) }
	answer, err := svc.Ask(context.Background(), auth.Identity{TenantID: "tenant-a", UserID: "u", Roles: []string{domain.RolePlatformAdmin}}, "今天全部项目的 LLM 与 MCP 用量和成本是多少？")
	if err != nil {
		t.Fatal(err)
	}
	wantFrom := time.Date(2026, 8, 3, 0, 0, 0, 0, time.UTC)
	wantTo := time.Date(2026, 8, 4, 0, 0, 0, 0, time.UTC)
	if r.from == nil || r.to == nil || !r.from.Equal(wantFrom) || !r.to.Equal(wantTo) {
		t.Fatalf("window from=%v to=%v", r.from, r.to)
	}
	if answer.Usage.Window != "今日（UTC）" || answer.Text != "当前租户范围今日（UTC）共有 2 次 LLM 调用，输入 10 tokens，输出 4 tokens，成本 7 微美元；MCP 调用 1 次。" {
		t.Fatalf("answer=%+v text=%q", answer.Usage, answer.Text)
	}
}

func TestAskThisMonthUsesUTCMonthWindow(t *testing.T) {
	r := &repoStub{}
	svc := NewService(r)
	svc.now = func() time.Time { return time.Date(2026, 8, 3, 17, 30, 0, 0, time.UTC) }
	_, err := svc.Ask(context.Background(), auth.Identity{TenantID: "tenant-a", UserID: "u", Roles: []string{domain.RolePlatformAdmin}}, "本月用量和成本是多少？")
	if err != nil {
		t.Fatal(err)
	}
	wantFrom := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	wantTo := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	if r.from == nil || r.to == nil || !r.from.Equal(wantFrom) || !r.to.Equal(wantTo) {
		t.Fatalf("window from=%v to=%v", r.from, r.to)
	}
}

func TestParseWindowYesterday(t *testing.T) {
	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	w := parseWindow("yesterday MCP calls", now)
	wantFrom := time.Date(2026, 8, 2, 0, 0, 0, 0, time.UTC)
	wantTo := time.Date(2026, 8, 3, 0, 0, 0, 0, time.UTC)
	if w.Label != "昨日（UTC）" || w.From == nil || w.To == nil || !w.From.Equal(wantFrom) || !w.To.Equal(wantTo) {
		t.Fatalf("%+v", w)
	}
}
