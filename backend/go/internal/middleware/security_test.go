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

func TestUserAuthenticationAndJWT(t *testing.T) {
	serviceToken := strings.Repeat("s", 32)
	var capturedUser string
	handler := Authenticate(serviceToken, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUser = UserIDFrom(r)
		w.WriteHeader(200)
	}))

	// Case 1: Service token with X-User-ID
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/analyses", nil)
	req.Header.Set("Authorization", "Bearer "+serviceToken)
	req.Header.Set("X-User-ID", "user-alice-123")
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || capturedUser != "user-alice-123" {
		t.Fatalf("expected user-alice-123, got code %d user %s", rec.Code, capturedUser)
	}

	// Case 2: Valid unexpired JWT
	// Header: {"alg":"HS256","typ":"JWT"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
	// Payload with future exp: {"sub":"user-bob-456","exp":4102444800} -> eyJzdWIiOiJ1c2VyLWJvYi00NTYiLCJleHAiOjQxMDI0NDQ4MDB9
	validJWT := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWJvYi00NTYiLCJleHAiOjQxMDI0NDQ4MDB9.dummy-signature"
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/v1/analyses", nil)
	req.Header.Set("Authorization", "Bearer "+validJWT)
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || capturedUser != "user-bob-456" {
		t.Fatalf("expected user-bob-456, got code %d user %s", rec.Code, capturedUser)
	}

	// Case 3: Expired JWT
	// Payload with past exp (1000): {"sub":"user-charlie","exp":1000} -> eyJzdWIiOiJ1c2VyLWNoYXJsaWUiLCJleHAiOjEwMDB9
	expiredJWT := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWNoYXJsaWUiLCJleHAiOjEwMDB9.dummy-sig"
	rec = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/v1/analyses", nil)
	req.Header.Set("Authorization", "Bearer "+expiredJWT)
	handler.ServeHTTP(rec, req)
	if rec.Code != 401 {
		t.Fatalf("expected 401 for expired token, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "TOKEN_EXPIRED") {
		t.Fatalf("expected TOKEN_EXPIRED error code, got %s", rec.Body.String())
	}
}
