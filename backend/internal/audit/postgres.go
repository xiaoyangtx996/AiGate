package audit

import (
	"context"
	"encoding/json"

	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) Append(ctx context.Context, event Event) error {
	if event.ID == "" {
		var err error
		event.ID, err = domain.NewID()
		if err != nil {
			return err
		}
	}
	var actor any
	if event.ActorUserID != "" {
		actor = event.ActorUserID
	}
	_, err := p.db.Pool().Exec(ctx, `INSERT INTO audit_events(id,tenant_id,trace_id,event_type,actor_user_id,resource_type,resource_id,outcome,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, event.ID, event.TenantID, event.TraceID, event.EventType, actor, event.ResourceType, event.ResourceID, event.Outcome, event.Metadata)
	return err
}

func (p *Postgres) List(ctx context.Context, filter Filter) ([]Event, error) {
	rows, err := p.db.Pool().Query(ctx, `SELECT id,tenant_id,trace_id,event_type,COALESCE(actor_user_id::text,''),resource_type,resource_id,outcome,metadata,created_at FROM audit_events WHERE tenant_id=$1 AND ($2='' OR trace_id=$2) AND ($3='' OR event_type=$3) AND ($4::timestamptz IS NULL OR created_at >= $4) AND ($5::timestamptz IS NULL OR created_at <= $5) ORDER BY created_at DESC,id DESC LIMIT $6`, filter.TenantID, filter.TraceID, filter.EventType, filter.From, filter.To, filter.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := make([]Event, 0)
	for rows.Next() {
		var event Event
		var metadata []byte
		if err := rows.Scan(&event.ID, &event.TenantID, &event.TraceID, &event.EventType, &event.ActorUserID, &event.ResourceType, &event.ResourceID, &event.Outcome, &metadata, &event.CreatedAt); err != nil {
			return nil, err
		}
		event.Metadata = json.RawMessage(metadata)
		events = append(events, event)
	}
	return events, rows.Err()
}
