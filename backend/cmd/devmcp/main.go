package main

import (
	"encoding/json"
	"log"
	"net/http"
)

// Local Demo MCP stub for marketplace health checks and invoke smoke.
// Listen: 127.0.0.1:18100  Health: GET /health  Invoke: POST /
func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("X-MCP-Version", "1.0-local")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		in, out, cost := int64(3), int64(2), int64(1)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"jsonrpc": "2.0",
			"id":      1,
			"result": map[string]any{
				"content": []map[string]string{{"type": "text", "text": "devmcp echo ok"}},
			},
			"usage": map[string]any{
				"input_tokens":  in,
				"output_tokens": out,
				"cost_micros":   cost,
			},
		})
	})
	addr := "127.0.0.1:18100"
	log.Printf("devmcp listening on http://%s (GET /health, POST /)", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
