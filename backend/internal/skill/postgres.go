package skill

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) Create(ctx context.Context, s Skill, user string) (Skill, error) {
	versionID, err := domain.NewID()
	if err != nil {
		return Skill{}, err
	}
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return Skill{}, err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `INSERT INTO skills(id,tenant_id,name,description,active,created_by) VALUES($1,$2,$3,$4,true,$5)`, s.ID, s.TenantID, s.Name, s.Description, user); err != nil {
		return Skill{}, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO skill_versions(id,tenant_id,skill_id,version,instructions,hook,status,created_by) VALUES($1,$2,$3,1,$4,$5,'active',$6)`, versionID, s.TenantID, s.ID, s.Instructions, s.Hook, user); err != nil {
		return Skill{}, err
	}
	if _, err = tx.Exec(ctx, `UPDATE skills SET active_version_id=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2`, s.TenantID, s.ID, versionID); err != nil {
		return Skill{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Skill{}, err
	}
	s.ActiveVersionID, s.Version = versionID, 1
	return s, nil
}

func (p *Postgres) CreateVersion(ctx context.Context, tenant, skillID string, v Version, user string, activate bool) (Version, error) {
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return Version{}, err
	}
	defer tx.Rollback(ctx)
	var next int
	if err = tx.QueryRow(ctx, `SELECT COALESCE(max(version),0)+1 FROM skill_versions WHERE tenant_id=$1 AND skill_id=$2`, tenant, skillID).Scan(&next); err != nil {
		return Version{}, err
	}
	status := "draft"
	if activate {
		status = "active"
	}
	tag, err := tx.Exec(ctx, `INSERT INTO skill_versions(id,tenant_id,skill_id,version,instructions,hook,status,created_by) SELECT $3,$1,s.id,$4,$5,$6,$7,$8 FROM skills s WHERE s.tenant_id=$1 AND s.id=$2 AND s.active`, tenant, skillID, v.ID, next, v.Instructions, v.Hook, status, user)
	if err != nil {
		return Version{}, err
	}
	if tag.RowsAffected() == 0 {
		return Version{}, ErrNotFound
	}
	if activate {
		if _, err = tx.Exec(ctx, `UPDATE skills SET active_version_id=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2`, tenant, skillID, v.ID); err != nil {
			return Version{}, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return Version{}, err
	}
	v.TenantID, v.SkillID, v.Version, v.Status = tenant, skillID, next, status
	return v, nil
}

func (p *Postgres) List(ctx context.Context, tenant string) ([]Skill, error) {
	return p.list(ctx, `WHERE s.tenant_id=$1 AND s.active`, tenant)
}

func (p *Postgres) ListProject(ctx context.Context, tenant, project string) ([]Skill, error) {
	return p.list(ctx, `JOIN skill_grants g ON g.tenant_id=s.tenant_id AND g.skill_id=s.id WHERE s.tenant_id=$1 AND g.project_id=$2 AND s.active`, tenant, project)
}

func (p *Postgres) list(ctx context.Context, scope string, args ...any) ([]Skill, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT s.id,s.tenant_id,s.name,s.description,s.active_version_id,v.version,v.instructions,v.hook,s.active FROM skills s JOIN skill_versions v ON v.tenant_id=s.tenant_id AND v.id=s.active_version_id `+scope+` ORDER BY s.name,s.id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Skill{}
	for rows.Next() {
		var s Skill
		if err := rows.Scan(&s.ID, &s.TenantID, &s.Name, &s.Description, &s.ActiveVersionID, &s.Version, &s.Instructions, &s.Hook, &s.Active); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	return items, rows.Err()
}

func (p *Postgres) Grant(ctx context.Context, tenant, skillID, projectID, user string) error {
	tag, err := p.db.Pool().Exec(ctx, `INSERT INTO skill_grants(tenant_id,skill_id,project_id,granted_by) SELECT $1,s.id,p.id,$4 FROM skills s JOIN projects p ON p.tenant_id=s.tenant_id WHERE s.tenant_id=$1 AND s.id=$2 AND p.id=$3 AND s.active ON CONFLICT DO NOTHING`, tenant, skillID, projectID, user)
	if err == nil && tag.RowsAffected() == 0 {
		var exists bool
		err = p.db.Pool().QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM skill_grants WHERE tenant_id=$1 AND skill_id=$2 AND project_id=$3)`, tenant, skillID, projectID).Scan(&exists)
		if err == nil && !exists {
			err = ErrNotFound
		}
	}
	return err
}

