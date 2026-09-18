package scoring

import (
	"fmt"
	"math"
	"sort"
	"strings"

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
		etaGood := inverseWithGuard(v.Candidate.ETAMinutes, minE, maxE, 3.0)
		distanceGood := inverseWithGuard(v.Candidate.DistanceKM, minD, maxD, 2.0)
		parts := map[string]float64{"safety": weights.Safety * safety, "reliability": weights.Reliability * reliability, "accessibility": weights.Accessibility * access, "eta": weights.ETA * etaGood, "weather": weights.Weather * weatherGood, "distance": weights.Distance * distanceGood}
		score := weights.Safety*safety + weights.Reliability*reliability + weights.Accessibility*access + weights.ETA*etaGood + weights.Weather*weatherGood + weights.Distance*distanceGood
		mode := v.Risk.ModelMode
		if mode == "" {
			mode = "unspecified"
		}
		hazards := map[string]models.HazardDetail{
			"landslide": {
				Availability:      hazardAvailability(v.Candidate.Data, "slope_deg"),
				Method:            mode,
				RiskIndex:         round(clamp(v.Risk.LandslideRisk)),
				RiskLevel:         riskLevel(v.Risk.LandslideRisk),
				InputCompleteness: v.Risk.Confidence,
				SourceQuality:     sourceQuality(v.Candidate.Data.TerrainSource),
				ModelUncertainty:  "unavailable",
				ValidatedRegion:   "not_regionally_validated",
				Warnings:          []string{"Landslide susceptibility index is an unvalidated heuristic, not a real-time event forecast."},
				FeatureVersion:    "1.0",
			},
			"flood": {
				Availability:      "available",
				Method:            "heuristic",
				RiskIndex:         round(clamp(v.Risk.FloodRisk)),
				RiskLevel:         riskLevel(v.Risk.FloodRisk),
				InputCompleteness: v.Risk.Confidence,
				SourceQuality:     "medium",
				ModelUncertainty:  "unavailable",
				ValidatedRegion:   "not_regionally_validated",
				Warnings:          []string{"Flood risk derived from precipitation and elevation proxies; no hydraulic gauge data."},
				FeatureVersion:    "1.0",
			},
			"weather": {
				Availability:      weatherAvailability(v.Candidate.Data),
				Method:            "live_provider",
				RiskIndex:         round(clamp(v.Risk.WeatherRisk)),
				RiskLevel:         riskLevel(v.Risk.WeatherRisk),
				InputCompleteness: 1.0,
				SourceQuality:     sourceQuality(v.Candidate.Data.WeatherSource),
				ModelUncertainty:  "low",
				ValidatedRegion:   "openmeteo_live",
				DataTime:          v.Candidate.Data.WeatherStart,
				FeatureVersion:    "1.0",
			},
			"accessibility": {
				Availability:      "available",
				Method:            "heuristic",
				RiskIndex:         round(1 - clamp(access)),
				RiskLevel:         riskLevel(1 - access),
				InputCompleteness: v.Risk.Confidence,
				SourceQuality:     "medium",
				ModelUncertainty:  "unavailable",
				ValidatedRegion:   "not_regionally_validated",
				FeatureVersion:    "1.0",
			},
		}
		out = append(out, models.ScoredRoute{
			RouteID:            v.Candidate.RouteID,
			DistanceKM:         v.Candidate.DistanceKM,
			ETAMinutes:         v.Candidate.ETAMinutes,
			FinalScore:         round(clamp(score)),
			SafetyScore:        round(safety),
			ReliabilityScore:   round(reliability),
			AccessibilityScore: round(access),
			LandslideRisk:      round(clamp(v.Risk.LandslideRisk)),
			FloodRisk:          round(clamp(v.Risk.FloodRisk)),
			WeatherRisk:        round(clamp(v.Risk.WeatherRisk)),
			RiskLevel:          riskLevel(1 - safety),
			Hazards:            hazards,
			GeoJSON:            v.Candidate.GeoJSON,
			Data:               v.Candidate.Data,
			ModelMode:          mode,
			ReliabilityPercent: math.Round(reliability*10000) / 100,
			RoadQualityScore:   v.Candidate.Reliability,
			VehicleSuitability: v.Candidate.VehicleSuitability,
			PolicyNotes:        append(policy, v.Candidate.PolicyNotes...),
			ScoreBreakdown:     parts,
		})
	}
	sort.SliceStable(out, func(i, j int) bool {
		if math.Abs(out[i].FinalScore-out[j].FinalScore) > 0.0001 {
			return out[i].FinalScore > out[j].FinalScore
		}
		if math.Abs(out[i].SafetyScore-out[j].SafetyScore) > 0.0001 {
			return out[i].SafetyScore > out[j].SafetyScore
		}
		if math.Abs(out[i].ETAMinutes-out[j].ETAMinutes) > 0.1 {
			return out[i].ETAMinutes < out[j].ETAMinutes
		}
		return out[i].RouteID < out[j].RouteID
	})
	out[0].Recommendation = "recommended"
	reasons := buildRecommendationReasons(out[0], out)
	out[0].RecommendationReasons = reasons
	out[0].Reason = reasons[0].Message
	for i := 1; i < len(out); i++ {
		out[i].Recommendation = "alternative"
		out[i].Reason = "Alternative route ranked lower after safety, reliability, accessibility, ETA, weather, and distance were considered."
		out[i].RecommendationReasons = []models.RecommendationReason{
			{
				Code:    "LOWER_RANKED_ALTERNATIVE",
				Type:    "alternative",
				Message: out[i].Reason,
				Evidence: map[string]any{
					"route_id":             out[i].RouteID,
					"compared_to_route_id": out[0].RouteID,
					"score_delta":          round(out[0].FinalScore - out[i].FinalScore),
				},
			},
		}
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
func inverseWithGuard(v, min, max, minSpread float64) float64 {
	if max <= min || (max-min) < minSpread {
		return 1
	}
	return clamp(1 - (v-min)/(max-min))
}
func buildRecommendationReasons(best models.ScoredRoute, all []models.ScoredRoute) []models.RecommendationReason {
	if len(all) < 2 {
		return []models.RecommendationReason{
			{
				Code:    "ONLY_ELIGIBLE_ROUTE",
				Type:    "single_option",
				Message: "No eligible alternative route was available for comparison.",
				Evidence: map[string]any{
					"route_id": best.RouteID,
				},
			},
		}
	}
	reasons := []models.RecommendationReason{}
	other := all[1]
	deltaETA := best.ETAMinutes - other.ETAMinutes
	deltaLandslide := other.LandslideRisk - best.LandslideRisk

	if deltaLandslide >= 0.10 {
		msg := fmt.Sprintf("Lower landslide exposure (%.2f vs %.2f) reduces disruption risk along this corridor.", best.LandslideRisk, other.LandslideRisk)
		if deltaETA > 0 {
			msg = fmt.Sprintf("Lower landslide risk (%.2f vs %.2f) and stronger route quality outweigh %.0f additional minutes of travel time.", best.LandslideRisk, other.LandslideRisk, deltaETA)
		}
		reasons = append(reasons, models.RecommendationReason{
			Code:    "LOWER_HAZARD_EXPOSURE",
			Type:    "hazard_mitigation",
			Message: msg,
			Evidence: map[string]any{
				"route_id":          best.RouteID,
				"compared_route_id": other.RouteID,
				"exposure_delta":    round(deltaLandslide),
				"eta_delta_minutes": round(deltaETA),
			},
		})
	}
	if other.ETAMinutes-best.ETAMinutes >= 3.0 {
		reasons = append(reasons, models.RecommendationReason{
			Code:    "SHORTER_ETA",
			Type:    "efficiency",
			Message: fmt.Sprintf("Saves %.0f minutes of travel time compared to alternative corridor.", other.ETAMinutes-best.ETAMinutes),
			Evidence: map[string]any{
				"route_id":          best.RouteID,
				"compared_route_id": other.RouteID,
				"eta_delta_minutes": round(other.ETAMinutes - best.ETAMinutes),
			},
		})
	}
	if other.WeatherRisk-best.WeatherRisk >= 0.15 {
		reasons = append(reasons, models.RecommendationReason{
			Code:    "LOWER_WEATHER_EXPOSURE",
			Type:    "weather",
			Message: "Significantly lower rainfall exposure along the selected corridor.",
			Evidence: map[string]any{
				"route_id":           best.RouteID,
				"compared_route_id":  other.RouteID,
				"weather_risk_delta": round(other.WeatherRisk - best.WeatherRisk),
			},
		})
	}
	if best.Data.FeatureCoverage-other.Data.FeatureCoverage >= 0.15 {
		reasons = append(reasons, models.RecommendationReason{
			Code:    "BETTER_DATA_COVERAGE",
			Type:    "data_quality",
			Message: fmt.Sprintf("Higher feature coverage (%.0f%% vs %.0f%%) provides greater assessment confidence.", best.Data.FeatureCoverage*100, other.Data.FeatureCoverage*100),
			Evidence: map[string]any{
				"route_id":          best.RouteID,
				"compared_route_id": other.RouteID,
				"coverage_delta":    round(best.Data.FeatureCoverage - other.Data.FeatureCoverage),
			},
		})
	}
	if len(reasons) == 0 {
		reasons = append(reasons, models.RecommendationReason{
			Code:    "COMPOSITE_SCORE_ADVANTAGE",
			Type:    "policy_composite",
			Message: "Highest combined safety, reliability, accessibility, ETA, weather, and distance score.",
			Evidence: map[string]any{
				"route_id":          best.RouteID,
				"compared_route_id": other.RouteID,
				"final_score":       best.FinalScore,
			},
		})
	}
	return reasons
}
func hazardAvailability(d models.DataQuality, missingFeature string) string {
	for _, f := range d.MissingFeatures {
		if f == missingFeature {
			return "unavailable"
		}
	}
	if d.TerrainSource == "" {
		return "degraded"
	}
	return "available"
}
func weatherAvailability(d models.DataQuality) string {
	for _, f := range d.MissingFeatures {
		if f == "rainfall_mm" {
			return "unavailable"
		}
	}
	if d.WeatherSource == "" {
		return "unavailable"
	}
	return "available"
}
func sourceQuality(src string) string {
	if src == "" || src == "unknown" {
		return "unavailable"
	}
	if strings.Contains(strings.ToLower(src), "open-meteo") || strings.Contains(strings.ToLower(src), "osrm") {
		return "high"
	}
	if strings.Contains(strings.ToLower(src), "demo") || strings.Contains(strings.ToLower(src), "synthetic") {
		return "unverified"
	}
	return "medium"
}
func riskLevel(val float64) string {
	if val < 0.25 {
		return "low"
	}
	if val < 0.50 {
		return "moderate"
	}
	if val < 0.75 {
		return "high"
	}
	return "severe"
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
