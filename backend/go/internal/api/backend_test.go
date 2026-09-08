package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/ner-connect-ai/backend-go/internal/config"
	"github.com/ner-connect-ai/backend-go/internal/intelligence"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"github.com/ner-connect-ai/backend-go/internal/routing"
	"github.com/ner-connect-ai/backend-go/internal/scoring"
	"github.com/ner-connect-ai/backend-go/internal/weather"
	"io"
	"log/slog"
	"net/http/httptest"
	"testing"
)

func TestHistoryCatalogAndAccessibilityAPI(t *testing.T) {
	h := testHandler(liveIntel(), weather.DemoProvider{}, routing.DemoProvider{})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("POST", "/api/v1/routes/analyze", bytes.NewReader(validBody())))
	var analysis models.AnalyzeResponse
	json.Unmarshal(rec.Body.Bytes(), &analysis)
	if !analysis.Persisted {
		t.Fatal("not saved")
	}
	for _, path := range []string{"/api/v1/analyses?limit=1&offset=0", "/api/v1/analyses/" + analysis.RequestID, "/api/v1/locations", "/api/v1/openapi.json"} {
		rec = httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != 200 || !json.Valid(rec.Body.Bytes()) {
			t.Fatalf("%s: %d %s", path, rec.Code, rec.Body.String())
		}
	}
	for _, path := range []string{"/api/v1/analyses?limit=51", "/api/v1/analyses?offset=-1"} {
		rec = httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != 400 {
			t.Fatal("invalid pagination accepted")
		}
	}
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("POST", "/api/v1/locations/shillong/accessibility", bytes.NewBufferString(`{"origin":"Guwahati","vehicle":"car","cargo":"general","priority":"normal"}`)))
	var result map[string]any
	json.Unmarshal(rec.Body.Bytes(), &result)
	if rec.Code != 200 || result["scale"] != "0-100" {
		t.Fatalf("accessibility %d %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/v1/analyses/missing", nil))
	if rec.Code != 404 {
		t.Fatal("missing record wrong status")
	}
}
func TestSingleRouteAcceptedAndMissingFeaturesBypassML(t *testing.T) {
	routes, _ := (routing.DemoProvider{}).Routes(context.Background(), models.AnalyzeRequest{Origin: "Guwahati", Destination: "Shillong"})
	routes = routes[:1]
	routes[0].Data.MissingFeatures = []string{"road_condition_score"}
	spy := &spyIntelligence{}
	h := testHandler(spy, weather.DemoProvider{}, routing.MockProvider{Candidates: routes})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("POST", "/api/v1/routes/analyze", bytes.NewReader(validBody())))
	var result models.AnalyzeResponse
	json.Unmarshal(rec.Body.Bytes(), &result)
	if rec.Code != 200 || len(result.Routes) != 1 || result.IntelligenceMode != "fallback" || spy.called {
		t.Fatalf("unexpected incomplete-feature handling %d %s", rec.Code, rec.Body.String())
	}
}

type spyIntelligence struct{ called bool }

func (p *spyIntelligence) AnalyzeRisk(context.Context, models.RiskRequest) (models.RiskResponse, error) {
	p.called = true
	return models.RiskResponse{}, errors.New("should not call")
}

type failedRepository struct{}

func (failedRepository) Save(context.Context, models.AnalysisRecord) error {
	return errors.New("disk full")
}
func (failedRepository) Healthy(context.Context) bool { return false }
func TestPersistenceFailureIsVisible(t *testing.T) {
	s := Service{Routing: routing.DemoProvider{}, Weather: weather.DemoProvider{}, Intelligence: liveIntel(), Fallback: intelligence.HeuristicFallbackRiskProvider{}, Repository: failedRepository{}, Logger: slog.New(slog.NewTextHandler(io.Discard, nil)), Scoring: scoring.Engine{Normal: config.Weights{Safety: 1}, Emergency: config.Weights{Safety: 1}}}
	result, err := s.Analyze(context.Background(), "test", models.AnalyzeRequest{Origin: "Guwahati", Destination: "Shillong", Vehicle: "car", Cargo: "general", Priority: "normal"})
	if err != nil || result.Persisted || len(result.Warnings) < 2 {
		t.Fatalf("save failure hidden %+v %v", result, err)
	}
}