func (p *Postgres) ResolveBindings(ctx context.Context, tenant, project string, ids []string) ([]Binding, error) {
	if len(ids) == 0 {
		return []Binding{}, nil
	}
	rows, err := p.db.Pool().Query(ctx, `SELECT s.id,s.active_version_id,s.name,v.version,v.instructions,v.hook FROM skills s JOIN skill_grants g ON g.tenant_id=s.tenant_id AND g.skill_id=s.id JOIN skill_versions v ON v.tenant_id=s.tenant_id AND v.id=s.active_version_id WHERE s.tenant_id=$1 AND g.project_id=$2 AND s.id::text=ANY($3::text[]) AND s.active`, tenant, project, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Binding{}
	for rows.Next() {
		var b Binding
		if err := rows.Scan(&b.SkillID, &b.VersionID, &b.Name, &b.Version, &b.Instructions, &b.Hook); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if len(items) != len(ids) {
		return nil, ErrForbidden
	}
	return items, nil
}

func (p *Postgres) AgentBindings(ctx context.Context, tenant, project, agentID string) ([]Binding, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT b.skill_id,b.skill_version_id,s.name,v.version,v.instructions,v.hook FROM agent_skill_bindings b JOIN skills s ON s.tenant_id=b.tenant_id AND s.id=b.skill_id JOIN skill_versions v ON v.tenant_id=b.tenant_id AND v.id=b.skill_version_id WHERE b.tenant_id=$1 AND b.project_id=$2 AND b.agent_id=$3 ORDER BY s.name,s.id`, tenant, project, agentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Binding{}
	for rows.Next() {
		var b Binding
		if err := rows.Scan(&b.SkillID, &b.VersionID, &b.Name, &b.Version, &b.Instructions, &b.Hook); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, rows.Err()
}

func (p *Postgres) AppendInvocation(ctx context.Context, m Memory, u Usage, limit int) error {
	memoryID, err := domain.NewID()
	if err != nil {
		return err
	}
	usageID, err := domain.NewID()
	if err != nil {
		return err
	}
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, `INSERT INTO skill_memories(id,tenant_id,project_id,agent_id,skill_id,skill_version_id,user_id,input,output,trace_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, memoryID, m.TenantID, m.ProjectID, m.AgentID, m.SkillID, m.VersionID, m.UserID, m.Input, m.Output, m.TraceID)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM skill_memories WHERE id IN (SELECT id FROM skill_memories WHERE tenant_id=$1 AND skill_id=$2 AND agent_id=$3 AND user_id=$4 ORDER BY created_at DESC,id DESC OFFSET $5)`, m.TenantID, m.SkillID, m.AgentID, m.UserID, limit)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO skill_usage_events(id,tenant_id,project_id,agent_id,skill_id,skill_version_id,user_id,trace_id,cost_micros) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, usageID, u.TenantID, u.ProjectID, u.AgentID, u.SkillID, u.VersionID, u.UserID, u.TraceID, u.CostMicros)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (p *Postgres) ListMemory(ctx context.Context, tenant, skillID string, limit int) ([]Memory, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT id,tenant_id,project_id,agent_id,skill_id,skill_version_id,user_id,input,output,trace_id FROM skill_memories WHERE tenant_id=$1 AND skill_id=$2 ORDER BY created_at DESC,id DESC LIMIT $3`, tenant, skillID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Memory{}
	for rows.Next() {
		var m Memory
		if err := rows.Scan(&m.ID, &m.TenantID, &m.ProjectID, &m.AgentID, &m.SkillID, &m.VersionID, &m.UserID, &m.Input, &m.Output, &m.TraceID); err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

func mapNotFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}
