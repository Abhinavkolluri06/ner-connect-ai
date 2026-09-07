package scoring

import (
	"github.com/ner-connect-ai/backend-go/internal/config"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"testing"
)

func engine() Engine {
	return Engine{Normal: config.Weights{Safety: .25, Reliability: .20, Accessibility: .20, ETA: .15, Weather: .10, Distance: .10}, Emergency: config.Weights{Safety: .35, Reliability: .25, Accessibility: .20, ETA: .15, Distance: .05}}
}
func TestEmergencySafetyOutranksShorterDangerousRoute(t *testing.T) {
	inputs := []Input{
		{Candidate: models.RouteCandidate{RouteID: "route-a", DistanceKM: 100, ETAMinutes: 175, Reliability: .55}, Risk: models.RiskResponse{LandslideRisk: .85, FloodRisk: .25, WeatherRisk: .5, AccessibilityScore: .55}},
		{Candidate: models.RouteCandidate{RouteID: "route-b", DistanceKM: 105, ETAMinutes: 187, Reliability: .9}, Risk: models.RiskResponse{LandslideRisk: .15, FloodRisk: .12, WeatherRisk: .2, AccessibilityScore: .88}},
	}
	got, err := engine().Rank(inputs, "emergency")
	if err != nil {
		t.Fatal(err)
	}
	if got[0].RouteID != "route-b" {
		t.Fatalf("got %s first, want route-b", got[0].RouteID)
	}
	if got[0].Recommendation != "recommended" || got[0].Reason == "" {
		t.Fatalf("missing recommendation: %+v", got[0])
	}
}
func TestNormalizationAndWeightProfiles(t *testing.T) {
	inputs := []Input{{Candidate: models.RouteCandidate{RouteID: "fast", DistanceKM: 100, ETAMinutes: 100, Reliability: .5}, Risk: models.RiskResponse{AccessibilityScore: .5}}, {Candidate: models.RouteCandidate{RouteID: "slow", DistanceKM: 200, ETAMinutes: 200, Reliability: .5}, Risk: models.RiskResponse{AccessibilityScore: .5}}}
	normal, err := engine().Rank(inputs, "normal")
	if err != nil {
		t.Fatal(err)
	}
	if normal[0].RouteID != "fast" {
		t.Fatalf("ETA/distance normalization did not favor fast route")
	}
	emergency, err := engine().Rank(inputs, "emergency")
	if err != nil {
		t.Fatal(err)
	}
	if normal[0].FinalScore == emergency[0].FinalScore {
		t.Fatal("normal and emergency weights should produce different scores")
	}
	for _, r := range normal {
		if r.FinalScore < 0 || r.FinalScore > 1 {
			t.Fatalf("score not normalized: %v", r.FinalScore)
		}
	}
}
func TestInvalidWeights(t *testing.T) {
	e := engine()
	e.Normal.Safety = .5
	if _, err := e.Rank([]Input{{Candidate: models.RouteCandidate{RouteID: "x"}}}, "normal"); err == nil {
		t.Fatal("expected invalid weights error")
	}
}
