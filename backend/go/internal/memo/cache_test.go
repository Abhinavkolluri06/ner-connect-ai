package memo

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestCacheIsolationExpiryAndFailure(t *testing.T) {
	c := Cache[[]int]{TTL: time.Minute, Capacity: 1}
	calls := 0
	load := func() ([]int, error) { calls++; return []int{1}, nil }
	a, _ := c.Do(context.Background(), "a", load)
	a[0] = 100
	b, _ := c.Do(context.Background(), "a", load)
	if b[0] != 1 || calls != 1 {
		t.Fatal("cache alias/call mismatch")
	}
	c.mu.Lock()
	c.entries["a"] = entry{expires: time.Now().Add(-time.Second)}
	c.mu.Unlock()
	c.Do(context.Background(), "a", load)
	if calls != 2 {
		t.Fatal("expired value served")
	}
	fail := func() ([]int, error) { calls++; return nil, errors.New("down") }
	c.Do(context.Background(), "b", fail)
	c.Do(context.Background(), "b", fail)
	if calls != 4 {
		t.Fatal("failure cached")
	}
}

func TestCacheMetadataAndStaleServing(t *testing.T) {
	c := &Cache[string]{TTL: 50 * time.Millisecond, Capacity: 2, ServeStaleOn: true}
	ctx := context.Background()

	// 1. Initial call -> miss
	val, meta, err := c.DoWithMeta(ctx, "k1", func() (string, error) {
		return "hello", nil
	})
	if err != nil || val != "hello" || meta.Status != "miss" || meta.Stale {
		t.Fatalf("expected fresh miss, got %v, meta: %+v", err, meta)
	}

	// 2. Second call -> hit
	val, meta, err = c.DoWithMeta(ctx, "k1", func() (string, error) {
		return "should-not-be-called", nil
	})
	if err != nil || val != "hello" || meta.Status != "hit" || meta.Stale {
		t.Fatalf("expected hit, got %v, meta: %+v", err, meta)
	}

	// 3. Wait for TTL to expire, upstream fails -> stale served
	time.Sleep(60 * time.Millisecond)
	val, meta, err = c.DoWithMeta(ctx, "k1", func() (string, error) {
		return "", errors.New("upstream provider failure")
	})
	if err != nil || val != "hello" || meta.Status != "stale" || !meta.Stale {
		t.Fatalf("expected stale serving on failure, got %v, val: %s, meta: %+v", err, val, meta)
	}

	// 4. Upstream recovers -> fresh miss
	val, meta, err = c.DoWithMeta(ctx, "k1", func() (string, error) {
		return "recovered", nil
	})
	if err != nil || val != "recovered" || meta.Status != "miss" || meta.Stale {
		t.Fatalf("expected recovery, got %v, val: %s, meta: %+v", err, val, meta)
	}

	// 5. Nil cache -> bypass
	var nilCache *Cache[string]
	val, meta, err = nilCache.DoWithMeta(ctx, "k2", func() (string, error) {
		return "bypass-val", nil
	})
	if err != nil || val != "bypass-val" || meta.Status != "bypass" {
		t.Fatalf("expected bypass, got %v, meta: %+v", err, meta)
	}
}
