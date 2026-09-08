// Package comparison ranks caller-supplied features without external providers.
package comparison

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"strings"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/config"
	"github.com/ner-connect-ai/backend-go/internal/intelligence"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"github.com/ner-connect-ai/backend-go/internal/scoring"
)

const MaxBytes = 4 << 20

type Request struct {
	ScenarioID     string   `json:"scenario_id,omitempty"`
	Description    string   `json:"description,omitempty"`
	DataKind       string   `json:"data_kind,omitempty"`
	Origin         string   `json:"origin,omitempty"`
	Destination    string   `json:"destination,omitempty"`
	Vehicle        string   `json:"vehicle"`
	Cargo          string   `json:"cargo"`
	Priority       string   `json:"priority"`
	MaxHazardIndex *float64 `json:"max_hazard_index,omitempty"`
	Routes         []Route  `json:"routes"`
}
type Route struct {
	RouteID              string   `json:"route_id"`
	DistanceKM           *float64 `json:"distance_km"`
	ETAMinutes           *float64 `json:"eta_minutes"`
	RainfallMM           *float64 `json:"rainfall_mm"`
	SlopeDeg             *float64 `json:"slope_deg"`
	ElevationM           *float64 `json:"elevation_m"`
	HistoricalLandslides *int     `json:"historical_landslides"`
	RoadConditionScore   *float64 `json:"road_condition_score"`
	Closed               bool     `json:"closed,omitempty"`
	BlockedVehicles      []string `json:"blocked_vehicles,omitempty"`
	DelayMinutes         float64  `json:"delay_minutes,omitempty"`
}
type Exclusion struct {
	RouteID string   `json:"route_id"`
	Reasons []string `json:"reasons"`
}
type Result struct {
	ScenarioID         string               `json:"scenario_id,omitempty"`
	Status             string               `json:"status"`
	RecommendedRouteID string               `json:"recommended_route_id,omitempty"`
	Explanation        string               `json:"explanation"`
	ModelMode          string               `json:"model_mode"`
	DataKind           string               `json:"data_kind"`
	Priority           string               `json:"priority"`
	MaxHazardIndex     float64              `json:"max_hazard_index"`
	Routes             []models.ScoredRoute `json:"routes"`
	Excluded           []Exclusion          `json:"excluded_routes"`
	Warnings           []string             `json:"warnings"`
	GeneratedAt        time.Time            `json:"generated_at"`
}

func Decode(r io.Reader, out any) error {
	b, err := io.ReadAll(io.LimitReader(r, MaxBytes+1))
	if err != nil {
		return err
	}
	if len(b) > MaxBytes {
		return fmt.Errorf("JSON exceeds 4 MiB limit")
	}
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields()
	if err = d.Decode(out); err != nil {
		return fmt.Errorf("invalid input JSON: %w", err)
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return fmt.Errorf("provide exactly one JSON object")
	}
	return nil
}
func choice(s string, values ...string) bool {
	for _, v := range values {
		if s == v {
			return true
		}
	}
	return false
}
func (r Request) Validate() error {
	if !choice(r.Vehicle, "car", "truck", "motorcycle", "ambulance") {
		return fmt.Errorf("vehicle must be car, truck, motorcycle or ambulance")
	}
	if !choice(r.Cargo, "general", "food", "medical_supplies", "passengers", "emergency_equipment", "construction_materials", "agricultural_produce") {
		return fmt.Errorf("unsupported cargo")
	}
	if !choice(r.Priority, "normal", "fastest", "safest", "emergency") {
		return fmt.Errorf("priority must be normal, fastest, safest or emergency")
	}
	if r.DataKind != "" && !choice(r.DataKind, "synthetic", "user_supplied") {
		return fmt.Errorf("data_kind must be synthetic or user_supplied")
	}
	if len(r.ScenarioID) > 100 || len(r.Description) > 1000 || len(r.Origin) > 200 || len(r.Destination) > 200 {
		return fmt.Errorf("scenario description or location too long")
	}
	if len(r.Routes) < 2 || len(r.Routes) > 25 {
		return fmt.Errorf("provide 2..25 candidate routes for the same origin and destination")
	}
	if r.MaxHazardIndex != nil && (!finite(*r.MaxHazardIndex) || *r.MaxHazardIndex < 0 || *r.MaxHazardIndex > 1) {
		return fmt.Errorf("max_hazard_index must be 0..1")
	}
	ids := make(map[string]bool, len(r.Routes))
	for _, v := range r.Routes {
		if strings.TrimSpace(v.RouteID) == "" || v.RouteID != strings.TrimSpace(v.RouteID) || len(v.RouteID) > 100 || ids[v.RouteID] {
			return fmt.Errorf("route IDs must be nonempty, trimmed and unique")
		}
		ids[v.RouteID] = true
		for _, s := range [...]struct {
			name     string
			p        *float64
			min, max float64
		}{{"distance_km", v.DistanceKM, .001, 5000}, {"eta_minutes", v.ETAMinutes, .001, 10080}, {"rainfall_mm", v.RainfallMM, 0, 5000}, {"slope_deg", v.SlopeDeg, 0, 90}, {"elevation_m", v.ElevationM, -500, 9000}, {"road_condition_score", v.RoadConditionScore, 0, 100}} {
			if s.p == nil || !finite(*s.p) || *s.p < s.min || *s.p > s.max {
				return fmt.Errorf("route %s: %s is required and must be %.3g..%.3g", v.RouteID, s.name, s.min, s.max)
			}
		}
		if v.HistoricalLandslides == nil || *v.HistoricalLandslides < 0 || *v.HistoricalLandslides > 1000000 {
			return fmt.Errorf("route %s: historical_landslides is required and must be integer 0..1000000", v.RouteID)
		}
		if !finite(v.DelayMinutes) || v.DelayMinutes < 0 || v.DelayMinutes > 10080 {
			return fmt.Errorf("route %s: invalid delay_minutes", v.RouteID)
		}
		for _, vehicle := range v.BlockedVehicles {
			if !choice(vehicle, "car", "truck", "motorcycle", "ambulance") {
				return fmt.Errorf("route %s: invalid blocked vehicle", v.RouteID)
			}
		}
	}
	return nil
}
func finite(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) }

