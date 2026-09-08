package middleware

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

func respond(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": code, "message": message, "request_id": RequestIDFrom(r)}})
}
func Authenticate(token string, next http.Handler) http.Handler {
	expected := sha256.Sum256([]byte("Bearer " + token))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		if strings.HasPrefix(r.URL.Path, "/api/") && token != "" {
			got := sha256.Sum256([]byte(r.Header.Get("Authorization")))
			if subtle.ConstantTimeCompare(expected[:], got[:]) != 1 {
				w.Header().Set("WWW-Authenticate", "Bearer")
				respond(w, r, 401, "UNAUTHORIZED", "A valid service API token is required.")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
func LimitConcurrent(max int, timeout time.Duration, next http.Handler) http.Handler {
	if max < 1 {
		max = 4
	}
	semaphore := make(chan struct{}, max)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}
		select {
		case semaphore <- struct{}{}:
			defer func() { <-semaphore }()
		default:
			w.Header().Set("Retry-After", "2")
			respond(w, r, 429, "SERVER_BUSY", "Too many concurrent requests. Retry shortly.")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Per-socket-IP token buckets. Forwarded headers are intentionally ignored:
// only a trusted external gateway may implement proxy-aware client limits.
func RateLimit(perMinute, burst int, next http.Handler) http.Handler {
	type bucket struct {
		tokens float64
		last   time.Time
	}
	var mu sync.Mutex
	clients := map[string]bucket{}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		now := time.Now()
		mu.Lock()
		b, ok := clients[ip]
		if !ok {
			if len(clients) >= 4096 {
				for key, entry := range clients {
					if now.Sub(entry.last) > time.Minute {
						delete(clients, key)
					}
				}
			}
			if len(clients) >= 4096 {
				mu.Unlock()
				respond(w, r, 429, "RATE_LIMITED", "Rate limiter capacity reached.")
				return
			}
			b = bucket{tokens: float64(burst), last: now}
		}
		b.tokens += now.Sub(b.last).Seconds() * float64(perMinute) / 60
		if b.tokens > float64(burst) {
			b.tokens = float64(burst)
		}
		b.last = now
		allowed := b.tokens >= 1
		if allowed {
			b.tokens--
		}
		clients[ip] = b
		mu.Unlock()
		if !allowed {
			w.Header().Set("Retry-After", "2")
			respond(w, r, 429, "RATE_LIMITED", "Request rate exceeded.")
			return
		}
		next.ServeHTTP(w, r)
	})
}
