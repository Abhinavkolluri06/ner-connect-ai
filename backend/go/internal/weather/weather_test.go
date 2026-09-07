package weather

import (
	"context"
	"errors"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"testing"
)

func TestDemoProvider(t *testing.T) {
	v, err := (DemoProvider{}).Weather(context.Background(), models.RouteCandidate{RouteID: "route-b"})
	if err != nil {
		t.Fatal(err)
	}
	if v.Risk != .2 {
		t.Fatalf("unexpected weather %+v", v)
	}
}
func TestMockFailure(t *testing.T) {
	_, err := (MockProvider{Err: errors.New("down")}).Weather(context.Background(), models.RouteCandidate{})
	if err == nil {
		t.Fatal("expected error")
	}
}
