package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

type accessStub bool

func (a accessStub) HasProjectAccess(context.Context, string, string, string) (bool, error) {
	return bool(a), nil
}

type queueStub struct{ jobs []jobs.Job }

func (q *queueStub) Enqueue(_ context.Context, j jobs.Job) error {
	q.jobs = append(q.jobs, j)
	return nil
}
func (*queueStub) Claim(context.Context, string, time.Duration, []string) (jobs.Job, error) {
	return jobs.Job{}, jobs.ErrNoJob
}
func (*queueStub) Complete(context.Context, string, string) error              { return nil }
func (*queueStub) Fail(context.Context, jobs.Job, string, time.Duration) error { return nil }

type auditStub struct{ events []audit.Event }

func (a *auditStub) Append(_ context.Context, e audit.Event) error {
	a.events = append(a.events, e)
	return nil
}

type repoStub struct {
	asset       Asset
	marketplace MarketplaceEntry
	granted     bool
	usage       []Usage
	failures    int
	alerted     bool
}

func (r *repoStub) CreateAsset(_ context.Context, a Asset) error        { r.asset = a; return nil }
func (r *repoStub) ListAssets(context.Context, string) ([]Asset, error) { return []Asset{r.asset}, nil }
func (r *repoStub) GetAsset(context.Context, string, string) (Asset, error) {
	if r.asset.ID == "" {
		return Asset{}, ErrNotFound
	}
	return r.asset, nil
}
func (r *repoStub) ListMarketplace(context.Context) ([]MarketplaceEntry, error) {
	return []MarketplaceEntry{r.marketplace}, nil
}
func (r *repoStub) GetMarketplace(context.Context, string) (MarketplaceEntry, error) {
	return r.marketplace, nil
}
func (r *repoStub) Grant(context.Context, Grant) error { r.granted = true; return nil }
func (r *repoStub) Authorized(context.Context, string, string, string, string) (bool, error) {
	return r.granted, nil
}
func (r *repoStub) WriteUsage(_ context.Context, u Usage) error {
	r.usage = append(r.usage, u)
	return nil
}
func (r *repoStub) RecordHealth(_ context.Context, _, _ string, healthy bool, version, message string) (bool, bool, error) {
	if healthy {
		r.failures = 0
		return false, false, nil
	}
	r.failures++
	if r.failures >= 3 && !r.alerted {
		r.alerted = true
		return true, false, nil
	}
	if r.failures >= 3 {
		return false, false, nil
	}
	return false, true, nil
}

func testCipher(t *testing.T) *channel.Cipher {
	c, err := channel.NewCipher([]byte("01234567890123456789012345678901"))
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestPrivateRegistryHidesEndpointAndQueuesHealth(t *testing.T) {
	repo := &repoStub{}
	q := &queueStub{}
	svc := NewService(repo, accessStub(true), testCipher(t), q, &auditStub{}, nil)
	asset, err := svc.Register(context.Background(), "tenant", "private", "https://private.invalid/mcp", "secret", "v1")
	if err != nil {
		t.Fatal(err)
	}
	encoded, _ := json.Marshal(asset)
	if string(encoded) == "" || strings.Contains(string(encoded), "private.invalid") || strings.Contains(string(encoded), "secret") {
		t.Fatalf("leaked asset: %s", encoded)
	}
	if len(q.jobs) != 1 || q.jobs[0].Type != HealthJobType {
		t.Fatalf("jobs=%+v", q.jobs)
	}
}

func TestMarketplaceInstallCreatesTenantAsset(t *testing.T) {
	repo := &repoStub{marketplace: MarketplaceEntry{ID: "public", Name: "Public", EndpointTemplate: "https://public.invalid/mcp", Version: "1"}}
	q := &queueStub{}
	asset, err := NewService(repo, accessStub(true), testCipher(t), q, &auditStub{}, nil).Install(context.Background(), "tenant", "public", "")
	if err != nil {
		t.Fatal(err)
	}
	if asset.Source != "marketplace" || asset.MarketplaceID != "public" || len(q.jobs) != 1 {
		t.Fatalf("asset=%+v jobs=%d", asset, len(q.jobs))
	}
}

func TestInvokeRequiresMembershipAndGrant(t *testing.T) {
	repo := &repoStub{}
	svc := NewService(repo, accessStub(false), testCipher(t), &queueStub{}, &auditStub{}, nil)
	_, err := svc.Invoke(context.Background(), Invocation{TenantID: "t", ProjectID: "p", AssetID: "a", UserID: "u"})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("got %v", err)
	}
}

