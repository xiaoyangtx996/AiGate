package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

type GatewayClient struct {
	BaseURL string
	Client  *http.Client
}

func (g GatewayClient) Complete(ctx context.Context, key, model, system string, messages []Message) (string, string, error) {
	all := append([]Message{{Role: "system", Content: system}}, messages...)
	body, err := json.Marshal(map[string]any{"model": model, "messages": all, "max_tokens": 512})
	if err != nil {
		return "", "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(g.BaseURL, "/")+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	client := g.Client
	if client == nil {
		client = &http.Client{Timeout: 2 * time.Minute}
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return "", resp.Header.Get("X-Trace-ID"), err
	}
	trace := resp.Header.Get("X-Trace-ID")
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", trace, errors.New("AiGate gateway rejected agent completion")
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if json.Unmarshal(raw, &out) != nil || len(out.Choices) == 0 {
		return "", trace, errors.New("invalid gateway response")
	}
	return out.Choices[0].Message.Content, trace, nil
}
