package rag

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewEmbedderFallsBackToHash(t *testing.T) {
	if _, ok := NewEmbedder(EmbedderConfig{}).(HashEmbedder); !ok {
		t.Fatal("expected HashEmbedder fallback")
	}
}

func TestHTTPEmbedderPostsOpenAICompatiblePayload(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/embeddings" || r.Header.Get("Authorization") != "Bearer sk-test" {
			t.Fatalf("path=%s auth=%s", r.URL.Path, r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"embedding":[0.5,-0.5,0.25]}]}`))
	}))
	defer server.Close()

	vector, err := NewEmbedder(EmbedderConfig{
		BaseURL:    server.URL,
		APIKey:     "sk-test",
		Model:      "text-embedding-3-small",
		Dimensions: 384,
		Client:     server.Client(),
	}).Embed(context.Background(), "hello")
	if err != nil {
		t.Fatal(err)
	}
	if len(vector) != 384 || vector[0] != 0.5 || vector[1] != -0.5 || vector[2] != 0.25 || vector[3] != 0 {
		t.Fatalf("vector=%v", vector[:4])
	}
}
