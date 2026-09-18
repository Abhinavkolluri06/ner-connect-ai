package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/ner-connect-ai/backend-go/internal/circuit"
	"github.com/ner-connect-ai/backend-go/internal/config"
	"github.com/ner-connect-ai/backend-go/internal/database"
	"github.com/ner-connect-ai/backend-go/internal/intelligence"
	"github.com/ner-connect-ai/backend-go/internal/middleware"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"github.com/ner-connect-ai/backend-go/internal/routing"
	"github.com/ner-connect-ai/backend-go/internal/scoring"
	"github.com/ner-connect-ai/backend-go/internal/weather"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func testHandler(intel intelligence.Provider, weatherProvider weather.Provider, routeProvider routing.Provider) http.Handler {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := database.NewInMemoryRepository()
	eng := scoring.Engine{Normal: config.Weights{Safety: .25, Reliability: .20, Accessibility: .20, ETA: .15, Weather: .10, Distance: .10}, Emergency: config.Weights{Safety: .35, Reliability: .25, Accessibility: .20, ETA: .15, Distance: .05}}
	service := &Service{Routing: routeProvider, Weather: weatherProvider, Intelligence: intel, Fallback: intelligence.HeuristicFallbackRiskProvider{}, Scoring: eng, Repository: repo, Logger: logger}
	h := &Handler{Service: service, Routing: routeProvider, Weather: weatherProvider, Repository: repo, MaxRequestBytes: 1024, Logger: logger}
	return middleware.RequestID(h.Routes())
}
func validBody() []byte {
	return []byte(`{"origin":"Guwahati","destination":"Shillong","vehicle":"truck","cargo":"medical_supplies","priority":"emergency"}`)
}
func liveIntel() intelligence.Provider {
	return intelligence.MockProvider{Responses: map[string]models.RiskResponse{"route-a": {RouteID: "route-a", LandslideRisk: .85, FloodRisk: .25, WeatherRisk: .75, AccessibilityScore: .55, Confidence: .9}, "route-b": {RouteID: "route-b", LandslideRisk: .15, FloodRisk: .12, WeatherRisk: .2, AccessibilityScore: .88, Confidence: .9}, "route-c": {RouteID: "route-c", LandslideRisk: .45, FloodRisk: .25, WeatherRisk: .46, AccessibilityScore: .72, Confidence: .8}}}
}
func TestAnalyzeSuccess(t *testing.T) {
	h := testHandler(liveIntel(), weather.DemoProvider{}, routing.DemoProvider{})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/routes/analyze", bytes.NewReader(validBody()))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var out models.AnalyzeResponse
	if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if out.RequestID == "" || rec.Header().Get("X-Request-ID") == "" {
		t.Fatal("missing request ID")
	}
	if len(out.Routes) != 3 || out.RecommendedRouteID == "" || (out.IntelligenceMode != "demo" && out.IntelligenceMode != "live_heuristic") {
		t.Fatalf("unexpected response %+v", out)
	}
	for _, r := range out.Routes {
		if r.FinalScore < 0 || r.FinalScore > 1 || r.Reason == "" {
			t.Fatalf("invalid route %+v", r)
		}
	}
}
func TestAnalyzeFallback(t *testing.T) {
	h := testHandler(intelligence.MockProvider{Err: errors.New("python down")}, weather.DemoProvider{}, routing.DemoProvider{})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/routes/analyze", bytes.NewReader(validBody())))
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	var out models.AnalyzeResponse
	_ = json.NewDecoder(rec.Body).Decode(&out)
	if out.IntelligenceMode != "go_fallback" || len(out.Warnings) == 0 || out.RecommendedRouteID == "" {
		t.Fatalf("unexpected fallback response %+v", out)
	}
}
func TestAnalyzeWeatherFailureDegrades(t *testing.T) {
	h := testHandler(liveIntel(), weather.MockProvider{Err: errors.New("weather down")}, routing.DemoProvider{})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/routes/analyze", bytes.NewReader(validBody())))
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	var out models.AnalyzeResponse
	_ = json.NewDecoder(rec.Body).Decode(&out)
	if len(out.Warnings) == 0 {
		t.Fatal("expected weather warning")
	}
}
func TestAnalyzeRoutingFailure(t *testing.T) {
	h := testHandler(liveIntel(), weather.DemoProvider{}, routing.MockProvider{Err: errors.New("down")})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/routes/analyze", bytes.NewReader(validBody())))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("got %d", rec.Code)
	}
	var out apiError
	_ = json.NewDecoder(rec.Body).Decode(&out)
	if out.Error.Code != "ROUTING_PROVIDER_UNAVAILABLE" || out.Error.RequestID == "" {
		t.Fatalf("unexpected error %+v", out)
	}
}
func TestValidationErrors(t *testing.T) {
	h := testHandler(liveIntel(), weather.DemoProvider{}, routing.DemoProvider{})
	tests := []string{"", `{`, `{"origin":"Guwahati","destination":"Guwahati","vehicle":"truck","cargo":"medical_supplies","priority":"emergency"}`, `{"origin":"Guwahati","destination":"Shillong","vehicle":"boat","cargo":"medical_supplies","priority":"emergency"}`, `{"origin":"Guwahati","destination":"Shillong","vehicle":"truck","cargo":"medical_supplies","priority":"urgent"}`}
	for _, body := range tests {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/routes/analyze", bytes.NewBufferString(body)))
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("body %q got %d", body, rec.Code)
		}
		var out apiError
		_ = json.NewDecoder(rec.Body).Decode(&out)
		if out.Error.Code != "INVALID_ROUTE_REQUEST" || out.Error.RequestID == "" {
			t.Fatalf("bad error %+v", out)
		}
	}
}

