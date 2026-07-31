package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/xiaoyangtx996/AiGate/internal/apikey"
	"github.com/xiaoyangtx996/AiGate/internal/billing"
	"github.com/xiaoyangtx996/AiGate/internal/channel"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/quota"
)

// DefaultOutputReserve is used when the client omits max_tokens.
// Kept deliberately lower than a full 1k completion so small pilot quotas remain usable.
const DefaultOutputReserve int64 = 256

type KeyAuthenticator interface {
	Authenticate(context.Context, string, net.IP) (apikey.Principal, error)
}
type Quota interface {
	Reserve(context.Context, string, string, string, int64) (quota.Reservation, error)
	Settle(context.Context, quota.Reservation, int64) error
	Cancel(context.Context, quota.Reservation) error
}
type ChannelResolver interface {
	Resolve(context.Context, string, string) (channel.Route, error)
}
type Logger interface {
	Write(context.Context, Log) error
	List(context.Context, LogFilter) ([]LogRecord, error)
}

type Log struct {
	TraceID, TenantID, OrganizationID, UserID, APIKeyID, ProjectID, Model, ErrorCode string
	InputTokens, OutputTokens, TotalTokens                                           int64
	CostMicros                                                                       *int64
	Estimated, Blocked                                                               bool
	StatusCode                                                                       int
}

// ProjectAccess validates optional X-AiGate-Project-ID attribution headers.
type ProjectAccess interface {
	HasProjectAccess(context.Context, string, string, string) (bool, error)
}

type LogRecord struct {
	ID             string    `json:"id"`
	TraceID        string    `json:"trace_id"`
	TenantID       string    `json:"tenant_id"`
	OrganizationID string    `json:"organization_id"`
	UserID         string    `json:"user_id"`
	APIKeyID       string    `json:"api_key_id,omitempty"`
	ProjectID      string    `json:"project_id"`
	ProjectName    string    `json:"project_name"`
	Model          string    `json:"model"`
	InputTokens    int64     `json:"input_tokens"`
	OutputTokens   int64     `json:"output_tokens"`
	TotalTokens    int64     `json:"total_tokens"`
	CostMicros     *int64    `json:"cost_micros"`
	Estimated      bool      `json:"estimated"`
	Blocked        bool      `json:"blocked"`
	StatusCode     int       `json:"status_code"`
	ErrorCode      string    `json:"error_code"`
	CreatedAt      time.Time `json:"created_at"`
}

type LogFilter struct {
	TenantID string
	UserID   string
	Blocked  *bool
	From     *time.Time
	To       *time.Time
	Limit    int
}

type Handler struct {
	Keys              KeyAuthenticator
	Quota             Quota
	Channels          ChannelResolver
	Logs              Logger
	Projects          ProjectAccess
	Client            *http.Client
	TrustedProxyCIDRs []string
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodGet && (r.URL.Path == "/healthz" || r.URL.Path == "/readyz"):
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	case r.Method == http.MethodPost && r.URL.Path == "/v1/chat/completions":
		h.handleChatCompletions(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/v1/messages":
		h.handleMessages(w, r)
	default:
		writeError(w, http.StatusNotFound, "not_found", "not found")
	}
}

func (h *Handler) handleChatCompletions(w http.ResponseWriter, r *http.Request) {
	h.proxyOpenAI(w, r, false)
}

func (h *Handler) handleMessages(w http.ResponseWriter, r *http.Request) {
	h.proxyOpenAI(w, r, true)
}

