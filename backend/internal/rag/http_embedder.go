package rag

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// EmbedderConfig configures an OpenAI-compatible embeddings HTTP client.
// When BaseURL is empty, NewEmbedder returns HashEmbedder for offline smoke.
type EmbedderConfig struct {
	BaseURL    string
	APIKey     string
	Model      string
	Dimensions int
	Client     *http.Client
}

func NewEmbedder(cfg EmbedderConfig) Embedder {
	if strings.TrimSpace(cfg.BaseURL) == "" {
		return HashEmbedder{}
	}
	if cfg.Model == "" {
		cfg.Model = "text-embedding-3-small"
	}
	if cfg.Dimensions <= 0 {
		cfg.Dimensions = 384
	}
	if cfg.Client == nil {
		cfg.Client = &http.Client{Timeout: 30 * time.Second}
	}
	return HTTPEmbedder{cfg: cfg}
}

type HTTPEmbedder struct{ cfg EmbedderConfig }

type embeddingRequest struct {
	Model      string `json:"model"`
	Input      string `json:"input"`
	Dimensions int    `json:"dimensions,omitempty"`
}

type embeddingResponse struct {
	Data []struct {
		Embedding []float64 `json:"embedding"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (h HTTPEmbedder) Embed(ctx context.Context, text string) ([]float32, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		text = " "
	}
	body, err := json.Marshal(embeddingRequest{Model: h.cfg.Model, Input: text, Dimensions: h.cfg.Dimensions})
	if err != nil {
		return nil, err
	}
	url := strings.TrimRight(h.cfg.BaseURL, "/") + "/embeddings"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if h.cfg.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+h.cfg.APIKey)
	}
	resp, err := h.cfg.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var parsed embeddingResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, fmt.Errorf("embedding decode: %w", err)
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		return nil, errors.New(parsed.Error.Message)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("embedding status %d: %s", resp.StatusCode, string(raw))
	}
	if len(parsed.Data) == 0 || len(parsed.Data[0].Embedding) == 0 {
		return nil, errors.New("embedding response empty")
	}
	src := parsed.Data[0].Embedding
	out := make([]float32, h.cfg.Dimensions)
	n := len(src)
	if n > h.cfg.Dimensions {
		n = h.cfg.Dimensions
	}
	for i := 0; i < n; i++ {
		out[i] = float32(src[i])
	}
	return out, nil
}
