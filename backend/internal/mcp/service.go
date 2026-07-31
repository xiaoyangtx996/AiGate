package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

const HealthJobType = "mcp.health_check"

var (
	ErrForbidden = errors.New("MCP invocation is not authorized")
	ErrNotFound  = errors.New("MCP asset not found")
)

type Cipher interface {
	Encrypt(string) (string, error)
	Decrypt(string) (string, error)
}
type Access interface {
	HasProjectAccess(context.Context, string, string, string) (bool, error)
}
type Auditor interface {
	Append(context.Context, audit.Event) error
}
type Asset struct {
	ID                  string `json:"id"`
	TenantID            string `json:"tenant_id"`
	Name                string `json:"name"`
	Source              string `json:"source"`
	MarketplaceID       string `json:"marketplace_id,omitempty"`
	Version             string `json:"version"`
	HealthStatus        string `json:"health_status"`
	ConsecutiveFailures int    `json:"consecutive_failures"`
	Active              bool   `json:"active"`
	EncryptedEndpoint   string `json:"-"`
	EncryptedCredential string `json:"-"`
}
type MarketplaceEntry struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	Version          string `json:"version"`
	EndpointTemplate string `json:"-"`
}
type Grant struct{ TenantID, AssetID, ProjectID, AgentID, GrantedBy string }
type Usage struct {
	ID, TenantID, TraceID, AssetID, ProjectID, AgentID, UserID, ToolName string
	InputTokens, OutputTokens, CostMicros                                *int64
	StatusCode                                                           int
	DurationMS                                                           int64
}
type Repository interface {
	CreateAsset(context.Context, Asset) error
	ListAssets(context.Context, string) ([]Asset, error)
	GetAsset(context.Context, string, string) (Asset, error)
	ListMarketplace(context.Context) ([]MarketplaceEntry, error)
	GetMarketplace(context.Context, string) (MarketplaceEntry, error)
	Grant(context.Context, Grant) error
	Authorized(context.Context, string, string, string, string) (bool, error)
	WriteUsage(context.Context, Usage) error
	// RecordHealth updates consecutive failure state. retry=true means the worker should fail the job so Claim/Fail retries can accumulate toward unhealthy.
	RecordHealth(context.Context, string, string, bool, string, string) (alerted bool, retry bool, err error)
}
type Service struct {
	repo   Repository
	access Access
	cipher Cipher
	queue  jobs.Queue
	audit  Auditor
	client *http.Client
}

func NewService(repo Repository, access Access, cipher Cipher, queue jobs.Queue, auditor Auditor, client *http.Client) *Service {
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	return &Service{repo: repo, access: access, cipher: cipher, queue: queue, audit: auditor, client: client}
}

func (s *Service) Register(ctx context.Context, tenantID, name, endpoint, credential, version string) (Asset, error) {
	name = strings.TrimSpace(name)
	endpoint = strings.TrimSpace(endpoint)
	if name == "" || !validEndpoint(endpoint) {
		return Asset{}, errors.New("name and http(s) endpoint are required")
	}
	id, err := domain.NewID()
	if err != nil {
		return Asset{}, err
	}
	encURL, err := s.cipher.Encrypt(endpoint)
	if err != nil {
		return Asset{}, err
	}
	encCred := ""
	if credential != "" {
		encCred, err = s.cipher.Encrypt(credential)
		if err != nil {
			return Asset{}, err
		}
	}
	a := Asset{ID: id, TenantID: tenantID, Name: name, Source: "private", Version: version, HealthStatus: "unknown", Active: true, EncryptedEndpoint: encURL, EncryptedCredential: encCred}
	if err = s.repo.CreateAsset(ctx, a); err != nil {
		return Asset{}, err
	}
	if err := s.enqueueHealth(ctx, a); err != nil {
		return a, err
	}
	return a, nil
}
func (s *Service) Install(ctx context.Context, tenantID, entryID, name string) (Asset, error) {
	e, err := s.repo.GetMarketplace(ctx, entryID)
	if err != nil {
		return Asset{}, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		name = e.Name
	}
	if !validEndpoint(e.EndpointTemplate) {
		return Asset{}, errors.New("marketplace endpoint template must be http(s)")
	}
	id, err := domain.NewID()
	if err != nil {
		return Asset{}, err
	}
	endpoint, err := s.cipher.Encrypt(e.EndpointTemplate)
	if err != nil {
		return Asset{}, err
	}
	a := Asset{ID: id, TenantID: tenantID, Name: name, Source: "marketplace", MarketplaceID: e.ID, Version: e.Version, HealthStatus: "unknown", Active: true, EncryptedEndpoint: endpoint}
	if err := s.repo.CreateAsset(ctx, a); err != nil {
		return Asset{}, err
	}
	if err := s.enqueueHealth(ctx, a); err != nil {
		return a, err
	}
	return a, nil
}
func (s *Service) List(ctx context.Context, tenant string) ([]Asset, error) {
	return s.repo.ListAssets(ctx, tenant)
}
func (s *Service) Marketplace(ctx context.Context) ([]MarketplaceEntry, error) {
	return s.repo.ListMarketplace(ctx)
}
func (s *Service) Grant(ctx context.Context, g Grant) error {
	g.AgentID = strings.TrimSpace(g.AgentID)
	return s.repo.Grant(ctx, g)
}