func TestRequestSizeLimit(t *testing.T) {
	h := testHandler(liveIntel(), weather.DemoProvider{}, routing.DemoProvider{})
	body := append(validBody(), bytes.Repeat([]byte(" "), 2000)...)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/routes/analyze", bytes.NewReader(body)))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d", rec.Code)
	}
}
func TestHealthEndpoints(t *testing.T) {
	h := testHandler(liveIntel(), weather.DemoProvider{}, routing.DemoProvider{})
	for _, path := range []string{"/health", "/health/live", "/health/ready"} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("%s got %d", path, rec.Code)
		}
	}
}

func TestCircuitBreakerIntegrationAndReadiness(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := database.NewInMemoryRepository()
	eng := scoring.Engine{Normal: config.Weights{Safety: 1}, Emergency: config.Weights{Safety: 1}}
	circuits := circuit.NewRegistry()

	failingIntel := &spyIntelligence{} // fails on AnalyzeRisk
	service := &Service{
		Routing:      routing.DemoProvider{},
		Weather:      weather.DemoProvider{},
		Intelligence: failingIntel,
		Fallback:     intelligence.HeuristicFallbackRiskProvider{},
		Scoring:      eng,
		Repository:   repo,
		Logger:       logger,
		Circuit:      circuits,
	}
	h := &Handler{
		Service:         service,
		Routing:         routing.DemoProvider{},
		Weather:         weather.DemoProvider{},
		Repository:      repo,
		MaxRequestBytes: 1024,
		Logger:          logger,
	}
	handler := middleware.RequestID(h.Routes())

	// 1. Initial readiness should be 200 OK with CLOSED circuits
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health/ready", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var readyResp map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &readyResp)
	deps := readyResp["dependencies"].(map[string]any)
	cbMap := deps["circuits"].(map[string]any)
	if cbMap["intelligence"] != "CLOSED" {
		t.Fatalf("expected intelligence circuit to be CLOSED, got %v", cbMap["intelligence"])
	}

	// 2. Trigger failures in intelligence service until circuit opens (threshold is 3)
	for i := 0; i < 3; i++ {
		r := httptest.NewRecorder()
		handler.ServeHTTP(r, httptest.NewRequest(http.MethodPost, "/api/v1/routes/analyze", bytes.NewReader(validBody())))
		if r.Code != http.StatusOK {
			t.Fatalf("call %d: expected 200 fallback, got %d", i, r.Code)
		}
	}
	if circuits.Intelligence.State() != circuit.StateOpen {
		t.Fatalf("expected intelligence circuit to be OPEN after 3 failures, got %s", circuits.Intelligence.State())
	}

	// 3. Readiness should now report degraded fallback active due to open intelligence circuit
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health/ready", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 (degraded supported), got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &readyResp)
	deps = readyResp["dependencies"].(map[string]any)
	if deps["intelligence"] != "degraded_fallback_active" {
		t.Fatalf("expected degraded_fallback_active, got %v", deps["intelligence"])
	}

	// 4. Trip routing circuit -> readiness must transition to 503 (not_ready)
	_ = circuits.Routing.Execute(context.Background(), func() error { return errors.New("osrm down") })
	_ = circuits.Routing.Execute(context.Background(), func() error { return errors.New("osrm down") })
	_ = circuits.Routing.Execute(context.Background(), func() error { return errors.New("osrm down") })
	if !circuits.Routing.IsOpen() {
		t.Fatalf("expected routing circuit to be open")
	}

	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health/ready", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 not_ready when routing circuit is open, got %d", rec.Code)
	}
}
