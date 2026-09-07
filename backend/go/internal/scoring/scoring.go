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
	if len(inputs) == 0 {
		return nil, fmt.Errorf("no routes to score")
	}
	weights := e.Normal
	if priority == "emergency" {
		weights = e.Emergency
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
		hazard := .50*v.Risk.LandslideRisk + .25*v.Risk.FloodRisk + .25*v.Risk.WeatherRisk
		safety := clamp(1 - hazard)
		weatherGood := clamp(1 - v.Risk.WeatherRisk)
		etaGood := inverse(v.Candidate.ETAMinutes, minE, maxE)
		distanceGood := inverse(v.Candidate.DistanceKM, minD, maxD)
		score := weights.Safety*safety + weights.Reliability*clamp(v.Candidate.Reliability) + weights.Accessibility*clamp(v.Risk.AccessibilityScore) + weights.ETA*etaGood + weights.Weather*weatherGood + weights.Distance*distanceGood
		out = append(out, models.ScoredRoute{RouteID: v.Candidate.RouteID, DistanceKM: v.Candidate.DistanceKM, ETAMinutes: v.Candidate.ETAMinutes, FinalScore: round(clamp(score)), SafetyScore: round(safety), ReliabilityScore: round(clamp(v.Candidate.Reliability)), AccessibilityScore: round(clamp(v.Risk.AccessibilityScore)), LandslideRisk: round(clamp(v.Risk.LandslideRisk)), FloodRisk: round(clamp(v.Risk.FloodRisk)), WeatherRisk: round(clamp(v.Risk.WeatherRisk))})
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
		if v < 0 {
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
