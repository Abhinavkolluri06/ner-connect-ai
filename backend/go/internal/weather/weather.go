package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"io"
	"net/http"
	"strings"
)

type Provider interface {
	Weather(context.Context, models.RouteCandidate) (models.Weather, error)
	Healthy(context.Context) bool
}
type DemoProvider struct{}

func (DemoProvider) Healthy(context.Context) bool { return true }
func (DemoProvider) Weather(_ context.Context, r models.RouteCandidate) (models.Weather, error) {
	values := map[string]models.Weather{"route-a": {RainfallMM: 90, Risk: .75}, "route-b": {RainfallMM: 24, Risk: .2}, "route-c": {RainfallMM: 55, Risk: .46}}
	v, ok := values[r.RouteID]
	if !ok {
		return models.Weather{}, fmt.Errorf("demo weather unavailable")
	}
	return v, nil
}

type MockProvider struct {
	Value  models.Weather
	Values map[string]models.Weather
	Err    error
}

func (m MockProvider) Healthy(context.Context) bool { return m.Err == nil }
func (m MockProvider) Weather(_ context.Context, r models.RouteCandidate) (models.Weather, error) {
	if m.Err != nil {
		return models.Weather{}, m.Err
	}
	if v, ok := m.Values[r.RouteID]; ok {
		return v, nil
	}
	return m.Value, nil
}

type LiveProvider struct {
	BaseURL, APIKey  string
	Client           *http.Client
	MaxResponseBytes int64
}

func (p LiveProvider) Healthy(ctx context.Context) bool {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, p.BaseURL+"/health", nil)
	resp, err := p.Client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 500
}
func (p LiveProvider) Weather(ctx context.Context, r models.RouteCandidate) (models.Weather, error) {
	endpoint := strings.TrimRight(p.BaseURL, "/") + "/weather?route_id=" + r.RouteID
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return models.Weather{}, err
	}
	if p.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+p.APIKey)
	}
	resp, err := p.Client.Do(req)
	if err != nil {
		return models.Weather{}, fmt.Errorf("weather request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusTooManyRequests {
		return models.Weather{}, fmt.Errorf("weather provider rate limited")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return models.Weather{}, fmt.Errorf("weather provider status %d", resp.StatusCode)
	}
	limit := p.MaxResponseBytes
	if limit <= 0 {
		limit = 1 << 20
	}
	var payload struct {
		RainfallMM *float64 `json:"rainfall_mm"`
		Risk       *float64 `json:"risk"`
	}
	if err = json.NewDecoder(io.LimitReader(resp.Body, limit)).Decode(&payload); err != nil {
		return models.Weather{}, fmt.Errorf("decode weather response: %w", err)
	}
	if payload.RainfallMM == nil || payload.Risk == nil {
		return models.Weather{}, fmt.Errorf("weather response missing required values")
	}
	out := models.Weather{RainfallMM: *payload.RainfallMM, Risk: *payload.Risk}
	if out.Risk < 0 || out.Risk > 1 || out.RainfallMM < 0 {
		return out, fmt.Errorf("invalid weather values")
	}
	return out, nil
}