func Evaluate(ctx context.Context, r Request) (Result, error) {
	return evaluate(ctx, r, nil)
}

// EvaluateExperimental uses externally computed experimental landslide scores.
// It retains the original heuristic hazard exclusion as an additional guard.
// The caller must establish model provenance; these are not safety probabilities.
func EvaluateExperimental(ctx context.Context, r Request, scores map[string]float64) (Result, error) {
	if len(scores) != len(r.Routes) {
		return Result{}, fmt.Errorf("experimental scores must cover every route exactly")
	}
	for _, route := range r.Routes {
		score, ok := scores[route.RouteID]
		if !ok || !finite(score) || score < 0 || score > 1 {
			return Result{}, fmt.Errorf("invalid experimental score for %s", route.RouteID)
		}
	}
	return evaluate(ctx, r, scores)
}

func evaluate(ctx context.Context, r Request, scores map[string]float64) (Result, error) {
	if err := r.Validate(); err != nil {
		return Result{}, err
	}
	limit := .8
	if r.MaxHazardIndex != nil {
		limit = *r.MaxHazardIndex
	}
	kind := r.DataKind
	if kind == "" {
		kind = "user_supplied"
	}
	out := Result{ScenarioID: r.ScenarioID, Status: "ok", ModelMode: "heuristic", DataKind: kind, Priority: r.Priority, MaxHazardIndex: limit, Routes: []models.ScoredRoute{}, Excluded: []Exclusion{}, GeneratedAt: time.Now().UTC(), Warnings: []string{
		"Rule-based ranking of supplied inputs only. No trained model, live lookup, or independent verification is used.",
		"Scores and hazard thresholds are unvalidated planning indices, not probabilities or a guarantee of safe travel.",
		"All candidates must connect the same endpoints. Rainfall inputs must use the same 24-hour window; flat route features are representative summaries, not an exhaustive corridor survey.",
		"Vehicle clearance is not verified; blocked_vehicles and closed are caller-supplied restrictions. Delay is supplied, not predicted.",
	}}
	if scores != nil {
		out.ModelMode = "experimental_ml_hybrid"
		out.Warnings[0] = "Experimental externally supplied landslide model scores; flood, weather, accessibility and final ranking remain rules. Not validated for NER."
		out.Warnings = append(out.Warnings, "The original heuristic hazard limit also remains active: an experimental low score cannot clear a rule-flagged route.")
	}
	inputs := make([]scoring.Input, 0, len(r.Routes))
	for _, v := range r.Routes {
		if err := ctx.Err(); err != nil {
			return Result{}, err
		}
		reasons := []string{}
		if v.Closed {
			reasons = append(reasons, "Reported closed in supplied JSON")
		}
		for _, vehicle := range v.BlockedVehicles {
			if vehicle == r.Vehicle {
				reasons = append(reasons, "Requested vehicle is prohibited in supplied JSON")
				break
			}
		}
		segment := models.Segment{RainfallMM: *v.RainfallMM, SlopeDeg: *v.SlopeDeg, ElevationM: *v.ElevationM, HistoricalLandslides: *v.HistoricalLandslides, RoadConditionScore: *v.RoadConditionScore}
		risk, err := (intelligence.HeuristicFallbackRiskProvider{}).AnalyzeRisk(ctx, models.RiskRequest{RouteID: v.RouteID, Segments: []models.Segment{segment}})
		if err != nil {
			return Result{}, err
		}
		highest := math.Max(risk.WeatherRisk, math.Max(risk.LandslideRisk, risk.FloodRisk))
		if scores != nil {
			risk.LandslideRisk = scores[v.RouteID]
			highest = math.Max(highest, risk.LandslideRisk)
			risk.AccessibilityScore = math.Max(0, math.Min(1, .60*(*v.RoadConditionScore/100)+.15*(1-math.Min(1, *v.SlopeDeg/45))+.10*(1-risk.WeatherRisk)+.15*(1-math.Max(risk.LandslideRisk, risk.FloodRisk))))
			risk.ModelMode = "experimental_ml_hybrid"
		}
		if highest > limit {
			reasons = append(reasons, fmt.Sprintf("Highest hazard index %.4f exceeds configured limit %.4f", highest, limit))
		}
		if len(reasons) > 0 {
			out.Excluded = append(out.Excluded, Exclusion{RouteID: v.RouteID, Reasons: reasons})
			continue
		}
		c := models.RouteCandidate{RouteID: v.RouteID, DistanceKM: *v.DistanceKM, ETAMinutes: *v.ETAMinutes + v.DelayMinutes, Reliability: *v.RoadConditionScore / 100, VehicleSuitability: "caller_restrictions_only", PolicyNotes: []string{fmt.Sprintf("ETA includes %.1f minutes of caller-supplied delay.", v.DelayMinutes)}, Data: models.DataQuality{RoutingSource: kind + " JSON", WeatherSource: kind + " JSON", TerrainSource: kind + " JSON", HistorySource: kind + " JSON", RoadSource: kind + " JSON", FeatureCoverage: 1, MissingFeatures: []string{}, Warnings: []string{"Complete input fields do not establish data accuracy."}}}
		inputs = append(inputs, scoring.Input{Candidate: c, Risk: risk})
	}
	if len(inputs) == 0 {
		out.Status = "no_eligible_routes"
		out.Explanation = "No route meets the supplied closure, vehicle and hazard-limit rules. No recommendation is made."
		return out, nil
	}
	engine := scoring.Engine{Normal: config.Weights{Safety: .25, Reliability: .20, Accessibility: .20, ETA: .15, Weather: .10, Distance: .10}, Emergency: config.Weights{Safety: .35, Reliability: .25, Accessibility: .20, ETA: .15, Distance: .05}}
	cargo := r.Cargo
	if cargo == "agricultural_produce" {
		cargo = "food"
	}
	if cargo == "construction_materials" {
		cargo = "general"
	}
	ranked, err := engine.RankRequest(inputs, models.AnalyzeRequest{Vehicle: r.Vehicle, Cargo: cargo, Priority: r.Priority})
	if err != nil {
		return Result{}, err
	}
	out.Routes = ranked
	best := ranked[0]
	out.RecommendedRouteID = best.RouteID
	out.Explanation = fmt.Sprintf("%s has the highest weighted score (%.2f/100) among %d eligible routes under '%s' priority. Distance %.1f km; ETA including supplied delays %.1f minutes. %d route(s) excluded before ranking.", best.RouteID, best.FinalScore*100, len(ranked), r.Priority, best.DistanceKM, best.ETAMinutes, len(out.Excluded))
	if len(ranked) > 1 && ranked[0].FinalScore == ranked[1].FinalScore {
		out.Warnings = append(out.Warnings, "Top displayed scores tie; input order breaks the tie, not evidence that one route is better.")
	}
	if len(ranked) == 1 {
		out.Warnings = append(out.Warnings, "Only one eligible candidate remains; no relative comparison with another eligible route is possible.")
	}
	for i := range out.Routes {
		out.Routes[i].Reason = fmt.Sprintf("Rank %d of %d eligible routes using '%s' weights; inspect score_breakdown for each contribution.", i+1, len(ranked), r.Priority)
	}
	return out, nil
}
