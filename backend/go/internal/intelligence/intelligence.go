package intelligence

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
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
		RouteID            *string  `json:"route_id"`
		LandslideRisk      *float64 `json:"landslide_risk"`
		FloodRisk          *float64 `json:"flood_risk"`
		WeatherRisk        *float64 `json:"weather_risk"`
		AccessibilityScore *float64 `json:"accessibility_score"`
		Confidence         *float64 `json:"confidence"`
	}
	dec := json.NewDecoder(io.LimitReader(resp.Body, limit))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&payloadOut); err != nil {
		return models.RiskResponse{}, fmt.Errorf("decode intelligence response: %w", err)
	}
	if payloadOut.RouteID == nil || payloadOut.LandslideRisk == nil || payloadOut.FloodRisk == nil || payloadOut.WeatherRisk == nil || payloadOut.AccessibilityScore == nil || payloadOut.Confidence == nil {
		return models.RiskResponse{}, fmt.Errorf("intelligence response missing required fields")
	}
	out := models.RiskResponse{RouteID: *payloadOut.RouteID, LandslideRisk: *payloadOut.LandslideRisk, FloodRisk: *payloadOut.FloodRisk, WeatherRisk: *payloadOut.WeatherRisk, AccessibilityScore: *payloadOut.AccessibilityScore, Confidence: *payloadOut.Confidence}
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

func (HeuristicFallbackRiskProvider) AnalyzeRisk(_ context.Context, r models.RiskRequest) (models.RiskResponse, error) {
	if len(r.Segments) == 0 {
		return models.RiskResponse{}, fmt.Errorf("fallback requires route segments")
	}
	var rain, slope, elevation, historical, road float64
	for _, s := range r.Segments {
		rain += clamp(s.RainfallMM / 120)
		slope += clamp(s.SlopeDeg / 45)
		elevation += clamp(s.ElevationM / 2500)
		historical += clamp(float64(s.HistoricalLandslides) / 10)
		road += clamp(s.RoadConditionScore / 100)
	}
	n := float64(len(r.Segments))
	rain /= n
	slope /= n
	elevation /= n
	historical /= n
	road /= n
	landslide := clamp(.25*rain + .30*slope + .15*elevation + .20*historical + .10*(1-road))
	flood := clamp(.65*rain + .20*(1-elevation) + .15*(1-road))
	weather := clamp(rain)
	return models.RiskResponse{RouteID: r.RouteID, LandslideRisk: landslide, FloodRisk: flood, WeatherRisk: weather, AccessibilityScore: clamp(.75*road + .25*(1-slope)), Confidence: .55}, nil
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
