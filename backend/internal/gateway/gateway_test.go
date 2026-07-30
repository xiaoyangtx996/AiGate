package gateway

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/apikey"
	"github.com/xiaoyangtx996/AiGate/internal/billing"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/quota"
)

type fakeKeys struct{}

func (fakeKeys) Authenticate(context.Context, string, net.IP) (apikey.Principal, error) {
	return apikey.Principal{KeyID: "k", TenantID: "t", OrganizationID: "o", UserID: "u"}, nil
}

type fakeQuota struct{ exhausted bool }

func (q *fakeQuota) Reserve(context.Context, string, string, string, int64) (quota.Reservation, error) {
	if q.exhausted {
		return quota.Reservation{}, quota.ErrExhausted
	}
	return quota.Reservation{ID: "r", Tokens: 100}, nil
}
func (*fakeQuota) Settle(context.Context, quota.Reservation, int64) error { return nil }
func (*fakeQuota) Cancel(context.Context, quota.Reservation) error        { return nil }

type fakeChannels struct{ url string }

func (f fakeChannels) SetPrice(context.Context, string, string, string, int64, int64) error {
	return nil
}

func (f fakeChannels) Resolve(context.Context, string, string) (channel.Route, error) {
	return channel.Route{BaseURL: f.url, Credential: "upstream-key", UpstreamModel: "mapped", Price: &billing.Price{InputMicrosPerMillion: 2_000_000, OutputMicrosPerMillion: 6_000_000}}, nil
}

type fakeLogs struct{ entries []Log }

func (l *fakeLogs) Write(_ context.Context, e Log) error {
	l.entries = append(l.entries, e)
	return nil
}
func (l *fakeLogs) List(context.Context, LogFilter) ([]LogRecord, error) { return nil, nil }

func TestChatCompletionProxyAndCost(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer upstream-key" {
			t.Error("missing upstream credential")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"x","usage":{"prompt_tokens":1000,"completion_tokens":500,"total_tokens":1500}}`))
	}))
	defer up.Close()
	logs := &fakeLogs{}
	h := &Handler{Keys: fakeKeys{}, Quota: &fakeQuota{}, Channels: fakeChannels{up.URL}, Logs: logs}
	r := httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(`{"model":"public","messages":[],"max_tokens":10}`))
	r.Header.Set("Authorization", "Bearer employee")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	if w.Header().Get("X-Trace-ID") == "" {
		t.Fatal("missing X-Trace-ID")
	}
	if len(logs.entries) != 1 || logs.entries[0].CostMicros == nil || *logs.entries[0].CostMicros != 5000 {
		t.Fatalf("log=%+v", logs.entries)
	}
	if logs.entries[0].TraceID == "" {
		t.Fatal("log missing trace_id")
	}
}

func TestExhaustedQuotaIsBlockedAndLogged(t *testing.T) {
	logs := &fakeLogs{}
	h := &Handler{Keys: fakeKeys{}, Quota: &fakeQuota{exhausted: true}, Channels: fakeChannels{"http://unused"}, Logs: logs}
	r := httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(`{"model":"public","messages":[]}`))
	r.Header.Set("Authorization", "Bearer employee")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 429 || len(logs.entries) != 1 || !logs.entries[0].Blocked || logs.entries[0].ErrorCode != "quota_exhausted" {
		t.Fatalf("status=%d logs=%+v", w.Code, logs.entries)
	}
}

type notConfiguredQuota struct{}

func (notConfiguredQuota) Reserve(context.Context, string, string, string, int64) (quota.Reservation, error) {
	return quota.Reservation{}, quota.ErrNotConfigured
}
func (notConfiguredQuota) Settle(context.Context, quota.Reservation, int64) error { return nil }
func (notConfiguredQuota) Cancel(context.Context, quota.Reservation) error        { return nil }

func TestMissingQuotaIsBlockedAndLogged(t *testing.T) {
	logs := &fakeLogs{}
	h := &Handler{Keys: fakeKeys{}, Quota: notConfiguredQuota{}, Channels: fakeChannels{"http://unused"}, Logs: logs}
	r := httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(`{"model":"public","messages":[]}`))
	r.Header.Set("Authorization", "Bearer employee")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 429 || len(logs.entries) != 1 || !logs.entries[0].Blocked || logs.entries[0].ErrorCode != "quota_not_configured" {
		t.Fatalf("status=%d body=%s logs=%+v", w.Code, w.Body.String(), logs.entries)
	}
}

type settleFailQuota struct{}

func (settleFailQuota) Reserve(context.Context, string, string, string, int64) (quota.Reservation, error) {
	return quota.Reservation{ID: "r", Tokens: 100}, nil
}
func (settleFailQuota) Settle(context.Context, quota.Reservation, int64) error {
	return errors.New("settle boom")
}
func (settleFailQuota) Cancel(context.Context, quota.Reservation) error { return nil }

func TestUpstreamSuccessSurvivesSettleFailure(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"x","usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}`))
	}))
	defer up.Close()
	logs := &fakeLogs{}
	h := &Handler{Keys: fakeKeys{}, Quota: settleFailQuota{}, Channels: fakeChannels{up.URL}, Logs: logs}
	r := httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(`{"model":"public","messages":[],"max_tokens":10}`))
	r.Header.Set("Authorization", "Bearer employee")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	if len(logs.entries) != 1 || logs.entries[0].ErrorCode != "quota_settle_failed" {
		t.Fatalf("logs=%+v", logs.entries)
	}
}

