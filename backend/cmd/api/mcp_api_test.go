package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/auth"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
	"github.com/xiaoyangtx996/AiGate/internal/mcp"
)

type mcpAPIRepo struct {
	asset   mcp.Asset
	granted bool
	usages  int
}

func (r *mcpAPIRepo) CreateAsset(_ context.Context, a mcp.Asset) error { r.asset = a; return nil }
func (r *mcpAPIRepo) ListAssets(context.Context, string) ([]mcp.Asset, error) {
	return []mcp.Asset{r.asset}, nil
}
func (r *mcpAPIRepo) GetAsset(context.Context, string, string) (mcp.Asset, error) {
	if r.asset.ID == "" {
		return mcp.Asset{}, mcp.ErrNotFound
	}
	return r.asset, nil
}
func (r *mcpAPIRepo) ListMarketplace(context.Context) ([]mcp.MarketplaceEntry, error) {
	return []mcp.MarketplaceEntry{{ID: "public", Name: "Public"}}, nil
}
func (r *mcpAPIRepo) GetMarketplace(context.Context, string) (mcp.MarketplaceEntry, error) {
	return mcp.MarketplaceEntry{ID: "public", Name: "Public", EndpointTemplate: "https://example.invalid/mcp"}, nil
}
func (r *mcpAPIRepo) Grant(context.Context, mcp.Grant) error {
	if r.asset.ID == "" {
		return mcp.ErrNotFound
	}
	r.granted = true
	return nil
}
func (r *mcpAPIRepo) Authorized(context.Context, string, string, string, string) (bool, error) {
	return r.granted, nil
}
func (r *mcpAPIRepo) WriteUsage(context.Context, mcp.Usage) error { r.usages++; return nil }
func (r *mcpAPIRepo) RecordHealth(context.Context, string, string, bool, string, string) (bool, bool, error) {
	return false, false, nil
}

type mcpAPIAccess struct{}

func (mcpAPIAccess) HasProjectAccess(context.Context, string, string, string) (bool, error) {
	return true, nil
}

type mcpAPIQueue struct{}

func (mcpAPIQueue) Enqueue(context.Context, jobs.Job) error { return nil }
func (mcpAPIQueue) Claim(context.Context, string, time.Duration, []string) (jobs.Job, error) {
	return jobs.Job{}, jobs.ErrNoJob
}
func (mcpAPIQueue) Complete(context.Context, string, string) error              { return nil }
func (mcpAPIQueue) Fail(context.Context, jobs.Job, string, time.Duration) error { return nil }

type mcpAPIAudit struct{ count int }

func (a *mcpAPIAudit) Append(context.Context, audit.Event) error { a.count++; return nil }

func TestMCPHTTPAuthorizationProxyAndNoEndpointLeak(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]bool{"ok": true}})
	}))
	defer up.Close()
	cipher, _ := channel.NewCipher([]byte("01234567890123456789012345678901"))
	repo := &mcpAPIRepo{}
	aud := &mcpAPIAudit{}
	service := mcp.NewService(repo, mcpAPIAccess{}, cipher, mcpAPIQueue{}, aud, up.Client())
	tokens, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: tokens, mcp: service}
	token := testToken(t, tokens, auth.Identity{TenantID: "tenant", UserID: "user", Roles: []string{domain.RolePlatformAdmin}})
	request := func(method, path, body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Authorization", "Bearer "+token)
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		app.handler().ServeHTTP(w, r)
		return w
	}
	w := request(http.MethodPost, "/v1/mcp/assets", `{"name":"private","endpoint":"`+up.URL+`","credential":"secret","version":"1"}`)
	if w.Code != http.StatusCreated || strings.Contains(w.Body.String(), up.URL) || strings.Contains(w.Body.String(), "secret") {
		t.Fatalf("register status=%d body=%s", w.Code, w.Body.String())
	}
	var asset mcp.Asset
	_ = json.Unmarshal(w.Body.Bytes(), &asset)
	w = request(http.MethodPost, "/v1/projects/project/mcp/"+asset.ID+"/invoke", `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"echo"}}`)
	if w.Code != http.StatusForbidden {
		t.Fatalf("unauthorized status=%d", w.Code)
	}
	w = request(http.MethodPut, "/v1/projects/project/mcp/"+asset.ID+"/grants", `{"agent_id":""}`)
	if w.Code != http.StatusNoContent {
		t.Fatalf("grant status=%d body=%s", w.Code, w.Body.String())
	}
	w = request(http.MethodPost, "/v1/projects/project/mcp/"+asset.ID+"/invoke", `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"echo"}}`)
	if w.Code != http.StatusOK || repo.usages != 1 || aud.count != 1 || w.Header().Get("X-Trace-ID") == "" {
		t.Fatalf("invoke status=%d usages=%d audits=%d", w.Code, repo.usages, aud.count)
	}
}

func TestMCPGrantNotFound(t *testing.T) {
	cipher, _ := channel.NewCipher([]byte("01234567890123456789012345678901"))
	service := mcp.NewService(&mcpAPIRepo{}, mcpAPIAccess{}, cipher, mcpAPIQueue{}, &mcpAPIAudit{}, nil)
	tokens, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: tokens, mcp: service}
	token := testToken(t, tokens, auth.Identity{TenantID: "tenant", UserID: "user", Roles: []string{domain.RolePlatformAdmin}})
	r := httptest.NewRequest(http.MethodPut, "/v1/projects/project/mcp/00000000-0000-0000-0000-000000000099/grants", strings.NewReader(`{"agent_id":""}`))
	r.Header.Set("Authorization", "Bearer "+token)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	app.handler().ServeHTTP(w, r)
	if w.Code != http.StatusNotFound {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}

func TestMCPInvokeNotFound(t *testing.T) {
	cipher, _ := channel.NewCipher([]byte("01234567890123456789012345678901"))
	repo := &mcpAPIRepo{granted: true}
	service := mcp.NewService(repo, mcpAPIAccess{}, cipher, mcpAPIQueue{}, &mcpAPIAudit{}, nil)
	tokens, _ := auth.NewTokenManager("01234567890123456789012345678901")
	app := &api{tokens: tokens, mcp: service}
	token := testToken(t, tokens, auth.Identity{TenantID: "tenant", UserID: "user", Roles: []string{domain.RolePlatformAdmin}})
	r := httptest.NewRequest(http.MethodPost, "/v1/projects/project/mcp/00000000-0000-0000-0000-000000000099/invoke", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"echo"}}`))
	r.Header.Set("Authorization", "Bearer "+token)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	app.handler().ServeHTTP(w, r)
	if w.Code != http.StatusNotFound {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}