func (s *Service) Authorized(ctx context.Context, tenantID, assetID, projectID, agentID string) (bool, error) {
	return s.repo.Authorized(ctx, tenantID, assetID, projectID, strings.TrimSpace(agentID))
}

type Invocation struct {
	TenantID, ProjectID, AgentID, UserID, AssetID, ToolName string
	Body                                                    json.RawMessage
}
type InvokeResult struct {
	StatusCode int
	Body       []byte
	TraceID    string
}

func (s *Service) Invoke(ctx context.Context, in Invocation) (InvokeResult, error) {
	member, err := s.access.HasProjectAccess(ctx, in.TenantID, in.ProjectID, in.UserID)
	if err != nil {
		return InvokeResult{}, err
	}
	granted, err := s.repo.Authorized(ctx, in.TenantID, in.AssetID, in.ProjectID, in.AgentID)
	if err != nil {
		return InvokeResult{}, err
	}
	if !member || !granted {
		return InvokeResult{}, ErrForbidden
	}
	asset, err := s.repo.GetAsset(ctx, in.TenantID, in.AssetID)
	if err != nil {
		return InvokeResult{}, err
	}
	endpoint, err := s.cipher.Decrypt(asset.EncryptedEndpoint)
	if err != nil {
		return InvokeResult{}, err
	}
	credential := ""
	if asset.EncryptedCredential != "" {
		credential, err = s.cipher.Decrypt(asset.EncryptedCredential)
		if err != nil {
			return InvokeResult{}, err
		}
	}
	trace, err := domain.NewID()
	if err != nil {
		return InvokeResult{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(in.Body))
	if err != nil {
		return InvokeResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Trace-ID", trace)
	if credential != "" {
		req.Header.Set("Authorization", "Bearer "+credential)
	}
	start := time.Now()
	resp, callErr := s.client.Do(req)
	status := http.StatusBadGateway
	var body []byte
	if callErr == nil {
		defer resp.Body.Close()
		status = resp.StatusCode
		body, _ = io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	}
	usage := parseUsage(body)
	if err := s.repo.WriteUsage(ctx, Usage{TenantID: in.TenantID, TraceID: trace, AssetID: in.AssetID, ProjectID: in.ProjectID, AgentID: in.AgentID, UserID: in.UserID, ToolName: in.ToolName, InputTokens: usage.InputTokens, OutputTokens: usage.OutputTokens, CostMicros: usage.CostMicros, StatusCode: status, DurationMS: time.Since(start).Milliseconds()}); err != nil {
		return InvokeResult{StatusCode: http.StatusInternalServerError, TraceID: trace}, err
	}
	metadata, _ := json.Marshal(map[string]any{"project_id": in.ProjectID, "agent_id": in.AgentID, "tool_name": in.ToolName, "status_code": status, "input_tokens": usage.InputTokens, "output_tokens": usage.OutputTokens, "cost_micros": usage.CostMicros})
	outcome := "success"
	if status >= 400 {
		outcome = "failure"
	}
	if err := s.audit.Append(ctx, audit.Event{TenantID: in.TenantID, TraceID: trace, EventType: "mcp.tool.invoke", ActorUserID: in.UserID, ResourceType: "mcp_asset", ResourceID: in.AssetID, Outcome: outcome, Metadata: metadata}); err != nil {
		return InvokeResult{StatusCode: http.StatusInternalServerError, TraceID: trace}, err
	}
	if callErr != nil {
		return InvokeResult{StatusCode: status, TraceID: trace}, callErr
	}
	return InvokeResult{StatusCode: status, Body: body, TraceID: trace}, nil
}

type usageFields struct{ InputTokens, OutputTokens, CostMicros *int64 }

func parseUsage(body []byte) usageFields {
	var v struct {
		Usage struct {
			InputTokens  *int64 `json:"input_tokens"`
			OutputTokens *int64 `json:"output_tokens"`
			CostMicros   *int64 `json:"cost_micros"`
		} `json:"usage"`
	}
	_ = json.Unmarshal(body, &v)
	return usageFields{v.Usage.InputTokens, v.Usage.OutputTokens, v.Usage.CostMicros}
}
func validEndpoint(v string) bool {
	v = strings.TrimSpace(v)
	lower := strings.ToLower(v)
	return strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://")
}
func (s *Service) enqueueHealth(ctx context.Context, a Asset) error {
	payload, _ := json.Marshal(map[string]string{"tenant_id": a.TenantID, "asset_id": a.ID})
	return s.queue.Enqueue(ctx, jobs.Job{TenantID: a.TenantID, Type: HealthJobType, Payload: payload, MaxAttempts: 5})
}
