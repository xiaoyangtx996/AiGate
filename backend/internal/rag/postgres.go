package rag

import (
	"context"
	"strconv"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/db"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) Search(ctx context.Context, tenantID, projectID, kbID string, vector []float32, limit int) ([]Result, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT content,1-(embedding <=> $4::vector) AS score,document_id,span_start,span_end FROM knowledge_chunks WHERE tenant_id=$1 AND project_id=$2 AND knowledge_base_id=$3 ORDER BY embedding <=> $4::vector LIMIT $5`, tenantID, projectID, kbID, vectorLiteral(vector), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	results := make([]Result, 0)
	for rows.Next() {
		var item Result
		if err := rows.Scan(&item.Content, &item.Score, &item.Citation.DocumentID, &item.Citation.SpanStart, &item.Citation.SpanEnd); err != nil {
			return nil, err
		}
		results = append(results, item)
	}
	return results, rows.Err()
}

func VectorLiteral(vector []float32) string { return vectorLiteral(vector) }

func vectorLiteral(vector []float32) string {
	var b strings.Builder
	b.WriteByte('[')
	for i, value := range vector {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.FormatFloat(float64(value), 'g', -1, 32))
	}
	b.WriteByte(']')
	return b.String()
}
