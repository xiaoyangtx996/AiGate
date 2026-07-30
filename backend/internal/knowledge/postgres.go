package knowledge

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }
func (p *Postgres) CreateKnowledgeBase(ctx context.Context, k KnowledgeBase) error {
	tag, err := p.db.Pool().Exec(ctx, `INSERT INTO knowledge_bases(id,tenant_id,project_id,name,created_by) SELECT $1,$2,p.id,$4,$5 FROM projects p WHERE p.tenant_id=$2 AND p.id=$3`, k.ID, k.TenantID, k.ProjectID, k.Name, k.CreatedBy)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}
func (p *Postgres) GetKnowledgeBase(ctx context.Context, t, project, id string) (KnowledgeBase, error) {
	var k KnowledgeBase
	err := p.db.Pool().QueryRow(ctx, `SELECT id,tenant_id,project_id,name,created_by,created_at,updated_at FROM knowledge_bases WHERE tenant_id=$1 AND project_id=$2 AND id=$3`, t, project, id).Scan(&k.ID, &k.TenantID, &k.ProjectID, &k.Name, &k.CreatedBy, &k.CreatedAt, &k.UpdatedAt)
	return k, mapNotFound(err)
}
func (p *Postgres) CreateDocument(ctx context.Context, d Document) error {
	_, err := p.db.Pool().Exec(ctx, `INSERT INTO knowledge_documents(id,tenant_id,project_id,knowledge_base_id,filename,media_type,object_key,size_bytes,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'queued',$9)`, d.ID, d.TenantID, d.ProjectID, d.KnowledgeBaseID, d.Filename, d.MediaType, d.ObjectKey, d.SizeBytes, d.CreatedBy)
	return err
}
func (p *Postgres) GetDocument(ctx context.Context, t, project, id string) (Document, error) {
	var d Document
	err := p.db.Pool().QueryRow(ctx, `SELECT id,tenant_id,project_id,knowledge_base_id,filename,media_type,object_key,size_bytes,status,last_error,created_by,created_at,updated_at FROM knowledge_documents WHERE tenant_id=$1 AND project_id=$2 AND id=$3`, t, project, id).Scan(&d.ID, &d.TenantID, &d.ProjectID, &d.KnowledgeBaseID, &d.Filename, &d.MediaType, &d.ObjectKey, &d.SizeBytes, &d.Status, &d.LastError, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt)
	return d, mapNotFound(err)
}
func (p *Postgres) MarkProcessing(ctx context.Context, t, project, id string) error {
	return one(p.db.Pool().Exec(ctx, `UPDATE knowledge_documents SET status='processing',last_error='',updated_at=now() WHERE tenant_id=$1 AND project_id=$2 AND id=$3`, t, project, id))
}
func (p *Postgres) MarkFailed(ctx context.Context, t, project, id, message string) error {
	if len(message) > 2000 {
		message = message[:2000]
	}
	return one(p.db.Pool().Exec(ctx, `UPDATE knowledge_documents SET status='failed',last_error=$4,updated_at=now() WHERE tenant_id=$1 AND project_id=$2 AND id=$3`, t, project, id, message))
}
func (p *Postgres) RequeueDocument(ctx context.Context, t, project, id string) error {
	return one(p.db.Pool().Exec(ctx, `UPDATE knowledge_documents SET status='queued',last_error='',updated_at=now() WHERE tenant_id=$1 AND project_id=$2 AND id=$3 AND status='failed'`, t, project, id))
}
func (p *Postgres) ReplaceChunksAndMarkReady(ctx context.Context, d Document, chunks []Chunk) error {
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `DELETE FROM knowledge_chunks WHERE tenant_id=$1 AND project_id=$2 AND document_id=$3`, d.TenantID, d.ProjectID, d.ID); err != nil {
		return err
	}
	for _, c := range chunks {
		if _, err = tx.Exec(ctx, `INSERT INTO knowledge_chunks(id,tenant_id,project_id,knowledge_base_id,document_id,chunk_index,content,span_start,span_end,embedding) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector)`, c.ID, c.TenantID, c.ProjectID, c.KnowledgeBaseID, c.DocumentID, c.Index, c.Content, c.SpanStart, c.SpanEnd, rag.VectorLiteral(c.Embedding)); err != nil {
			return err
		}
	}
	tag, err := tx.Exec(ctx, `UPDATE knowledge_documents SET status='ready',last_error='',updated_at=now() WHERE tenant_id=$1 AND project_id=$2 AND id=$3`, d.TenantID, d.ProjectID, d.ID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrNotFound
	}
	return tx.Commit(ctx)
}

type tag interface{ RowsAffected() int64 }

func one(t tag, err error) error {
	if err != nil {
		return err
	}
	if t.RowsAffected() != 1 {
		return ErrNotFound
	}
	return nil
}
func mapNotFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}
