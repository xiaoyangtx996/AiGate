package skill

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

type repoStub struct {
	created  Skill
	versions []Version
	memory   Memory
	usage    Usage
	limit    int
}

func (r *repoStub) Create(_ context.Context, s Skill, _ string) (Skill, error) {
	r.created = s
	s.ActiveVersionID = "v1"
	s.Version = 1
	return s, nil
}
func (r *repoStub) CreateVersion(_ context.Context, _, _ string, v Version, _ string, active bool) (Version, error) {
	if active {
		v.Status = "active"
	} else {
		v.Status = "draft"
	}
	r.versions = append(r.versions, v)
	return v, nil
}
func (*repoStub) List(context.Context, string) ([]Skill, error)                { return nil, nil }
func (*repoStub) Grant(context.Context, string, string, string, string) error  { return nil }
func (*repoStub) ListProject(context.Context, string, string) ([]Skill, error) { return nil, nil }
func (*repoStub) ResolveBindings(context.Context, string, string, []string) ([]Binding, error) {
	return nil, nil
}
func (*repoStub) AgentBindings(context.Context, string, string, string) ([]Binding, error) {
	return nil, nil
}
func (r *repoStub) AppendInvocation(_ context.Context, m Memory, u Usage, l int) error {
	r.memory = m
	r.usage = u
	r.limit = l
	return nil
}
func (*repoStub) ListMemory(context.Context, string, string, int) ([]Memory, error) { return nil, nil }

type accessStub bool

func (a accessStub) HasProjectAccess(context.Context, string, string, string) (bool, error) {
	return bool(a), nil
}
func TestCreateAndVersionAreImmutable(t *testing.T) {
	r := &repoStub{}
	s := NewService(r, accessStub(true), nil)
	created, err := s.Create(context.Background(), "t", "u", "Summarize", "desc", "Be concise", json.RawMessage(`{"before":true}`))
	if err != nil || created.Version != 1 || r.created.ID == "" {
		t.Fatalf("created=%+v err=%v", created, err)
	}
	v, err := s.CreateVersion(context.Background(), "t", created.ID, "u", "New instructions", nil, false)
	if err != nil || v.Status != "draft" || r.created.Instructions != "Be concise" {
		t.Fatalf("version=%+v original=%+v err=%v", v, r.created, err)
	}
}

func TestRecordInvocationIncludesSkillAndBoundedMemory(t *testing.T) {
	r := &repoStub{}
	s := NewService(r, accessStub(true), nil)
	err := s.RecordInvocation(context.Background(), Memory{SkillID: "skill", VersionID: "version"}, Usage{SkillID: "skill", VersionID: "version"})
	if err != nil || r.usage.SkillID != "skill" || r.limit != MemoryLimit {
		t.Fatalf("usage=%+v limit=%d err=%v", r.usage, r.limit, err)
	}
}

func TestOptimizationStubDoesNotCreateVersion(t *testing.T) {
	r := &repoStub{}
	s := NewService(r, accessStub(true), nil)
	err := s.OptimizationHandler(context.Background(), jobs.Job{Payload: json.RawMessage(`{"tenant_id":"t","skill_id":"s","user_id":"u"}`)})
	if err != nil || len(r.versions) != 0 {
		t.Fatalf("versions=%v err=%v", r.versions, err)
	}
}
