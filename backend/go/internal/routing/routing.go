package routing

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/ner-connect-ai/backend-go/internal/models"
)

type Provider interface {
	Routes(context.Context, models.AnalyzeRequest) ([]models.RouteCandidate, error)
	Healthy(context.Context) bool
}

type DemoProvider struct{}

func (DemoProvider) Healthy(context.Context) bool { return true }
func (DemoProvider) Routes(_ context.Context, req models.AnalyzeRequest) ([]models.RouteCandidate, error) {
	if !strings.EqualFold(req.Origin, "Guwahati") || !strings.EqualFold(req.Destination, "Shillong") {
		return nil, fmt.Errorf("demo route not found")
	}
	return []models.RouteCandidate{
		{RouteID: "route-a", DistanceKM: 99.4, ETAMinutes: 176, Reliability: .55, Geometry: "demo:a", Segments: []models.Segment{{Latitude: 25.57, Longitude: 91.88, SlopeDeg: 38, ElevationM: 1450, HistoricalLandslides: 9, RoadConditionScore: 52}}},
		{RouteID: "route-b", DistanceKM: 103.2, ETAMinutes: 188, Reliability: .92, Geometry: "demo:b", Segments: []models.Segment{{Latitude: 25.55, Longitude: 91.82, SlopeDeg: 12, ElevationM: 1200, HistoricalLandslides: 1, RoadConditionScore: 88}}},
		{RouteID: "route-c", DistanceKM: 116.8, ETAMinutes: 211, Reliability: .72, Geometry: "demo:c", Segments: []models.Segment{{Latitude: 25.48, Longitude: 91.75, SlopeDeg: 24, ElevationM: 1320, HistoricalLandslides: 4, RoadConditionScore: 70}}},
	}, nil
}

type MockProvider struct {
	Candidates []models.RouteCandidate
	Err        error
}

func (m MockProvider) Routes(context.Context, models.AnalyzeRequest) ([]models.RouteCandidate, error) {
	return m.Candidates, m.Err
}
func (m MockProvider) Healthy(context.Context) bool { return m.Err == nil }

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
func (p LiveProvider) Routes(ctx context.Context, in models.AnalyzeRequest) ([]models.RouteCandidate, error) {
	payload, _ := json.Marshal(in)
	endpoint := strings.TrimRight(p.BaseURL, "/") + "/routes"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if p.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+p.APIKey)
	}
	resp, err := p.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("routing request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("routing provider status %d", resp.StatusCode)
	}
	limit := p.MaxResponseBytes
	if limit <= 0 {
		limit = 2 << 20
	}
	var out []models.RouteCandidate
	if err = json.NewDecoder(io.LimitReader(resp.Body, limit)).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode routing response: %w", err)
	}
	if len(out) < 2 {
		return nil, fmt.Errorf("routing provider returned fewer than two alternatives")
	}
	for _, candidate := range out {
		if strings.TrimSpace(candidate.RouteID) == "" || candidate.DistanceKM <= 0 || candidate.ETAMinutes <= 0 || candidate.Reliability < 0 || candidate.Reliability > 1 || len(candidate.Segments) == 0 {
			return nil, fmt.Errorf("routing provider returned invalid candidate data")
		}
	}
	return out, nil
}

var _ = url.QueryEscape
