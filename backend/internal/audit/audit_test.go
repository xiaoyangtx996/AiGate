package audit

import (
	"context"
	"strings"
	"testing"
	"time"
)

type memoryRepo struct{ events []Event }

func (r *memoryRepo) Append(_ context.Context, event Event) error {
	r.events = append(r.events, event)
	return nil
}
func (r *memoryRepo) List(_ context.Context, filter Filter) ([]Event, error) {
	result := []Event{}
	for _, event := range r.events {
		if event.TenantID == filter.TenantID {
			result = append(result, event)
		}
	}
	return result, nil
}

func TestCSVIsTenantScopedAndRFC4180(t *testing.T) {
	repo := &memoryRepo{events: []Event{{ID: "1", TenantID: "a", TraceID: "trace-a", EventType: "gateway.call", Outcome: "success", Metadata: []byte(`{"message":"a,b"}`), CreatedAt: time.Now()}, {ID: "2", TenantID: "b", TraceID: "trace-b", EventType: "gateway.call", Outcome: "success", CreatedAt: time.Now()}}}
	data, err := NewService(repo).CSV(context.Background(), Filter{TenantID: "a", Limit: 100})
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	if !strings.Contains(text, "trace-a") || strings.Contains(text, "trace-b") || !strings.Contains(text, `""message""`) {
		t.Fatalf("csv=%s", text)
	}
}
