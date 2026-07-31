package bot

import (
	"context"
	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"testing"
)

type repoStub struct{ tenant, org string }

func (r *repoStub) UserOrganization(context.Context, string, string) (string, error) {
	return "org-a", nil
}
func (r *repoStub) Summarize(_ context.Context, tenant, org string) (Usage, error) {
	r.tenant, r.org = tenant, org
	return Usage{LLMCalls: 2}, nil
}
func TestBotScopeNeverAcceptsCrossTenant(t *testing.T) {
	r := &repoStub{}
	answer, err := NewService(r).Ask(context.Background(), auth.Identity{TenantID: "tenant-a", UserID: "u", Roles: []string{domain.RoleProjectMember}}, "用量")
	if err != nil || r.tenant != "tenant-a" || r.org != "org-a" || answer.Usage.Scope != "organization" {
		t.Fatalf("answer=%+v tenant=%s org=%s err=%v", answer, r.tenant, r.org, err)
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