func (h *Handler) proxyOpenAI(w http.ResponseWriter, r *http.Request, claudeIn bool) {
	traceID, err := domain.NewID()
	if err != nil {
		writeError(w, 500, "internal_error", "internal error")
		return
	}
	w.Header().Set("X-Trace-ID", traceID)
	principal, err := h.Keys.Authenticate(r.Context(), apikey.Bearer(r), apikey.ClientIP(r, h.TrustedProxyCIDRs))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_api_key", err.Error())
		return
	}
	projectID, projectError := h.authorizedProjectID(r.Context(), r, principal)
	if projectError != "" {
		status := http.StatusBadRequest
		if projectError == "project_forbidden" {
			status = http.StatusForbidden
		}
		writeError(w, status, projectError, "project attribution is invalid or forbidden")
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4<<20))
	if err != nil {
		writeError(w, 400, "invalid_request", "invalid request body")
		return
	}
	var request map[string]any
	if json.Unmarshal(body, &request) != nil {
		writeError(w, 400, "invalid_request", "invalid JSON")
		return
	}
	publicModelName, _ := request["model"].(string)
	if publicModelName == "" {
		writeError(w, 400, "invalid_request", "model is required")
		return
	}
	if stream, _ := request["stream"].(bool); stream {
		writeError(w, 400, "stream_not_supported", "streaming is not enabled in this milestone")
		return
	}
	if claudeIn {
		request, err = claudeToOpenAI(request)
		if err != nil {
			writeError(w, 400, "invalid_request", err.Error())
			return
		}
	}
	route, err := h.Channels.Resolve(r.Context(), principal.TenantID, publicModelName)
	if err != nil {
		h.log(r.Context(), Log{TraceID: traceID, TenantID: principal.TenantID, OrganizationID: principal.OrganizationID, UserID: principal.UserID, APIKeyID: principal.KeyID, ProjectID: projectID, Model: publicModelName, Estimated: true, StatusCode: 502, ErrorCode: "no_route"})
		writeError(w, 502, "no_route", "no upstream route")
		return
	}
	inputEstimate, outputEstimate := estimate(request)
	reserveTokens := inputEstimate + outputEstimate
	reservation, err := h.Quota.Reserve(r.Context(), principal.TenantID, principal.OrganizationID, principal.UserID, reserveTokens)
	if errors.Is(err, quota.ErrExhausted) || errors.Is(err, quota.ErrNotConfigured) {
		code := "quota_exhausted"
		message := "quota exhausted"
		if errors.Is(err, quota.ErrNotConfigured) {
			code = "quota_not_configured"
			message = "tenant/organization/user quota must be configured"
		}
		entry := Log{TraceID: traceID, TenantID: principal.TenantID, OrganizationID: principal.OrganizationID, UserID: principal.UserID, APIKeyID: principal.KeyID, ProjectID: projectID, Model: publicModelName, Estimated: true, Blocked: true, StatusCode: http.StatusTooManyRequests, ErrorCode: code}
		if h.log(r.Context(), entry) != nil {
			writeError(w, 500, "log_failed", "failed to record blocked request")
			return
		}
		writeError(w, http.StatusTooManyRequests, code, message)
		return
	}
	if err != nil {
		writeError(w, 500, "quota_error", "quota precheck failed")
		return
	}
	request["model"] = route.UpstreamModel
	forwardBody, _ := json.Marshal(request)
	upstreamReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, chatURL(route.BaseURL), bytes.NewReader(forwardBody))
	if err != nil {
		_ = h.Quota.Cancel(r.Context(), reservation)
		writeError(w, 500, "internal_error", "internal error")
		return
	}
	upstreamReq.Header.Set("Content-Type", "application/json")
	upstreamReq.Header.Set("Authorization", "Bearer "+route.Credential)
	upstreamReq.Header.Set("X-Trace-ID", traceID)
	client := h.Client
	if client == nil {
		client = &http.Client{Timeout: 2 * time.Minute}
	}
	response, err := client.Do(upstreamReq)
	if err != nil {
		_ = h.Quota.Cancel(r.Context(), reservation)
		h.log(r.Context(), Log{TraceID: traceID, TenantID: principal.TenantID, OrganizationID: principal.OrganizationID, UserID: principal.UserID, APIKeyID: principal.KeyID, ProjectID: projectID, Model: publicModelName, Estimated: true, StatusCode: 502, ErrorCode: "upstream_error"})
		writeError(w, 502, "upstream_error", "upstream request failed")
		return
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 16<<20))
	if err != nil {
		_ = h.Quota.Cancel(r.Context(), reservation)
		writeError(w, 502, "upstream_error", "invalid upstream response")
		return
	}
	input, output, total, usageOK := usage(responseBody)
	if !usageOK {
		input, output, total = inputEstimate, outputEstimate, reserveTokens
	}
	if response.StatusCode >= 200 && response.StatusCode < 300 {
		err = h.Quota.Settle(r.Context(), reservation, total)
	} else {
		err = h.Quota.Cancel(r.Context(), reservation)
	}
	if err != nil {
		// Upstream already ran; avoid turning a successful LLM call into a client retry storm.
		// Leave reservation for later cleanup if settle failed; still return upstream body.
		entry := Log{TraceID: traceID, TenantID: principal.TenantID, OrganizationID: principal.OrganizationID, UserID: principal.UserID, APIKeyID: principal.KeyID, ProjectID: projectID, Model: publicModelName, InputTokens: input, OutputTokens: output, TotalTokens: total, Estimated: true, StatusCode: response.StatusCode, ErrorCode: "quota_settle_failed"}
		_ = h.log(r.Context(), entry)
	} else {
		cost := billing.Calculate(route.Price, input, output)
		estimated := cost.Estimated || !usageOK
		entry := Log{TraceID: traceID, TenantID: principal.TenantID, OrganizationID: principal.OrganizationID, UserID: principal.UserID, APIKeyID: principal.KeyID, ProjectID: projectID, Model: publicModelName, InputTokens: input, OutputTokens: output, TotalTokens: total, CostMicros: cost.Micros, Estimated: estimated, StatusCode: response.StatusCode}
		if response.StatusCode >= 400 {
			entry.ErrorCode = "upstream_error"
		}
		_ = h.log(r.Context(), entry) // best-effort; never hide upstream result behind log failure
	}
	if response.StatusCode >= 200 && response.StatusCode < 300 {
		responseBody = rewritePublicModel(responseBody, publicModelName)
		if claudeIn {
			responseBody = openAIToClaude(responseBody, publicModelName, input, output)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(response.StatusCode)
	_, _ = w.Write(responseBody)
}

func (h *Handler) log(ctx context.Context, entry Log) error {
	if h.Logs == nil {
		return errors.New("logger is required")
	}
	return h.Logs.Write(ctx, entry)
}

func (h *Handler) authorizedProjectID(ctx context.Context, r *http.Request, principal apikey.Principal) (string, string) {
	projectID := strings.TrimSpace(r.Header.Get("X-AiGate-Project-ID"))
	if projectID == "" {
		return "", ""
	}
	var parsed pgtype.UUID
	if err := parsed.Scan(projectID); err != nil || !parsed.Valid {
		return "", "invalid_project_id"
	}
	if h.Projects == nil {
		return "", "project_forbidden"
	}
	ok, err := h.Projects.HasProjectAccess(ctx, principal.TenantID, projectID, principal.UserID)
	if err != nil || !ok {
		return "", "project_forbidden"
	}
	return projectID, ""
}

func chatURL(base string) string {
	base = strings.TrimRight(base, "/")
	if strings.HasSuffix(base, "/v1") {
		return base + "/chat/completions"
	}
	return base + "/v1/chat/completions"
}

func estimate(request map[string]any) (int64, int64) {
	messages, _ := json.Marshal(request["messages"])
	input := int64(len(messages)/4 + 1)
	output := DefaultOutputReserve
	if value, ok := request["max_tokens"].(float64); ok && value > 0 {
		output = int64(value)
	}
	return input, output
}

func usage(body []byte) (int64, int64, int64, bool) {
	var out struct {
		Usage struct {
			Prompt     int64 `json:"prompt_tokens"`
			Completion int64 `json:"completion_tokens"`
			Total      int64 `json:"total_tokens"`
		} `json:"usage"`
	}
	if json.Unmarshal(body, &out) != nil || out.Usage.Total <= 0 {
		return 0, 0, 0, false
	}
	return out.Usage.Prompt, out.Usage.Completion, out.Usage.Total, true
}

func rewritePublicModel(body []byte, model string) []byte {
	var value map[string]any
	if json.Unmarshal(body, &value) != nil {
		return body
	}
	value["model"] = model
	rewritten, err := json.Marshal(value)
	if err != nil {
		return body
	}
	return rewritten
}

func claudeToOpenAI(in map[string]any) (map[string]any, error) {
	out := map[string]any{"model": in["model"], "messages": in["messages"]}
	if maxTokens, ok := in["max_tokens"]; ok {
		out["max_tokens"] = maxTokens
	} else {
		return nil, errors.New("max_tokens is required for /v1/messages")
	}
	if system, ok := in["system"].(string); ok && strings.TrimSpace(system) != "" {
		msgs, _ := out["messages"].([]any)
		out["messages"] = append([]any{map[string]any{"role": "system", "content": system}}, msgs...)
	}
	if temp, ok := in["temperature"]; ok {
		out["temperature"] = temp
	}
	return out, nil
}

func openAIToClaude(body []byte, model string, input, output int64) []byte {
	var openai struct {
		ID      string `json:"id"`
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
	}
	if json.Unmarshal(body, &openai) != nil || len(openai.Choices) == 0 {
		return body
	}
	stop := "end_turn"
	if openai.Choices[0].FinishReason == "length" {
		stop = "max_tokens"
	}
	out := map[string]any{
		"id":            openai.ID,
		"type":          "message",
		"role":          "assistant",
		"model":         model,
		"content":       []map[string]string{{"type": "text", "text": openai.Choices[0].Message.Content}},
		"stop_reason":   stop,
		"stop_sequence": nil,
		"usage":         map[string]int64{"input_tokens": input, "output_tokens": output},
	}
	encoded, err := json.Marshal(out)
	if err != nil {
		return body
	}
	return encoded
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": code, "message": message, "type": "aigate_error"}})
}
