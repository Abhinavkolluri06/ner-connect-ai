package memo

import (
	"context"
	"encoding/json"
	"sync"
	"time"
)

// Cache is bounded, TTL-based and returns independent decoded values. Errors
// are never cached and expired results are never served as live data.
type Cache[T any] struct {
	mu       sync.Mutex
	entries  map[string]entry
	TTL      time.Duration
	Capacity int
}
type entry struct {
	value   []byte
	expires time.Time
}

func (c *Cache[T]) Do(ctx context.Context, key string, load func() (T, error)) (T, error) {
	var zero T
	if err := ctx.Err(); err != nil {
		return zero, err
	}
	if c == nil {
		return load()
	}
	c.mu.Lock()
	e, ok := c.entries[key]
	c.mu.Unlock()
	if ok && time.Now().Before(e.expires) {
		var v T
		err := json.Unmarshal(e.value, &v)
		return v, err
	}
	v, err := load()
	if err != nil {
		return zero, err
	}
	if err := ctx.Err(); err != nil {
		return zero, err
	}
	b, err := json.Marshal(v)
	if err != nil {
		return zero, err
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
		for k, e := range c.entries {
			if e.expires.Before(oldest) {
				oldestKey = k
				oldest = e.expires
			}
		}
		delete(c.entries, oldestKey)
	}
	c.entries[key] = entry{value: b, expires: time.Now().Add(ttl)}
	return v, nil
}
