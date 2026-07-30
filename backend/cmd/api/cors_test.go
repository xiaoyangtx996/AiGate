package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	handler := corsMiddleware([]string{"http://localhost:5173"}, next)
	request := httptest.NewRequest(http.MethodOptions, "/v1/users", nil)
	request.Header.Set("Origin", "http://localhost:5173")
	request.Header.Set("Access-Control-Request-Method", http.MethodGet)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusNoContent || response.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Fatalf("status=%d headers=%v", response.Code, response.Header())
	}
}

func TestCORSRejectsUnknownPreflightOrigin(t *testing.T) {
	handler := corsMiddleware([]string{"http://localhost:5173"}, http.NotFoundHandler())
	request := httptest.NewRequest(http.MethodOptions, "/v1/users", nil)
	request.Header.Set("Origin", "https://unexpected.example")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden || response.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("status=%d headers=%v", response.Code, response.Header())
	}
}
