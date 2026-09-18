package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
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

func TestSupabaseJWTSignatureAndClaims(t *testing.T) {
	secret := "super-secret-supabase-jwt-key-for-test-32bytes!"
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	claims := base64.RawURLEncoding.EncodeToString([]byte(`{"sub":"user-uuid-123","iss":"https://xyz.supabase.co/auth/v1","aud":"authenticated","exp":4102444800}`))
	unsigned := header + "." + claims

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(unsigned))
	validSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	validToken := unsigned + "." + validSig

	// 1. Valid token with matching secret, issuer, audience
	uid, expired, ok := ValidateSupabaseJWT(validToken, secret, "https://xyz.supabase.co/auth/v1", "authenticated")
	if !ok || expired || uid != "user-uuid-123" {
		t.Fatalf("expected valid token, got uid=%s, expired=%v, ok=%v", uid, expired, ok)
	}

	// 2. Tampered signature
	_, _, ok = ValidateSupabaseJWT(unsigned+".invalidsignature", secret, "", "")
	if ok {
		t.Fatal("expected signature mismatch rejection")
	}

	// 3. Wrong secret
	_, _, ok = ValidateSupabaseJWT(validToken, "different-wrong-secret", "", "")
	if ok {
		t.Fatal("expected wrong secret rejection")
	}

	// 4. Algorithm none attack
	noneHeader := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none","typ":"JWT"}`))
	noneToken := noneHeader + "." + claims + "."
	_, _, ok = ValidateSupabaseJWT(noneToken, "", "", "")
	if ok {
		t.Fatal("expected algorithm none rejection")
	}

	// 5. Wrong audience
	_, _, ok = ValidateSupabaseJWT(validToken, secret, "", "admin-only")
	if ok {
		t.Fatal("expected wrong audience rejection")
	}

	// 6. Wrong issuer
	_, _, ok = ValidateSupabaseJWT(validToken, secret, "https://wrong.supabase.co", "")
	if ok {
		t.Fatal("expected wrong issuer rejection")
	}

	// 7. Expired token
	pastClaims := base64.RawURLEncoding.EncodeToString([]byte(`{"sub":"user-uuid-123","iss":"https://xyz.supabase.co/auth/v1","aud":"authenticated","exp":1000}`))
	pastUnsigned := header + "." + pastClaims
	mac2 := hmac.New(sha256.New, []byte(secret))
	mac2.Write([]byte(pastUnsigned))
	pastSig := base64.RawURLEncoding.EncodeToString(mac2.Sum(nil))
	pastToken := pastUnsigned + "." + pastSig
	uid, expired, ok = ValidateSupabaseJWT(pastToken, secret, "", "")
	if !expired || ok {
		t.Fatalf("expected expired=true, ok=false, got expired=%v, ok=%v", expired, ok)
	}
}
