package intelligence

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"sort"
	"strings"

	"github.com/ner-connect-ai/backend-go/internal/models"
)

type Provider interface {
	AnalyzeRisk(context.Context, models.RiskRequest) (models.RiskResponse, error)
}

type HTTPClient struct {
	BaseURL          string
	Client           *http.Client
	MaxResponseBytes int64
}

func (c HTTPClient) AnalyzeRisk(ctx context.Context, in models.RiskRequest) (models.RiskResponse, error) {
	payload, err := json.Marshal(in)
	if err != nil {
		return models.RiskResponse{}, fmt.Errorf("encode intelligence request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(c.BaseURL, "/")+"/internal/v1/risk/analyze", bytes.NewReader(payload))
	if err != nil {
		return models.RiskResponse{}, fmt.Errorf("create intelligence request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.Client.Do(req)
	if err != nil {
		return models.RiskResponse{}, fmt.Errorf("intelligence request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return models.RiskResponse{}, fmt.Errorf("intelligence service status %d", resp.StatusCode)
	}
	limit := c.MaxResponseBytes
	if limit <= 0 {
		limit = 1 << 20
	}
	var payloadOut struct {
		RouteID            *string         `json:"route_id"`
		LandslideRisk      *float64        `json:"landslide_risk"`
		FloodRisk          *float64        `json:"flood_risk"`
		WeatherRisk        *float64        `json:"weather_risk"`
		AccessibilityScore *float64        `json:"accessibility_score"`
		Confidence         *float64        `json:"confidence"`
		ModelMode          json.RawMessage `json:"model_mode"`
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil || int64(len(raw)) > limit {
		return models.RiskResponse{}, fmt.Errorf("intelligence response exceeds limit or cannot be read")
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&payloadOut); err != nil {
		return models.RiskResponse{}, fmt.Errorf("decode intelligence response: %w", err)
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return models.RiskResponse{}, fmt.Errorf("intelligence response contains extra JSON")
	}
	if payloadOut.RouteID == nil || payloadOut.LandslideRisk == nil || payloadOut.FloodRisk == nil || payloadOut.WeatherRisk == nil || payloadOut.AccessibilityScore == nil || payloadOut.Confidence == nil {
		return models.RiskResponse{}, fmt.Errorf("intelligence response missing required fields")
	}
	out := models.RiskResponse{RouteID: *payloadOut.RouteID, LandslideRisk: *payloadOut.LandslideRisk, FloodRisk: *payloadOut.FloodRisk, WeatherRisk: *payloadOut.WeatherRisk, AccessibilityScore: *payloadOut.AccessibilityScore, Confidence: *payloadOut.Confidence}
	// Older services omit model_mode; a supplied value must identify the engine.
	if len(payloadOut.ModelMode) > 0 {
		if err := json.Unmarshal(payloadOut.ModelMode, &out.ModelMode); err != nil || (out.ModelMode != "heuristic" && out.ModelMode != "ml") {
			return out, fmt.Errorf("invalid model_mode: must be heuristic or ml")
		}
	}
	if out.RouteID != in.RouteID {
		return out, fmt.Errorf("intelligence route ID mismatch")
	}
	if err := validate(out); err != nil {
		return out, err
	}
	return out, nil
}

func validate(v models.RiskResponse) error {
	values := map[string]float64{"landslide_risk": v.LandslideRisk, "flood_risk": v.FloodRisk, "weather_risk": v.WeatherRisk, "accessibility_score": v.AccessibilityScore, "confidence": v.Confidence}
	for name, n := range values {
		if math.IsNaN(n) || math.IsInf(n, 0) || n < 0 || n > 1 {
			return fmt.Errorf("invalid %s: must be between 0 and 1", name)
		}
	}
	return nil
}

type MockProvider struct {
	Response  models.RiskResponse
	Responses map[string]models.RiskResponse
	Err       error
}

func (m MockProvider) AnalyzeRisk(_ context.Context, r models.RiskRequest) (models.RiskResponse, error) {
	if m.Err != nil {
		return models.RiskResponse{}, m.Err
	}
	if v, ok := m.Responses[r.RouteID]; ok {
		return v, nil
	}
	v := m.Response
	if v.RouteID == "" {
		v.RouteID = r.RouteID
	}
	return v, nil
}

// HeuristicFallbackRiskProvider is deterministic and is not a trained ML model.
type HeuristicFallbackRiskProvider struct{}

func (HeuristicFallbackRiskProvider) AnalyzeRisk(ctx context.Context, r models.RiskRequest) (models.RiskResponse, error) {
	if len(r.Segments) == 0 {
		return models.RiskResponse{}, fmt.Errorf("fallback requires route segments")
	}
	if err := ctx.Err(); err != nil {
		return models.RiskResponse{}, err
	}
	land, floods, weatherRisks, accessibility := []float64{}, []float64{}, []float64{}, []float64{}
	for _, s := range r.Segments {
		for _, v := range []float64{s.RainfallMM, s.SlopeDeg, s.ElevationM, s.RoadConditionScore} {
			if math.IsNaN(v) || math.IsInf(v, 0) {
				return models.RiskResponse{}, fmt.Errorf("non-finite segment feature")
			}
		}
		if s.RainfallMM < 0 || s.SlopeDeg < 0 || s.SlopeDeg > 90 || s.HistoricalLandslides < 0 || s.RoadConditionScore < 0 || s.RoadConditionScore > 100 {
			return models.RiskResponse{}, fmt.Errorf("invalid segment feature")
		}
		rain := clamp(s.RainfallMM / 120)
		slope := clamp(s.SlopeDeg / 45)
		elevation := clamp(s.ElevationM / 2500)
		history := clamp(float64(s.HistoricalLandslides) / 10)
		road := clamp(s.RoadConditionScore / 100)
		l := clamp(.30*rain + .35*slope + .25*history + .10*(1-road))
		f := clamp(.65*rain + .20*(1-elevation) + .15*(1-slope))
		land = append(land, l)
		floods = append(floods, f)
		weatherRisks = append(weatherRisks, rain)
		accessibility = append(accessibility, clamp(.60*road+.15*(1-slope)+.10*(1-rain)+.15*(1-math.Max(l, f))))
	}
	minAccess, mean := 1.0, 0.0
	for _, a := range accessibility {
		minAccess = math.Min(minAccess, a)
		mean += a
	}
	mean /= float64(len(accessibility))
	// Confidence is required-field completeness, NOT statistical confidence.
	return models.RiskResponse{RouteID: r.RouteID, LandslideRisk: aggregate(land), FloodRisk: aggregate(floods), WeatherRisk: aggregate(weatherRisks), AccessibilityScore: clamp(.6*minAccess + .4*mean), Confidence: 1, ModelMode: "heuristic"}, nil
}
func aggregate(values []float64) float64 {
	sort.Float64s(values)
	position := .9 * float64(len(values)-1)
	lo := int(position)
	hi := int(math.Ceil(position))
	p90 := values[lo] + (values[hi]-values[lo])*(position-float64(lo))
	return clamp(.6*values[len(values)-1] + .4*p90)
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
