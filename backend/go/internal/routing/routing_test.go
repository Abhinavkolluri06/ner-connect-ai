package routing

import (
	"context"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"testing"
)

func TestDemoProvider(t *testing.T) {
	routes, err := (DemoProvider{}).Routes(context.Background(), models.AnalyzeRequest{Origin: "Guwahati", Destination: "Shillong"})
	if err != nil {
		t.Fatal(err)
	}
	if len(routes) != 3 {
		t.Fatalf("got %d routes", len(routes))
	}
	if routes[1].RouteID != "route-b" {
		t.Fatalf("unexpected routes")
	}
}
func TestDemoProviderUnknownRoute(t *testing.T) {
	if _, err := (DemoProvider{}).Routes(context.Background(), models.AnalyzeRequest{Origin: "A", Destination: "B"}); err == nil {
		t.Fatal("expected error")
	}
}
