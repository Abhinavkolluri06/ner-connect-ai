package config

import (
	"context"
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("NER_DEMO_MODE", "true")
	t.Setenv("PYTHON_TIMEOUT_SECONDS", "5")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if !c.DemoMode || c.Port == "" || c.PythonTimeout <= 0 {
		t.Fatalf("bad defaults %+v", c)
	}
}
func TestLoadRejectsInvalidTimeout(t *testing.T) {
	t.Setenv("PYTHON_TIMEOUT_SECONDS", "zero")
	if _, err := Load(); err == nil {
		t.Fatal("expected error")
	}
}
func TestLiveModeRequiresProviderURLs(t *testing.T) {
	t.Setenv("NER_DEMO_MODE", "false")
	t.Setenv("PYTHON_TIMEOUT_SECONDS", "5")
	t.Setenv("ROUTING_SERVICE_URL", "")
	t.Setenv("WEATHER_SERVICE_URL", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected error")
	}
}

func TestBoundedContext(t *testing.T) {
	// 1. Without parent deadline
	ctx, cancel := BoundedContext(context.Background(), 50*time.Millisecond)
	defer cancel()
	deadline, ok := ctx.Deadline()
	if !ok || time.Until(deadline) > 60*time.Millisecond {
		t.Fatalf("expected 50ms deadline, got %v", deadline)
	}

	// 2. With shorter parent deadline
	parent, parentCancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer parentCancel()
	child, childCancel := BoundedContext(parent, 100*time.Millisecond)
	defer childCancel()
	childDeadline, _ := child.Deadline()
	parentDeadline, _ := parent.Deadline()
	if childDeadline.After(parentDeadline) {
		t.Fatalf("child deadline should not exceed parent deadline")
	}
}
