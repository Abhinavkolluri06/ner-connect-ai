package memo

import (
	"context"
	"encoding/json"
	"sync"
	"time"
)

type Metadata struct {
	Status      string    `json:"cache_status"` // "hit", "miss", "stale", "bypass", "unavailable"
	GeneratedAt time.Time `json:"generated_at"`
	AgeSeconds  float64   `json:"age_seconds"`
	Stale       bool      `json:"stale"`
}

// Cache is bounded, TTL-based and returns independent decoded values.
// Errors are never cached and fresh results declare precise metadata.
type Cache[T any] struct {
	mu           sync.Mutex
	entries      map[string]entry
	TTL          time.Duration
	Capacity     int
	ServeStaleOn bool
}

type entry struct {
	value       []byte
	expires     time.Time
	generatedAt time.Time
}

func (c *Cache[T]) Do(ctx context.Context, key string, load func() (T, error)) (T, error) {
	val, _, err := c.DoWithMeta(ctx, key, load)
	return val, err
}

func (c *Cache[T]) DoWithMeta(ctx context.Context, key string, load func() (T, error)) (T, Metadata, error) {
	var zero T
	now := time.Now().UTC()
	if err := ctx.Err(); err != nil {
		return zero, Metadata{Status: "unavailable"}, err
	}
	if c == nil {
		v, err := load()
		return v, Metadata{Status: "bypass", GeneratedAt: now, Stale: false}, err
	}

	c.mu.Lock()
	e, ok := c.entries[key]
	c.mu.Unlock()

	// 1. Fresh cache hit
	if ok && time.Now().Before(e.expires) {
		var v T
		err := json.Unmarshal(e.value, &v)
		if err == nil {
			age := now.Sub(e.generatedAt).Seconds()
			if age < 0 {
				age = 0
			}
			return v, Metadata{
				Status:      "hit",
				GeneratedAt: e.generatedAt,
				AgeSeconds:  age,
				Stale:       false,
			}, nil
		}
	}

	// 2. Fetch fresh value
	v, err := load()
	if err != nil {
		// If upstream load failed but we have an expired entry and stale serving is allowed
		if ok && c.ServeStaleOn {
			var staleVal T
			if unmarshalErr := json.Unmarshal(e.value, &staleVal); unmarshalErr == nil {
				return staleVal, Metadata{
					Status:      "stale",
					GeneratedAt: e.generatedAt,
					AgeSeconds:  now.Sub(e.generatedAt).Seconds(),
					Stale:       true,
				}, nil
			}
		}
		return zero, Metadata{Status: "unavailable"}, err
	}

	if err := ctx.Err(); err != nil {
		return zero, Metadata{Status: "unavailable"}, err
	}

	b, err := json.Marshal(v)
	if err != nil {
		return zero, Metadata{Status: "unavailable"}, err
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.entries == nil {
		c.entries = map[string]entry{}
	}
	capacity := c.Capacity
	if capacity < 1 {
		capacity = 16
	}
	ttl := c.TTL
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	if len(c.entries) >= capacity {
		oldestKey := ""
		oldest := time.Now().Add(100 * 365 * 24 * time.Hour)
		for k, item := range c.entries {
			if item.expires.Before(oldest) {
				oldestKey = k
				oldest = item.expires
			}
		}
		delete(c.entries, oldestKey)
	}

	c.entries[key] = entry{
		value:       b,
		expires:     time.Now().Add(ttl),
		generatedAt: now,
	}

	return v, Metadata{
		Status:      "miss",
		GeneratedAt: now,
		AgeSeconds:  0,
		Stale:       false,
	}, nil
}
