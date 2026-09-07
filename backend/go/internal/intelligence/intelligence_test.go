package intelligence

import (
	"context"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHTTPClientSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/internal/v1/risk/analyze" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"route_id":"r1","landslide_risk":0.2,"flood_risk":0.1,"weather_risk":0.3,"accessibility_score":0.8,"confidence":0.9}`))
	}))
	defer server.Close()
	got, err := (HTTPClient{BaseURL: server.URL, Client: server.Client()}).AnalyzeRisk(context.Background(), models.RiskRequest{RouteID: "r1"})
	if err != nil {
		t.Fatal(err)
	}
	if got.AccessibilityScore != .8 {
		t.Fatalf("unexpected response %+v", got)
	}
}
func TestHTTPClientFailures(t *testing.T) {
	tests := []struct {
		name, body string
		status     int
	}{
		{"4xx", `{}`, 400}, {"5xx", `{}`, 500}, {"malformed", `{`, 200},
		{"route mismatch", `{"route_id":"other","landslide_risk":0.2,"flood_risk":0.1,"weather_risk":0.3,"accessibility_score":0.8,"confidence":0.9}`, 200},
		{"negative", `{"route_id":"r1","landslide_risk":-0.1,"flood_risk":0.1,"weather_risk":0.3,"accessibility_score":0.8,"confidence":0.9}`, 200},
		{"above one", `{"route_id":"r1","landslide_risk":0.2,"flood_risk":0.1,"weather_risk":0.3,"accessibility_score":0.8,"confidence":1.1}`, 200},
		{"empty", ``, 200}, {"missing fields", `{"route_id":"r1"}`, 200},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer s.Close()
			_, err := (HTTPClient{BaseURL: s.URL, Client: s.Client()}).AnalyzeRisk(context.Background(), models.RiskRequest{RouteID: "r1"})
			if err == nil {
				t.Fatal("expected error")
			}
		})
	}
}
func TestHTTPClientTimeoutAndConnectionFailure(t *testing.T) {
	slow := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { time.Sleep(100 * time.Millisecond) }))
	defer slow.Close()
	_, err := (HTTPClient{BaseURL: slow.URL, Client: &http.Client{Timeout: 10 * time.Millisecond}}).AnalyzeRisk(context.Background(), models.RiskRequest{RouteID: "r1"})
	if err == nil {
		t.Fatal("expected timeout")
	}
	_, err = (HTTPClient{BaseURL: "http://127.0.0.1:1", Client: &http.Client{Timeout: 100 * time.Millisecond}}).AnalyzeRisk(context.Background(), models.RiskRequest{RouteID: "r1"})
	if err == nil {
		t.Fatal("expected connection failure")
	}
}
func TestHeuristicFallbackDeterministicAndNormalized(t *testing.T) {
	req := models.RiskRequest{RouteID: "x", Segments: []models.Segment{{RainfallMM: 82, SlopeDeg: 34, ElevationM: 1300, HistoricalLandslides: 7, RoadConditionScore: 55}}}
	a, err := (HeuristicFallbackRiskProvider{}).AnalyzeRisk(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := (HeuristicFallbackRiskProvider{}).AnalyzeRisk(context.Background(), req)
	if a != b {
		t.Fatal("fallback is not deterministic")
	}
	for _, v := range []float64{a.LandslideRisk, a.FloodRisk, a.WeatherRisk, a.AccessibilityScore, a.Confidence} {
		if v < 0 || v > 1 {
			t.Fatalf("value outside range: %v", v)
		}
	}
}
