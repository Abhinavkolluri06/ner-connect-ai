package scoring

import (
	"fmt"
	"math"
	"sort"

	"github.com/ner-connect-ai/backend-go/internal/config"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

type Input struct {
	Candidate models.RouteCandidate
	Risk      models.RiskResponse
}
type Engine struct{ Normal, Emergency config.Weights }

func (e Engine) Rank(inputs []Input, priority string) ([]models.ScoredRoute, error) {
	return e.RankRequest(inputs, models.AnalyzeRequest{Priority: priority})
}
func (e Engine) RankRequest(inputs []Input, request models.AnalyzeRequest) ([]models.ScoredRoute, error) {
	if len(inputs) == 0 {
		return nil, fmt.Errorf("no routes to score")
	}
	weights := e.Normal
	if request.Priority == "emergency" {
		weights = e.Emergency
	}
	if request.Priority == "fastest" {
		weights = config.Weights{Safety: .15, Reliability: .10, Accessibility: .10, ETA: .55, Weather: .05, Distance: .05}
	}
	if request.Priority == "safest" {
		weights = config.Weights{Safety: .60, Reliability: .15, Accessibility: .15, Weather: .10}
	}
	notes := []string{"Priority profile: " + request.Priority + ". Weights are product policy, not learned coefficients."}
	shift := math.Min(.05, weights.Distance)
	switch request.Cargo {
	case "food":
		weights.Distance -= shift
		weights.ETA += shift
		notes = append(notes, "Food cargo shifts up to 5% distance weight to ETA; refrigeration is not modelled.")
	case "medical_supplies", "emergency_equipment", "passengers":
		weights.Distance -= shift
		weights.Safety += shift
		notes = append(notes, "Medical, emergency or passenger cargo shifts up to 5% distance weight to safety.")
	}
	if err := validWeights(weights); err != nil {
		return nil, err
	}
	minD, maxD, minE, maxE := inputs[0].Candidate.DistanceKM, inputs[0].Candidate.DistanceKM, inputs[0].Candidate.ETAMinutes, inputs[0].Candidate.ETAMinutes
	for _, v := range inputs[1:] {
		minD = math.Min(minD, v.Candidate.DistanceKM)
		maxD = math.Max(maxD, v.Candidate.DistanceKM)
		minE = math.Min(minE, v.Candidate.ETAMinutes)
		maxE = math.Max(maxE, v.Candidate.ETAMinutes)
	}
	out := make([]models.ScoredRoute, 0, len(inputs))
	for _, v := range inputs {
		for _, n := range []float64{v.Candidate.DistanceKM, v.Candidate.ETAMinutes, v.Candidate.Reliability, v.Risk.LandslideRisk, v.Risk.FloodRisk, v.Risk.WeatherRisk, v.Risk.AccessibilityScore} {
			if math.IsNaN(n) || math.IsInf(n, 0) {
				return nil, fmt.Errorf("non-finite score input")
			}
		}
		hazard := .50*v.Risk.LandslideRisk + .25*v.Risk.FloodRisk + .25*v.Risk.WeatherRisk
		safety := clamp(1 - hazard)
		access := clamp(v.Risk.AccessibilityScore)
		policy := make([]string, len(notes), len(notes)+1+len(v.Candidate.PolicyNotes))
		copy(policy, notes)
		switch request.Vehicle {
		case "motorcycle":
			access *= 1 - .25*v.Risk.WeatherRisk
			policy = append(policy, "Motorcycle accessibility has a rainfall exposure penalty up to 25%; this is a planning rule.")
		case "truck":
			access *= .8 + .2*clamp(v.Candidate.Reliability)
			policy = append(policy, "Truck accessibility is discounted for road quality; obey profile and advisory restrictions.")
		case "ambulance":
			policy = append(policy, "Ambulance follows normal road restrictions; no emergency driving exemptions or speed uplift are assumed.")
		}
		reliability := clamp(.4*v.Candidate.Reliability + .35*safety + .25*access)
		if v.Candidate.Data.RoutingSource != "" {
			reliability *= .5 + .5*clamp(v.Candidate.Data.FeatureCoverage)
		}
		weatherGood := clamp(1 - v.Risk.WeatherRisk)
		etaGood := inverse(v.Candidate.ETAMinutes, minE, maxE)
		distanceGood := inverse(v.Candidate.DistanceKM, minD, maxD)
		parts := map[string]float64{"safety": weights.Safety * safety, "reliability": weights.Reliability * reliability, "accessibility": weights.Accessibility * access, "eta": weights.ETA * etaGood, "weather": weights.Weather * weatherGood, "distance": weights.Distance * distanceGood}
		score := weights.Safety*safety + weights.Reliability*reliability + weights.Accessibility*access + weights.ETA*etaGood + weights.Weather*weatherGood + weights.Distance*distanceGood
		mode := v.Risk.ModelMode
		if mode == "" {
			mode = "unspecified"
		}
		out = append(out, models.ScoredRoute{RouteID: v.Candidate.RouteID, DistanceKM: v.Candidate.DistanceKM, ETAMinutes: v.Candidate.ETAMinutes, FinalScore: round(clamp(score)), SafetyScore: round(safety), ReliabilityScore: round(reliability), AccessibilityScore: round(access), LandslideRisk: round(clamp(v.Risk.LandslideRisk)), FloodRisk: round(clamp(v.Risk.FloodRisk)), WeatherRisk: round(clamp(v.Risk.WeatherRisk)),
			GeoJSON: v.Candidate.GeoJSON, Data: v.Candidate.Data, ModelMode: mode, ReliabilityPercent: math.Round(reliability*10000) / 100, RoadQualityScore: v.Candidate.Reliability, VehicleSuitability: v.Candidate.VehicleSuitability, PolicyNotes: append(policy, v.Candidate.PolicyNotes...), ScoreBreakdown: parts})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].FinalScore > out[j].FinalScore })
	out[0].Recommendation = "recommended"
	out[0].Reason = reason(out[0], out)
	for i := 1; i < len(out); i++ {
		out[i].Recommendation = "alternative"
		out[i].Reason = "Alternative route ranked lower after safety, reliability, accessibility, ETA, weather, and distance were considered."
	}
	return out, nil
}
func validWeights(w config.Weights) error {
	vals := []float64{w.Safety, w.Reliability, w.Accessibility, w.ETA, w.Weather, w.Distance}
	sum := 0.0
	for _, v := range vals {
		if v < 0 || math.IsNaN(v) || math.IsInf(v, 0) {
			return fmt.Errorf("weights cannot be negative")
		}
		sum += v
	}
	if math.Abs(sum-1) > .00001 {
		return fmt.Errorf("weights must sum to 1, got %.4f", sum)
	}
	return nil
}
func inverse(v, min, max float64) float64 {
	if max == min {
		return 1
	}
	return clamp(1 - (v-min)/(max-min))
}
func reason(best models.ScoredRoute, all []models.ScoredRoute) string {
	if len(all) < 2 {
		return "Best available route based on the configured scoring factors."
	}
	other := all[1]
	delta := best.ETAMinutes - other.ETAMinutes
	if best.LandslideRisk+.15 < other.LandslideRisk {
		if delta > 0 {
			return fmt.Sprintf("Lower landslide risk and stronger route quality outweigh %.0f additional minutes of ETA.", delta)
		}
		return "Recommended for substantially lower landslide risk and stronger route quality."
	}
	return "Highest combined safety, reliability, accessibility, ETA, weather, and distance score."
}
func clamp(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
func round(v float64) float64 { return math.Round(v*10000) / 10000 }
