package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestTokenAndUnspoofableRecordID(t *testing.T) {
	token := strings.Repeat("x", 32)
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })
	h := RequestID(Authenticate(token, next))
	for _, auth := range []string{"", "Bearer wrong", "Bearer " + token} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1/analyses", nil)
		req.Header.Set("Authorization", auth)
		req.Header.Set("X-Request-ID", "overwrite-history")
		h.ServeHTTP(rec, req)
		want := 401
		if auth == "Bearer "+token {
			want = 204
		}
		if rec.Code != want {
			t.Fatalf("auth status %d", rec.Code)
		}
		if rec.Header().Get("X-Request-ID") == "overwrite-history" {
			t.Fatal("caller controls record ID")
		}
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/health/live", nil))
	if rec.Code != 204 {
		t.Fatal("health requires token")
	}
}
func TestRateLimitAndConcurrency(t *testing.T) {
	h := RateLimit(1, 1, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) }))
	for i, want := range []int{204, 429} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/v1/locations", nil))
		if rec.Code != want {
			t.Fatalf("%d got %d", i, rec.Code)
		}
	}
	entered, release, done := make(chan struct{}), make(chan struct{}), make(chan struct{})
	limited := LimitConcurrent(1, time.Second, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { close(entered); <-release; w.WriteHeader(204) }))
	go func() {
		limited.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/api/v1/locations", nil))
		close(done)
	}()
	<-entered
	rec := httptest.NewRecorder()
	limited.ServeHTTP(rec, httptest.NewRequest("GET", "/api/v1/locations", nil))
	if rec.Code != 429 {
		t.Fatal("concurrency not limited")
	}
	close(release)
	<-done
}
