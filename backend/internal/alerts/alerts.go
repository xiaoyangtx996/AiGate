package alerts

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

var ErrInvalidPolicy = errors.New("invalid alert policy")

var DefaultThresholds = []int16{70, 90, 100}

type Policy struct {
	TenantID        string    `json:"tenant_id"`
	Thresholds      []int16   `json:"thresholds"`
	WebhookURL      string    `json:"webhook_url"`
	CooldownSeconds int       `json:"cooldown_seconds"`
	Enabled         bool      `json:"enabled"`
	CreatedAt       time.Time `json:"created_at,omitempty"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
}

type Alert struct {
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	ScopeType      string    `json:"scope_type"`
	ScopeID        string    `json:"scope_id"`
	DeliveryStatus string    `json:"delivery_status"`
	LastError      string    `json:"last_error,omitempty"`
	Threshold      int16     `json:"threshold"`
	UsagePercent   float64   `json:"usage_percent"`
	UsedTokens     int64     `json:"used_tokens"`
	LimitTokens    int64     `json:"limit_tokens"`
	CreatedAt      time.Time `json:"created_at"`
}

type Delivery struct {
	Alert      Alert  `json:"alert"`
	WebhookURL string `json:"-"`
}

type Repository interface {
	GetPolicy(context.Context, string) (Policy, error)
	SetPolicy(context.Context, Policy) error
	Evaluate(context.Context, string) error
	List(context.Context, string, int) ([]Alert, error)
	Delivery(context.Context, string, string) (Delivery, error)
	MarkDelivered(context.Context, string, string) error
	MarkFailed(context.Context, string, string, string) error
}

type Service struct {
	repo   Repository
	client *http.Client
}

func NewService(repo Repository, client *http.Client) *Service {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	return &Service{repo: repo, client: client}
}

func (s *Service) GetPolicy(ctx context.Context, tenantID string) (Policy, error) {
	return s.repo.GetPolicy(ctx, tenantID)
}
func (s *Service) SetPolicy(ctx context.Context, policy Policy) error {
	if policy.TenantID == "" || policy.CooldownSeconds <= 0 || len(policy.Thresholds) == 0 {
		return ErrInvalidPolicy
	}
	seen := map[int16]bool{}
	for _, threshold := range policy.Thresholds {
		if threshold < 1 || threshold > 100 || seen[threshold] {
			return ErrInvalidPolicy
		}
		seen[threshold] = true
	}
	sort.Slice(policy.Thresholds, func(i, j int) bool { return policy.Thresholds[i] < policy.Thresholds[j] })
	if policy.WebhookURL != "" {
		parsed, err := url.ParseRequestURI(policy.WebhookURL)
		if err != nil || parsed.Scheme != "http" && parsed.Scheme != "https" || parsed.Host == "" {
			return ErrInvalidPolicy
		}
	}
	return s.repo.SetPolicy(ctx, policy)
}
func (s *Service) Evaluate(ctx context.Context, tenantID string) error {
	return s.repo.Evaluate(ctx, tenantID)
}
func (s *Service) List(ctx context.Context, tenantID string, limit int) ([]Alert, error) {
	if tenantID == "" || limit < 1 || limit > 1000 {
		return nil, ErrInvalidPolicy
	}
	return s.repo.List(ctx, tenantID, limit)
}

func (s *Service) WebhookHandler(ctx context.Context, job jobs.Job) error {
	var payload struct {
		AlertID string `json:"alert_id"`
	}
	if err := json.Unmarshal(job.Payload, &payload); err != nil || payload.AlertID == "" {
		return ErrInvalidPolicy
	}
	delivery, err := s.repo.Delivery(ctx, job.TenantID, payload.AlertID)
	if err != nil {
		return err
	}
	body, err := json.Marshal(delivery)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, delivery.WebhookURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-AiGate-Event", "quota.threshold")
	response, err := s.client.Do(req)
	if err == nil {
		defer response.Body.Close()
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			data, _ := io.ReadAll(io.LimitReader(response.Body, 512))
			err = fmt.Errorf("webhook status %d: %s", response.StatusCode, string(data))
		}
	}
	if err != nil {
		_ = s.repo.MarkFailed(ctx, job.TenantID, payload.AlertID, err.Error())
		return err
	}
	return s.repo.MarkDelivered(ctx, job.TenantID, payload.AlertID)
}
