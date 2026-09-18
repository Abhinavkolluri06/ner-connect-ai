package circuit

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestCircuitBreakerLifecycle(t *testing.T) {
	stateChanges := []string{}
	cb := New(Config{
		Name:             "test-provider",
		FailureThreshold: 2,
		Cooldown:         50 * time.Millisecond,
		OnStateChange: func(name string, from, to State) {
			stateChanges = append(stateChanges, string(from)+"->"+string(to))
		},
	})

	ctx := context.Background()

	// 1. Successful call in CLOSED state
	err := cb.Execute(ctx, func() error { return nil })
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if cb.State() != StateClosed {
		t.Fatalf("expected state CLOSED, got %s", cb.State())
	}

	// 2. First failure - still CLOSED
	mockErr := errors.New("upstream failure")
	_ = cb.Execute(ctx, func() error { return mockErr })
	if cb.State() != StateClosed {
		t.Fatalf("expected state CLOSED after 1 failure, got %s", cb.State())
	}
	if cb.Failures() != 1 {
		t.Fatalf("expected 1 failure, got %d", cb.Failures())
	}

	// 3. Second failure - trips to OPEN
	_ = cb.Execute(ctx, func() error { return mockErr })
	if cb.State() != StateOpen {
		t.Fatalf("expected state OPEN after 2 failures, got %s", cb.State())
	}

	// 4. Calls while OPEN are fast-rejected with ErrCircuitOpen
	err = cb.Execute(ctx, func() error { return nil })
	if !errors.Is(err, ErrCircuitOpen) {
		t.Fatalf("expected ErrCircuitOpen, got %v", err)
	}

	// Generic Execute helper test
	val, err := Execute(cb, ctx, func() (string, error) { return "ok", nil })
	if !errors.Is(err, ErrCircuitOpen) || val != "" {
		t.Fatalf("expected ErrCircuitOpen from Execute generic helper, got %v, %s", err, val)
	}

	// 5. Wait for Cooldown to elapse -> transitions to HALF_OPEN on next check
	time.Sleep(60 * time.Millisecond)
	if cb.State() != StateHalfOpen {
		t.Fatalf("expected state HALF_OPEN after cooldown, got %s", cb.State())
	}

	// 6. Successful probe in HALF_OPEN -> transitions back to CLOSED
	err = cb.Execute(ctx, func() error { return nil })
	if err != nil {
		t.Fatalf("expected probe to succeed, got %v", err)
	}
	if cb.State() != StateClosed {
		t.Fatalf("expected state CLOSED after successful probe, got %s", cb.State())
	}
	if cb.Failures() != 0 {
		t.Fatalf("expected failures reset to 0, got %d", cb.Failures())
	}

	// Verify state change transitions
	expectedChanges := []string{"CLOSED->OPEN", "OPEN->HALF_OPEN", "HALF_OPEN->CLOSED"}
	if len(stateChanges) != len(expectedChanges) {
		t.Fatalf("expected %d state changes, got %v", len(expectedChanges), stateChanges)
	}
	for i, exp := range expectedChanges {
		if stateChanges[i] != exp {
			t.Errorf("change %d: expected %s, got %s", i, exp, stateChanges[i])
		}
	}
}

func TestCircuitBreakerProbeFailure(t *testing.T) {
	cb := New(Config{
		Name:             "probe-fail-test",
		FailureThreshold: 1,
		Cooldown:         20 * time.Millisecond,
	})
	ctx := context.Background()
	mockErr := errors.New("upstream down")

	_ = cb.Execute(ctx, func() error { return mockErr })
	if cb.State() != StateOpen {
		t.Fatalf("expected OPEN state")
	}

	time.Sleep(30 * time.Millisecond)
	if cb.State() != StateHalfOpen {
		t.Fatalf("expected HALF_OPEN state")
	}

	// Probe fails -> re-enters OPEN
	_ = cb.Execute(ctx, func() error { return mockErr })
	if cb.State() != StateOpen {
		t.Fatalf("expected OPEN state after probe failure, got %s", cb.State())
	}
}

func TestCircuitBreakerConcurrency(t *testing.T) {
	cb := New(Config{
		Name:             "concurrent-cb",
		FailureThreshold: 5,
		Cooldown:         50 * time.Millisecond,
	})
	ctx := context.Background()
	var wg sync.WaitGroup
	var successCount, failureCount int64

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			err := cb.Execute(ctx, func() error {
				if idx%10 == 0 {
					return errors.New("err")
				}
				return nil
			})
			if err != nil {
				atomic.AddInt64(&failureCount, 1)
			} else {
				atomic.AddInt64(&successCount, 1)
			}
		}(i)
	}
	wg.Wait()

	total := atomic.LoadInt64(&successCount) + atomic.LoadInt64(&failureCount)
	if total != 50 {
		t.Fatalf("expected 50 total operations, got %d", total)
	}
}
