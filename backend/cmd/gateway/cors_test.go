package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGatewayCORSExposesTraceID(t *testing.T) {
	handler := corsMiddleware([]string{"http://localhost:5173"}, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("X-Trace-ID", "trace")
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	request.Header.Set("Origin", "http://localhost:5173")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" || response.Header().Get("Access-Control-Expose-Headers") != "X-Trace-ID" {
		t.Fatalf("headers=%v", response.Header())
	}
}
