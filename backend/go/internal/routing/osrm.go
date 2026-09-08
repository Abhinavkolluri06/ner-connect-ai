package routing

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/geo"
	"github.com/ner-connect-ai/backend-go/internal/httpjson"
	"github.com/ner-connect-ai/backend-go/internal/locations"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

type OSRMProvider struct {
	BaseURL  string
	Client   *http.Client
	Resolver locations.Resolver
}

func (p OSRMProvider) Healthy(ctx context.Context) bool { return ctx.Err() == nil && p.BaseURL != "" }
func (p OSRMProvider) Routes(ctx context.Context, in models.AnalyzeRequest) ([]models.RouteCandidate, error) {
	a, err := p.Resolver.Resolve(ctx, in.Origin)
	if err != nil {
		return nil, fmt.Errorf("origin: %w", err)
	}
	b, err := p.Resolver.Resolve(ctx, in.Destination)
	if err != nil {
		return nil, fmt.Errorf("destination: %w", err)
	}
	if geo.DistanceKM(a.Latitude, a.Longitude, b.Latitude, b.Longitude) < .1 {
		return nil, fmt.Errorf("endpoints too close")
	}
	u := fmt.Sprintf("%s/route/v1/driving/%.6f,%.6f;%.6f,%.6f?alternatives=2&geometries=geojson&overview=full&steps=false", strings.TrimRight(p.BaseURL, "/"), a.Longitude, a.Latitude, b.Longitude, b.Latitude)
	var data struct {
		Code   string `json:"code"`
		Routes []struct {
			Distance float64           `json:"distance"`
			Duration float64           `json:"duration"`
			Geometry models.LineString `json:"geometry"`
		}
	}
	if err := httpjson.Do(ctx, p.Client, "GET", u, "", nil, &data, 4<<20); err != nil {
		return nil, err
	}
	if data.Code != "Ok" || len(data.Routes) == 0 {
		return nil, fmt.Errorf("no road route found")
	}
	if len(data.Routes) > 3 {
		return nil, fmt.Errorf("routing response exceeds alternative limit")
	}
	out := []models.RouteCandidate{}
	seen := map[string]bool{}
	for _, r := range data.Routes {
		c, err := Candidate(r.Distance, r.Duration, r.Geometry, "OSRM / OpenStreetMap")
		if err != nil {
			return nil, err
		}
		if seen[c.RouteID] {
			continue
		}
		seen[c.RouteID] = true
		c.VehicleSuitability = "car_profile_only"
		c.Data.Warnings = append(c.Data.Warnings, "OSRM driving profile does not verify truck dimensions, motorcycle access, current closures or emergency exemptions.")
		out = append(out, c)
	}
	return out, nil
}

// Candidate validates real road geometry and samples at most 16 points by
// cumulative road distance. Sampling is not an exhaustive hazard survey.
func Candidate(distance, duration float64, g models.LineString, source string) (models.RouteCandidate, error) {
	if math.IsNaN(distance) || math.IsNaN(duration) || math.IsInf(distance, 0) || math.IsInf(duration, 0) || distance <= 0 || duration <= 0 || distance > 5e6 || duration > 7*86400 {
		return models.RouteCandidate{}, fmt.Errorf("invalid route distance or duration")
	}
	if g.Type != "LineString" || len(g.Coordinates) < 2 || len(g.Coordinates) > 100000 {
		return models.RouteCandidate{}, fmt.Errorf("invalid route geometry")
	}
	for _, p := range g.Coordinates {
		if len(p) < 2 || !geo.Valid(p[1], p[0]) {
			return models.RouteCandidate{}, fmt.Errorf("invalid route coordinate")
		}
	}
	data, _ := json.Marshal(g)
	hash := sha256.Sum256(data)
	c := models.RouteCandidate{RouteID: "route-" + hex.EncodeToString(hash[:8]), DistanceKM: distance / 1000, ETAMinutes: duration / 60, GeoJSON: &g, Reliability: .5,
		Data: models.DataQuality{RoutingSource: source, RetrievedAt: time.Now().UTC(), MissingFeatures: []string{"rainfall_mm", "slope_deg", "elevation_m", "historical_landslides", "road_condition_score"}, Warnings: []string{"Risk indices are unvalidated planning estimates, not probabilities or a road-safety guarantee.", "Unknown numeric features use explicit placeholders (road quality 50/100, other features zero) until enriched; consult missing_features."}}}
	dist := make([]float64, len(g.Coordinates))
	for i := 1; i < len(dist); i++ {
		p, q := g.Coordinates[i-1], g.Coordinates[i]
		dist[i] = dist[i-1] + geo.DistanceKM(p[1], p[0], q[1], q[0])
	}
	count := int(math.Ceil(dist[len(dist)-1]/5)) + 1
	if count > 16 {
		count = 16
	}
	if count < 2 {
		count = 2
	}
	i := 0
	last := -1
	for j := 0; j < count; j++ {
		target := float64(j) * dist[len(dist)-1] / float64(count-1)
		for i < len(dist)-1 && dist[i] < target {
			i++
		}
		if i == last {
			continue
		}
		last = i
		p := g.Coordinates[i]
		c.Segments = append(c.Segments, models.Segment{Latitude: p[1], Longitude: p[0], RoadConditionScore: 50})
	}
	return c, nil
}
