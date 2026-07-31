package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/xiaoyangtx996/AiGate/internal/audit"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

func (s *Service) HealthHandler(ctx context.Context, job jobs.Job) error {
	var p struct {
		TenantID string `json:"tenant_id"`
		AssetID  string `json:"asset_id"`
	}
	if err := json.Unmarshal(job.Payload, &p); err != nil {
		return err
	}
	a, err := s.repo.GetAsset(ctx, p.TenantID, p.AssetID)
	if errors.Is(err, ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	endpoint, err := s.cipher.Decrypt(a.EncryptedEndpoint)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(endpoint, "/")+"/health", nil)
	if err != nil {
		return err
	}
	resp, callErr := s.client.Do(req)
	if resp != nil {
		defer resp.Body.Close()
	}
	healthy := callErr == nil && resp != nil && resp.StatusCode >= 200 && resp.StatusCode < 300
	version := ""
	message := "health request failed"
	if resp != nil {
		version = resp.Header.Get("X-MCP-Version")
		message = resp.Status
	}
	alerted, retry, err := s.repo.RecordHealth(ctx, p.TenantID, p.AssetID, healthy, version, message)
	if err != nil {
		return err
	}
	if alerted {
		meta, _ := json.Marshal(map[string]string{"health": "unhealthy"})
		if err := s.audit.Append(ctx, audit.Event{TenantID: p.TenantID, TraceID: job.ID, EventType: "mcp.health.unhealthy", ResourceType: "mcp_asset", ResourceID: p.AssetID, Outcome: "failure", Metadata: meta}); err != nil {
			return err
		}
	}
	if retry {
		return errors.New(message)
	}
	return nil
}