type cancelTrackingQuota struct{ cancelled bool }

func (q *cancelTrackingQuota) Reserve(context.Context, string, string, string, int64) (quota.Reservation, error) {
	return quota.Reservation{ID: "r", Tokens: 100}, nil
}
func (q *cancelTrackingQuota) Settle(context.Context, quota.Reservation, int64) error { return nil }
func (q *cancelTrackingQuota) Cancel(context.Context, quota.Reservation) error {
	q.cancelled = true
	return nil
}

func TestUpstreamErrorCancelsReservation(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(502)
		_, _ = w.Write([]byte(`{"error":"boom"}`))
	}))
	defer up.Close()
	cq := &cancelTrackingQuota{}
	logs := &fakeLogs{}
	h := &Handler{Keys: fakeKeys{}, Quota: cq, Channels: fakeChannels{up.URL}, Logs: logs}
	r := httptest.NewRequest("POST", "/v1/chat/completions", strings.NewReader(`{"model":"public","messages":[],"max_tokens":10}`))
	r.Header.Set("Authorization", "Bearer employee")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 502 || !cq.cancelled {
		t.Fatalf("status=%d cancelled=%v", w.Code, cq.cancelled)
	}
}

func TestDefaultOutputReserve(t *testing.T) {
	input, output := estimate(map[string]any{"messages": []any{}})
	if output != DefaultOutputReserve || DefaultOutputReserve != 256 {
		t.Fatalf("input=%d output=%d want default=%d", input, output, DefaultOutputReserve)
	}
	_, output = estimate(map[string]any{"messages": []any{}, "max_tokens": float64(64)})
	if output != 64 {
		t.Fatalf("max_tokens override failed: %d", output)
	}
}

func TestClaudeMessagesCompatibility(t *testing.T) {
	var gotBody map[string]any
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"msg_1","choices":[{"message":{"role":"assistant","content":"hi"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}`))
	}))
	defer up.Close()
	logs := &fakeLogs{}
	h := &Handler{Keys: fakeKeys{}, Quota: &fakeQuota{}, Channels: fakeChannels{up.URL}, Logs: logs}
	r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"public","system":"be brief","max_tokens":32,"messages":[{"role":"user","content":"hi"}]}`))
	r.Header.Set("Authorization", "Bearer employee")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	msgs, _ := gotBody["messages"].([]any)
	if len(msgs) < 2 {
		t.Fatalf("expected system+user messages upstream, got %#v", gotBody["messages"])
	}
	var out map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out["type"] != "message" || out["role"] != "assistant" {
		t.Fatalf("claude response shape=%+v", out)
	}
}
