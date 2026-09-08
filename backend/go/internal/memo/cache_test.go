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
