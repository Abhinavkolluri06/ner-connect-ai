package circuit

import (
	"context"
	"errors"
	"sync"
	"time"
)

type State string

const (
	StateClosed   State = "CLOSED"
	StateOpen     State = "OPEN"
	StateHalfOpen State = "HALF_OPEN"
)

var ErrCircuitOpen = errors.New("circuit breaker is open")

type Config struct {
	Name             string
	FailureThreshold int
	Cooldown         time.Duration
	OnStateChange    func(name string, from, to State)
}

type Breaker struct {
	mu              sync.RWMutex
	name            string
	state           State
	failures        int
	failureThresh   int
	cooldown        time.Duration
	lastFailureTime time.Time
	lastStateChange time.Time
	onStateChange   func(name string, from, to State)
	probing         bool
}

func New(cfg Config) *Breaker {
	thresh := cfg.FailureThreshold
	if thresh <= 0 {
		thresh = 3
	}
	cooldown := cfg.Cooldown
	if cooldown <= 0 {
		cooldown = 15 * time.Second
	}
	now := time.Now()
	return &Breaker{
		name:            cfg.Name,
		state:           StateClosed,
		failureThresh:   thresh,
		cooldown:        cooldown,
		lastStateChange: now,
		onStateChange:   cfg.OnStateChange,
	}
}

func (b *Breaker) Name() string {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.name
}

func (b *Breaker) State() State {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.checkStateTransition(time.Now())
	return b.state
}

func (b *Breaker) Failures() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.failures
}

func (b *Breaker) IsOpen() bool {
	return b.State() == StateOpen
}

func (b *Breaker) checkStateTransition(now time.Time) {
	if b.state == StateOpen {
		if now.Sub(b.lastFailureTime) >= b.cooldown {
			b.changeState(StateHalfOpen, now)
			b.probing = false
		}
	}
}

func (b *Breaker) changeState(to State, now time.Time) {
	from := b.state
	if from == to {
		return
	}
	b.state = to
	b.lastStateChange = now
	if b.onStateChange != nil {
		b.onStateChange(b.name, from, to)
	}
}

func (b *Breaker) beforeCall() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	b.checkStateTransition(now)

	switch b.state {
	case StateClosed:
		return nil
	case StateOpen:
		return ErrCircuitOpen
	case StateHalfOpen:
		if b.probing {
			// Another concurrent probe is already in flight, reject excess probes
			return ErrCircuitOpen
		}
		b.probing = true
		return nil
	default:
		return nil
	}
}

func (b *Breaker) afterCall(err error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()

	if err != nil {
		b.failures++
		b.lastFailureTime = now
		b.probing = false
		if b.state == StateClosed && b.failures >= b.failureThresh {
			b.changeState(StateOpen, now)
		} else if b.state == StateHalfOpen {
			b.changeState(StateOpen, now)
		}
	} else {
		// Call succeeded
		if b.state == StateHalfOpen {
			b.failures = 0
			b.probing = false
			b.changeState(StateClosed, now)
		} else if b.state == StateClosed {
			b.failures = 0
		}
	}
}

func (b *Breaker) Execute(ctx context.Context, fn func() error) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := b.beforeCall(); err != nil {
		return err
	}
	err := fn()
	b.afterCall(err)
	return err
}

func Execute[T any](b *Breaker, ctx context.Context, fn func() (T, error)) (T, error) {
	var zero T
	if b == nil {
		return fn()
	}
	if err := ctx.Err(); err != nil {
		return zero, err
	}
	if err := b.beforeCall(); err != nil {
		return zero, err
	}
	val, err := fn()
	b.afterCall(err)
	return val, err
}

type Registry struct {
	Routing      *Breaker `json:"routing"`
	Weather      *Breaker `json:"weather"`
	Intelligence *Breaker `json:"intelligence"`
	Terrain      *Breaker `json:"terrain"`
	Feed         *Breaker `json:"feed"`
}

func NewRegistry() *Registry {
	return &Registry{
		Routing:      New(Config{Name: "routing", FailureThreshold: 3, Cooldown: 15 * time.Second}),
		Weather:      New(Config{Name: "weather", FailureThreshold: 3, Cooldown: 15 * time.Second}),
		Intelligence: New(Config{Name: "intelligence", FailureThreshold: 3, Cooldown: 15 * time.Second}),
		Terrain:      New(Config{Name: "terrain", FailureThreshold: 3, Cooldown: 15 * time.Second}),
		Feed:         New(Config{Name: "feed", FailureThreshold: 3, Cooldown: 15 * time.Second}),
	}
}
