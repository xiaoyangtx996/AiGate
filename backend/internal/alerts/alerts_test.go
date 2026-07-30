package alerts

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

type fakeRepo struct {
	delivery          Delivery
	delivered, failed bool
}

func (r *fakeRepo) GetPolicy(context.Context, string) (Policy, error)  { return Policy{}, nil }
func (r *fakeRepo) SetPolicy(context.Context, Policy) error            { return nil }
func (r *fakeRepo) Evaluate(context.Context, string) error             { return nil }
func (r *fakeRepo) List(context.Context, string, int) ([]Alert, error) { return nil, nil }
func (r *fakeRepo) Delivery(context.Context, string, string) (Delivery, error) {
	return r.delivery, nil
}
func (r *fakeRepo) MarkDelivered(context.Context, string, string) error {
	r.delivered = true
	return nil
}
func (r *fakeRepo) MarkFailed(context.Context, string, string, string) error {
	r.failed = true
	return nil
}

func TestWebhookHandlerAttemptsDelivery(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true; w.WriteHeader(http.StatusNoContent) }))
	defer server.Close()
	repo := &fakeRepo{delivery: Delivery{Alert: Alert{ID: "alert", TenantID: "tenant", Threshold: 70}, WebhookURL: server.URL}}
	payload, _ := json.Marshal(map[string]string{"alert_id": "alert"})
	service := NewService(repo, &http.Client{Timeout: time.Second})
	if err := service.WebhookHandler(context.Background(), jobs.Job{TenantID: "tenant", Payload: payload}); err != nil {
		t.Fatal(err)
	}
	if !called || !repo.delivered || repo.failed {
		t.Fatalf("called=%v delivered=%v failed=%v", called, repo.delivered, repo.failed)
	}
}

func TestPolicyValidation(t *testing.T) {
	service := NewService(&fakeRepo{}, nil)
	if err := service.SetPolicy(context.Background(), Policy{TenantID: "t", Thresholds: []int16{70, 70}, CooldownSeconds: 1, Enabled: true}); err == nil {
		t.Fatal("expected duplicate threshold rejection")
	}
}
