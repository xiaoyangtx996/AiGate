package audit

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"strconv"
	"time"
)

var ErrInvalidFilter = errors.New("invalid audit filter")

type Event struct {
	ID           string          `json:"id"`
	TenantID     string          `json:"tenant_id"`
	TraceID      string          `json:"trace_id"`
	EventType    string          `json:"event_type"`
	ActorUserID  string          `json:"actor_user_id,omitempty"`
	ResourceType string          `json:"resource_type"`
	ResourceID   string          `json:"resource_id"`
	Outcome      string          `json:"outcome"`
	Metadata     json.RawMessage `json:"metadata"`
	CreatedAt    time.Time       `json:"created_at"`
}

type Filter struct {
	TenantID, TraceID, EventType string
	From, To                     *time.Time
	Limit                        int
}

type Repository interface {
	Append(context.Context, Event) error
	List(context.Context, Filter) ([]Event, error)
}

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) Append(ctx context.Context, event Event) error {
	if event.TenantID == "" || event.TraceID == "" || event.EventType == "" || event.Outcome == "" {
		return ErrInvalidFilter
	}
	if len(event.Metadata) == 0 {
		event.Metadata = json.RawMessage(`{}`)
	}
	return s.repo.Append(ctx, event)
}

func (s *Service) List(ctx context.Context, filter Filter) ([]Event, error) {
	if filter.TenantID == "" || filter.Limit < 1 || filter.Limit > 1000 || filter.From != nil && filter.To != nil && filter.From.After(*filter.To) {
		return nil, ErrInvalidFilter
	}
	return s.repo.List(ctx, filter)
}

func (s *Service) CSV(ctx context.Context, filter Filter) ([]byte, error) {
	events, err := s.List(ctx, filter)
	if err != nil {
		return nil, err
	}
	var out bytes.Buffer
	w := csv.NewWriter(&out)
	_ = w.Write([]string{"id", "created_at", "trace_id", "event_type", "actor_user_id", "resource_type", "resource_id", "outcome", "metadata"})
	for _, event := range events {
		_ = w.Write([]string{event.ID, event.CreatedAt.UTC().Format(time.RFC3339Nano), event.TraceID, event.EventType, event.ActorUserID, event.ResourceType, event.ResourceID, event.Outcome, string(event.Metadata)})
	}
	w.Flush()
	return out.Bytes(), w.Error()
}

func ParseTime(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	return &parsed, err
}

func ParseLimit(value string) (int, error) {
	if value == "" {
		return 100, nil
	}
	return strconv.Atoi(value)
}
