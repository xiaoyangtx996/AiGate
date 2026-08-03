package skill

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

const (
	OptimizationJobType = "skill.optimize"
	MemoryLimit         = 100
)

var (
	ErrForbidden = errors.New("skill access denied")
	ErrNotFound  = errors.New("skill not found")
)

type Skill struct {
	ID              string          `json:"id"`
	TenantID        string          `json:"tenant_id"`
	Name            string          `json:"name"`
	Description     string          `json:"description"`
	ActiveVersionID string          `json:"active_version_id"`
	Version         int             `json:"version"`
	Instructions    string          `json:"instructions"`
	Hook            json.RawMessage `json:"hook"`
	Active          bool            `json:"active"`
}

type Version struct {
	ID              string          `json:"id"`
	TenantID        string          `json:"tenant_id"`
	SkillID         string          `json:"skill_id"`
	Instructions    string          `json:"instructions"`
	SourceVersionID string          `json:"source_version_id,omitempty"`
	Status          string          `json:"status"`
	Version         int             `json:"version"`
	Hook            json.RawMessage `json:"hook"`
}

type Binding struct {
	SkillID, VersionID, Name, Instructions string
	Version                                int
	Hook                                   json.RawMessage
}

type Memory struct {
	ID        string `json:"id"`
	TenantID  string `json:"tenant_id"`
	ProjectID string `json:"project_id"`
	AgentID   string `json:"agent_id"`
	SkillID   string `json:"skill_id"`
	VersionID string `json:"version_id"`
	UserID    string `json:"user_id"`
	Input     string `json:"input"`
	Output    string `json:"output"`
	TraceID   string `json:"trace_id"`
}

type Usage struct {
	TenantID, ProjectID, AgentID, SkillID, VersionID, UserID, TraceID string
	CostMicros                                                        int64
}

type Repository interface {
	Create(context.Context, Skill, string) (Skill, error)
	CreateVersion(context.Context, string, string, Version, string, bool) (Version, error)
	List(context.Context, string) ([]Skill, error)
	Grant(context.Context, string, string, string, string) error
	ListProject(context.Context, string, string) ([]Skill, error)
	ResolveBindings(context.Context, string, string, []string) ([]Binding, error)
	AgentBindings(context.Context, string, string, string) ([]Binding, error)
	AppendInvocation(context.Context, Memory, Usage, int) error
	ListMemory(context.Context, string, string, int) ([]Memory, error)
}

type Access interface {
	HasProjectAccess(context.Context, string, string, string) (bool, error)
}

type Service struct {
	repo   Repository
	access Access
	queue  jobs.Queue
}

func NewService(repo Repository, access Access, queue jobs.Queue) *Service {
	return &Service{repo: repo, access: access, queue: queue}
}

func (s *Service) Create(ctx context.Context, tenant, user, name, description, instructions string, hook json.RawMessage) (Skill, error) {
	name, instructions = strings.TrimSpace(name), strings.TrimSpace(instructions)
	if name == "" || instructions == "" {
		return Skill{}, errors.New("name and instructions are required")
	}
	id, err := domain.NewID()
	if err != nil {
		return Skill{}, err
	}
	return s.repo.Create(ctx, Skill{ID: id, TenantID: tenant, Name: name, Description: strings.TrimSpace(description), Instructions: instructions, Hook: validHook(hook), Active: true}, user)
}

func (s *Service) CreateVersion(ctx context.Context, tenant, skillID, user, instructions string, hook json.RawMessage, activate bool) (Version, error) {
	instructions = strings.TrimSpace(instructions)
	if instructions == "" {
		return Version{}, errors.New("instructions are required")
	}
	id, err := domain.NewID()
	if err != nil {
		return Version{}, err
	}
	return s.repo.CreateVersion(ctx, tenant, skillID, Version{ID: id, Instructions: instructions, Hook: validHook(hook)}, user, activate)
}

func (s *Service) List(ctx context.Context, tenant string) ([]Skill, error) {
	return s.repo.List(ctx, tenant)
}

func (s *Service) Grant(ctx context.Context, tenant, skillID, projectID, user string) error {
	return s.repo.Grant(ctx, tenant, skillID, projectID, user)
}

func (s *Service) ListProject(ctx context.Context, tenant, project, user string) ([]Skill, error) {
	ok, err := s.access.HasProjectAccess(ctx, tenant, project, user)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrForbidden
	}
	return s.repo.ListProject(ctx, tenant, project)
}

func (s *Service) ResolveBindings(ctx context.Context, tenant, project string, ids []string) ([]Binding, error) {
	return s.repo.ResolveBindings(ctx, tenant, project, unique(ids))
}

func (s *Service) AgentBindings(ctx context.Context, tenant, project, agentID string) ([]Binding, error) {
	return s.repo.AgentBindings(ctx, tenant, project, agentID)
}

func (s *Service) RecordInvocation(ctx context.Context, memory Memory, usage Usage) error {
	return s.repo.AppendInvocation(ctx, memory, usage, MemoryLimit)
}

func (s *Service) Memory(ctx context.Context, tenant, skillID string, limit int) ([]Memory, error) {
	if limit <= 0 || limit > MemoryLimit {
		limit = MemoryLimit
	}
	return s.repo.ListMemory(ctx, tenant, skillID, limit)
}

func (s *Service) EnqueueOptimization(ctx context.Context, tenant, skillID, user string) error {
	payload, _ := json.Marshal(map[string]string{"tenant_id": tenant, "skill_id": skillID, "user_id": user})
	return s.queue.Enqueue(ctx, jobs.Job{TenantID: tenant, Type: OptimizationJobType, Payload: payload, MaxAttempts: 3})
}

func (s *Service) OptimizationHandler(ctx context.Context, job jobs.Job) error {
	var payload struct {
		TenantID string `json:"tenant_id"`
		SkillID  string `json:"skill_id"`
		UserID   string `json:"user_id"`
	}
	if err := json.Unmarshal(job.Payload, &payload); err != nil {
		return err
	}
	// The stub deliberately creates no version: active and pinned versions remain immutable.
	if payload.TenantID == "" || payload.SkillID == "" || payload.UserID == "" {
		return errors.New("invalid skill optimization payload")
	}
	return nil
}

func validHook(h json.RawMessage) json.RawMessage {
	if len(h) == 0 || !json.Valid(h) {
		return json.RawMessage(`{}`)
	}
	return h
}

func unique(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && !seen[value] {
			seen[value] = true
			out = append(out, value)
		}
	}
	return out
}
