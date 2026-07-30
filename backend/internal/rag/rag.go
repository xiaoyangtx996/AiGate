package rag

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"math"
	"strings"
)

var ErrForbidden = errors.New("project access denied")

type Citation struct {
	DocumentID string `json:"document_id"`
	SpanStart  int    `json:"span_start"`
	SpanEnd    int    `json:"span_end"`
}

type Result struct {
	Content  string   `json:"content"`
	Score    float64  `json:"score"`
	Citation Citation `json:"citation"`
}

type Access interface {
	HasProjectAccess(context.Context, string, string, string) (bool, error)
}

type Repository interface {
	Search(context.Context, string, string, string, []float32, int) ([]Result, error)
}

type Embedder interface {
	Embed(context.Context, string) ([]float32, error)
}

type Service struct {
	access   Access
	repo     Repository
	embedder Embedder
}

func NewService(access Access, repo Repository, embedder Embedder) *Service {
	return &Service{access: access, repo: repo, embedder: embedder}
}

func (s *Service) Search(ctx context.Context, tenantID, projectID, kbID, userID, query string, limit int) ([]Result, error) {
	allowed, err := s.access.HasProjectAccess(ctx, tenantID, projectID, userID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(query) == "" {
		return nil, errors.New("query is required")
	}
	if limit <= 0 || limit > 20 {
		limit = 5
	}
	vector, err := s.embedder.Embed(ctx, query)
	if err != nil {
		return nil, err
	}
	return s.repo.Search(ctx, tenantID, projectID, kbID, vector, limit)
}

// HashEmbedder is a deterministic local fallback so Plan 04 can run without
// external embedding credentials. It can be replaced behind Embedder later.
type HashEmbedder struct{}

func (HashEmbedder) Embed(_ context.Context, text string) ([]float32, error) {
	vector := make([]float32, 384)
	for _, token := range strings.Fields(strings.ToLower(text)) {
		sum := sha256.Sum256([]byte(token))
		for i := 0; i < 6; i++ {
			index := binary.LittleEndian.Uint16(sum[i*2:]) % uint16(len(vector))
			sign := float32(1)
			if sum[16+i]&1 == 1 {
				sign = -1
			}
			vector[index] += sign
		}
	}
	var norm float64
	for _, value := range vector {
		norm += float64(value * value)
	}
	if norm == 0 {
		return vector, nil
	}
	norm = math.Sqrt(norm)
	for i := range vector {
		vector[i] /= float32(norm)
	}
	return vector, nil
}
