package agent

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/skill"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) Create(ctx context.Context, a Agent) error {
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, `INSERT INTO project_agents(id,tenant_id,project_id,name,model,system_prompt,skill_ids,skill_hook,active,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9)`, a.ID, a.TenantID, a.ProjectID, a.Name, a.Model, a.SystemPrompt, a.SkillIDs, a.SkillHook, a.CreatedBy)
	if err != nil {
		return err
	}
	for _, kb := range a.KnowledgeBaseIDs {
		if _, err = tx.Exec(ctx, `INSERT INTO agent_knowledge_bindings(tenant_id,project_id,agent_id,knowledge_base_id) VALUES($1,$2,$3,$4)`, a.TenantID, a.ProjectID, a.ID, kb); err != nil {
			return err
		}
	}
	for _, asset := range a.MCPAssetIDs {
		if _, err = tx.Exec(ctx, `INSERT INTO agent_mcp_bindings(tenant_id,project_id,agent_id,mcp_asset_id) VALUES($1,$2,$3,$4)`, a.TenantID, a.ProjectID, a.ID, asset); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (p *Postgres) BindMCPAssets(ctx context.Context, tenant, project, agentID string, assetIDs []string) error {
	for _, asset := range assetIDs {
		if _, err := p.db.Pool().Exec(ctx, `INSERT INTO agent_mcp_bindings(tenant_id,project_id,agent_id,mcp_asset_id) VALUES($1,$2,$3,$4)`, tenant, project, agentID, asset); err != nil {
			return err
		}
	}
	return nil
}

func (p *Postgres) BindSkills(ctx context.Context, tenant, project, agentID string, bindings []skill.Binding) error {
	for _, binding := range bindings {
		if _, err := p.db.Pool().Exec(ctx, `INSERT INTO agent_skill_bindings(tenant_id,project_id,agent_id,skill_id,skill_version_id) VALUES($1,$2,$3,$4,$5)`, tenant, project, agentID, binding.SkillID, binding.VersionID); err != nil {
			return err
		}
	}
	return nil
}

func (p *Postgres) Get(ctx context.Context, tenant, project, id string) (Agent, error) {
	var a Agent
	var hook []byte
	err := p.db.Pool().QueryRow(ctx, `SELECT id,tenant_id,project_id,name,model,system_prompt,skill_ids,skill_hook,active,created_by FROM project_agents WHERE tenant_id=$1 AND project_id=$2 AND id=$3 AND active`, tenant, project, id).Scan(&a.ID, &a.TenantID, &a.ProjectID, &a.Name, &a.Model, &a.SystemPrompt, &a.SkillIDs, &hook, &a.Active, &a.CreatedBy)
	if errors.Is(err, pgx.ErrNoRows) {
		return Agent{}, ErrNotFound
	}
	if err != nil {
		return Agent{}, err
	}
	a.SkillHook = json.RawMessage(hook)
	a.KnowledgeBaseIDs, err = p.ids(ctx, `SELECT knowledge_base_id FROM agent_knowledge_bindings WHERE tenant_id=$1 AND project_id=$2 AND agent_id=$3 ORDER BY knowledge_base_id`, tenant, project, id)
	if err != nil {
		return Agent{}, err
	}
	a.MCPAssetIDs, err = p.ids(ctx, `SELECT mcp_asset_id FROM agent_mcp_bindings WHERE tenant_id=$1 AND project_id=$2 AND agent_id=$3 ORDER BY mcp_asset_id`, tenant, project, id)
	if err != nil {
		return Agent{}, err
	}
	a.SkillIDs, err = p.ids(ctx, `SELECT skill_id FROM agent_skill_bindings WHERE tenant_id=$1 AND project_id=$2 AND agent_id=$3 ORDER BY skill_id`, tenant, project, id)
	return a, err
}

func (p *Postgres) List(ctx context.Context, tenant, project string) ([]Agent, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT id FROM project_agents WHERE tenant_id=$1 AND project_id=$2 AND active ORDER BY created_at,id`, tenant, project)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	items := make([]Agent, 0, len(ids))
	for _, id := range ids {
		item, err := p.Get(ctx, tenant, project, id)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (p *Postgres) ids(ctx context.Context, sql string, args ...any) ([]string, error) {
	rows, err := p.db.Pool().Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (p *Postgres) SaveConversation(ctx context.Context, tenant, project, agentID, user, question, answer, trace string, citations []Citation) (string, error) {
	conversation, err := domain.NewID()
	if err != nil {
		return "", err
	}
	userMessage, err := domain.NewID()
	if err != nil {
		return "", err
	}
	assistantMessage, err := domain.NewID()
	if err != nil {
		return "", err
	}
	encoded, err := json.Marshal(citations)
	if err != nil {
		return "", err
	}
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, `INSERT INTO agent_conversations(id,tenant_id,project_id,agent_id,user_id) VALUES($1,$2,$3,$4,$5)`, conversation, tenant, project, agentID, user)
	if err != nil {
		return "", err
	}
	_, err = tx.Exec(ctx, `INSERT INTO agent_messages(id,tenant_id,conversation_id,role,content) VALUES($1,$2,$3,'user',$4)`, userMessage, tenant, conversation, question)
	if err != nil {
		return "", err
	}
	_, err = tx.Exec(ctx, `INSERT INTO agent_messages(id,tenant_id,conversation_id,role,content,citations,gateway_trace_id) VALUES($1,$2,$3,'assistant',$4,$5,$6)`, assistantMessage, tenant, conversation, answer, encoded, trace)
	if err != nil {
		return "", err
	}
	return conversation, tx.Commit(ctx)
}
