package routing

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/ner-connect-ai/backend-go/internal/geo"
	"github.com/ner-connect-ai/backend-go/internal/httpjson"
	"github.com/ner-connect-ai/backend-go/internal/locations"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

// ORSProvider supplies driving-hgv routing with gross vehicle restrictions.
// Hosted ORS limits alternative requests to 100km; longer requests use a single
// real route. We never disguise a driving-car fallback as truck routing.
type ORSProvider struct {
	BaseURL, APIKey string
	Client          *http.Client
	Resolver        locations.Resolver
}

func (p ORSProvider) Healthy(ctx context.Context) bool { return ctx.Err() == nil && p.BaseURL != "" }
func (p ORSProvider) Routes(ctx context.Context, in models.AnalyzeRequest) ([]models.RouteCandidate, error) {
	a, err := p.Resolver.Resolve(ctx, in.Origin)
	if err != nil {
		return nil, err
	}
	b, err := p.Resolver.Resolve(ctx, in.Destination)
	if err != nil {
		return nil, err
	}
	if geo.DistanceKM(a.Latitude, a.Longitude, b.Latitude, b.Longitude) < .1 {
		return nil, fmt.Errorf("endpoints too close")
	}
	profile := "driving-car"
	options := map[string]any{"avoid_borders": "all"}
	if in.Vehicle == "truck" {
		profile = "driving-hgv"
		options["vehicle_type"] = "hgv"
		dims := map[string]float64{}
		if d := in.VehicleDimensions; d != nil {
			for k, v := range map[string]float64{"weight": d.WeightT, "height": d.HeightM, "width": d.WidthM, "length": d.LengthM, "axleload": d.AxleLoadT} {
				if v > 0 {
					dims[k] = v
				}
			}
		}
		if len(dims) > 0 {
			options["profile_params"] = map[string]any{"restrictions": dims}
		}
	}
	body := map[string]any{"coordinates": [][]float64{{a.Longitude, a.Latitude}, {b.Longitude, b.Latitude}}, "instructions": false, "options": options}
	// First request gets actual distance; only ask for alternatives inside the
	// provider's documented distance limit, avoiding a length-based 400 failure.
	u := strings.TrimRight(p.BaseURL, "/") + "/v2/directions/" + profile + "/geojson"
	type result struct {
		Type     string `json:"type"`
		Features []struct {
			Geometry   models.LineString `json:"geometry"`
			Properties struct {
				Summary struct {
					Distance float64 `json:"distance"`
					Duration float64 `json:"duration"`
				} `json:"summary"`
			} `json:"properties"`
		} `json:"features"`
	}
	var data result
	if err := httpjson.Do(ctx, p.Client, "POST", u, p.APIKey, body, &data, 4<<20); err != nil {
		return nil, err
	}
	if len(data.Features) == 0 {
		return nil, fmt.Errorf("no road route found")
	}
	alternativeFailed := false
	if data.Features[0].Properties.Summary.Distance < 100000 {
		body["alternative_routes"] = map[string]any{"target_count": 3, "share_factor": .6, "weight_factor": 1.4}
		var alternatives result
		if err := httpjson.Do(ctx, p.Client, "POST", u, p.APIKey, body, &alternatives, 4<<20); err == nil && len(alternatives.Features) > 0 {
			data = alternatives
		} else {
			alternativeFailed = true
		}
	}
	if len(data.Features) > 3 {
		return nil, fmt.Errorf("too many route alternatives")
	}
	out := []models.RouteCandidate{}
	seen := map[string]bool{}
	for _, f := range data.Features {
		c, err := Candidate(f.Properties.Summary.Distance, f.Properties.Summary.Duration, f.Geometry, "openrouteservice / OpenStreetMap")
		if err != nil {
			return nil, err
		}
		if seen[c.RouteID] {
			continue
		}
		seen[c.RouteID] = true
		c.VehicleSuitability = profile
		c.Data.Warnings = append(c.Data.Warnings, "Vehicle restrictions depend on incomplete OpenStreetMap tags; current road access must be verified locally.")
		if in.Vehicle == "truck" && in.VehicleDimensions == nil {
			c.Data.Warnings = append(c.Data.Warnings, "Truck dimensions are unknown; dimensional clearance was not requested.")
		}
		if alternativeFailed {
			c.Data.Warnings = append(c.Data.Warnings, "Alternative route request failed; the original real route is retained.")
		}
		out = append(out, c)
	}
	return out, nil
}