func TestAuthorizedInvokeBrokersCredentialMetersAndAudits(t *testing.T) {
	var authHeader string
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"result":{},"usage":{"input_tokens":2,"output_tokens":3,"cost_micros":7}}`))
	}))
	defer up.Close()
	c := testCipher(t)
	endpoint, _ := c.Encrypt(up.URL)
	credential, _ := c.Encrypt("provider-secret")
	repo := &repoStub{asset: Asset{ID: "a", TenantID: "t", Active: true, EncryptedEndpoint: endpoint, EncryptedCredential: credential}, granted: true}
	aud := &auditStub{}
	svc := NewService(repo, accessStub(true), c, &queueStub{}, aud, up.Client())
	result, err := svc.Invoke(context.Background(), Invocation{TenantID: "t", ProjectID: "p", AssetID: "a", UserID: "u", ToolName: "search", Body: json.RawMessage(`{"method":"tools/call"}`)})
	if err != nil {
		t.Fatal(err)
	}
	if authHeader != "Bearer provider-secret" || result.TraceID == "" || len(repo.usage) != 1 || repo.usage[0].CostMicros == nil || *repo.usage[0].CostMicros != 7 || len(aud.events) != 1 {
		t.Fatalf("auth=%q result=%+v usage=%+v audit=%+v", authHeader, result, repo.usage, aud.events)
	}
}

func TestHealthMarksUnhealthyAfterThreeFailures(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Error(w, "down", 500) }))
	defer up.Close()
	c := testCipher(t)
	endpoint, _ := c.Encrypt(up.URL)
	repo := &repoStub{asset: Asset{ID: "a", TenantID: "t", EncryptedEndpoint: endpoint}}
	aud := &auditStub{}
	svc := NewService(repo, accessStub(true), c, &queueStub{}, aud, up.Client())
	payload := json.RawMessage(`{"tenant_id":"t","asset_id":"a"}`)
	for i := 0; i < 3; i++ {
		err := svc.HealthHandler(context.Background(), jobs.Job{ID: "trace", TenantID: "t", Payload: payload})
		if i < 2 && err == nil {
			t.Fatalf("attempt %d should retry", i+1)
		}
		if i == 2 && err != nil {
			t.Fatalf("third failure should complete job after alert: %v", err)
		}
	}
	if !repo.alerted || len(aud.events) != 1 || aud.events[0].EventType != "mcp.health.unhealthy" {
		t.Fatalf("alerted=%v audit=%+v", repo.alerted, aud.events)
	}
	if err := svc.HealthHandler(context.Background(), jobs.Job{ID: "trace2", TenantID: "t", Payload: payload}); err != nil {
		t.Fatalf("already unhealthy should not keep failing job: %v", err)
	}
}

func TestInstallTrimsBlankName(t *testing.T) {
	repo := &repoStub{marketplace: MarketplaceEntry{ID: "public", Name: "Public", EndpointTemplate: "https://public.invalid/mcp", Version: "1"}}
	asset, err := NewService(repo, accessStub(true), testCipher(t), &queueStub{}, &auditStub{}, nil).Install(context.Background(), "tenant", "public", "   ")
	if err != nil {
		t.Fatal(err)
	}
	if asset.Name != "Public" {
		t.Fatalf("name=%q", asset.Name)
	}
}

func TestValidEndpointAcceptsHTTPSCase(t *testing.T) {
	if !validEndpoint(" HTTPS://Example.invalid/mcp ") || validEndpoint("ftp://x") || validEndpoint("") {
		t.Fatal("validEndpoint mismatch")
	}
}
