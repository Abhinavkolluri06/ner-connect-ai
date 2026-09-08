package features

import (
	"context"
	"encoding/json"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestTerrainCentralDifferenceNotRoadGrade(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"elevation": []float64{1000, 1100, 900, 1000, 1000}})
	}))
	defer s.Close()
	c := models.RouteCandidate{Segments: []models.Segment{{Latitude: 26, Longitude: 91}}, Data: models.DataQuality{MissingFeatures: []string{"elevation_m", "slope_deg", "rainfall_mm", "historical_landslides", "road_condition_score"}}}
	if err := (Terrain{BaseURL: s.URL, Client: s.Client()}).Enrich(context.Background(), &c); err != nil {
		t.Fatal(err)
	}
	if math.Abs(c.Segments[0].SlopeDeg-45) > .0001 || c.Segments[0].ElevationM != 1000 || c.Data.FeatureCoverage != .4 {
		t.Fatalf("%+v", c)
	}
}
func TestFeedClosureIntersectsBetweenSamplesAndExpires(t *testing.T) {
	now := time.Now()
	s := Snapshot{Source: "test", License: "fixture", UpdatedAt: now.Add(-time.Hour), ValidUntil: now.Add(time.Hour), Items: []Observation{{ID: "closure", Kind: "closure", Latitude: 26, Longitude: 91.5, RadiusKM: .1, ObservedAt: now.Add(-time.Hour), ExpiresAt: now.Add(time.Hour)}}}
	if err := s.Validate(now); err != nil {
		t.Fatal(err)
	}
	c := models.RouteCandidate{GeoJSON: &models.LineString{Type: "LineString", Coordinates: [][]float64{{91, 26}, {92, 26}}}, Segments: []models.Segment{{Latitude: 26, Longitude: 91}, {Latitude: 26, Longitude: 92}}}
	if len(s.Apply(&c, models.AnalyzeRequest{Vehicle: "car"}, now)) != 1 {
		t.Fatal("missed closure between sampled endpoints")
	}
	s.Items[0].ExpiresAt = now.Add(-time.Minute)
	if len(s.Apply(&c, models.AnalyzeRequest{}, now)) != 0 {
		t.Fatal("expired closure applied")
	}
	s.ValidUntil = now.Add(-time.Second)
	if s.Validate(now) == nil {
		t.Fatal("expired snapshot accepted")
	}
}
func TestFeedVehicleClearanceRequiresDimensions(t *testing.T) {
	now := time.Now()
	s := Snapshot{Items: []Observation{{ID: "bridge", Kind: "restriction", Latitude: 26, Longitude: 91, RadiusKM: 1, MaxWeightT: 10, ExpiresAt: now.Add(time.Hour)}}}
	c := models.RouteCandidate{Segments: []models.Segment{{Latitude: 26, Longitude: 91}}}
	for _, weight := range []float64{0, 11} {
		req := models.AnalyzeRequest{Vehicle: "truck", VehicleDimensions: &models.VehicleDimensions{WeightT: weight}}
		if len(s.Apply(&c, req, now)) == 0 {
			t.Fatal("unknown/overweight truck permitted")
		}
	}
	if len(s.Apply(&c, models.AnalyzeRequest{Vehicle: "truck", VehicleDimensions: &models.VehicleDimensions{WeightT: 5}}, now)) != 0 {
		t.Fatal("valid truck rejected")
	}
}
