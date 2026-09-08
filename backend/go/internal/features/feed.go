package features

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/geo"
	"github.com/ner-connect-ai/backend-go/internal/httpjson"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

// Feed accepts a validated, source-labelled incident/road survey snapshot.
// Historical events are presence-only observations, never negative labels.
type Feed struct {
	Path, URL string
	Client    *http.Client
	mu        sync.Mutex
	cached    *Snapshot
	loaded    time.Time
}
type Snapshot struct {
	Source     string        `json:"source"`
	License    string        `json:"license"`
	UpdatedAt  time.Time     `json:"updated_at"`
	ValidUntil time.Time     `json:"valid_until"`
	Items      []Observation `json:"items"`
}
type Observation struct {
	ID              string    `json:"id"`
	Kind            string    `json:"kind"` // landslide, road_condition, restriction, closure
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
	RadiusKM        float64   `json:"radius_km"`
	ObservedAt      time.Time `json:"observed_at"`
	ExpiresAt       time.Time `json:"expires_at,omitempty"`
	RoadCondition   *float64  `json:"road_condition_score,omitempty"`
	BlockedVehicles []string  `json:"blocked_vehicles,omitempty"`
	MaxWeightT      float64   `json:"max_weight_t,omitempty"`
	MaxHeightM      float64   `json:"max_height_m,omitempty"`
	Note            string    `json:"note"`
}

func (f *Feed) Load(ctx context.Context) (*Snapshot, error) {
	if f == nil || (f.Path == "" && f.URL == "") {
		return nil, nil
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.cached != nil && time.Since(f.loaded) < time.Minute && time.Now().Before(f.cached.ValidUntil) {
		return f.cached, nil
	}
	var s Snapshot
	if f.URL != "" {
		if err := httpjson.Do(ctx, f.Client, "GET", f.URL, "", nil, &s, 5<<20); err != nil {
			return nil, err
		}
	} else {
		file, err := os.Open(f.Path)
		if err != nil {
			return nil, err
		}
		defer file.Close()
		b, err := io.ReadAll(io.LimitReader(file, (5<<20)+1))
		if err != nil {
			return nil, err
		}
		if len(b) > 5<<20 {
			return nil, fmt.Errorf("feed too large")
		}
		if err = json.Unmarshal(b, &s); err != nil {
			return nil, err
		}
	}
	if err := s.Validate(time.Now()); err != nil {
		return nil, err
	}
	f.cached = &s
	f.loaded = time.Now()
	return &s, nil
}
func (s *Snapshot) Validate(now time.Time) error {
	if strings.TrimSpace(s.Source) == "" || strings.TrimSpace(s.License) == "" || s.UpdatedAt.IsZero() || s.UpdatedAt.After(now.Add(5*time.Minute)) || !s.ValidUntil.After(now) || !s.ValidUntil.After(s.UpdatedAt) || len(s.Items) > 10000 {
		return fmt.Errorf("feed missing provenance, expired, future-dated or oversized")
	}
	ids := map[string]bool{}
	for _, v := range s.Items {
		if v.ID == "" || ids[v.ID] || !geo.Valid(v.Latitude, v.Longitude) || v.RadiusKM <= 0 || v.RadiusKM > 20 || v.ObservedAt.IsZero() || v.ObservedAt.After(now.Add(5*time.Minute)) {
			return fmt.Errorf("invalid incident identity, coordinate, date or radius")
		}
		ids[v.ID] = true
		switch v.Kind {
		case "landslide":
		case "closure", "restriction", "road_condition":
			if v.ExpiresAt.IsZero() || !v.ExpiresAt.After(v.ObservedAt) {
				return fmt.Errorf("current road observation requires expiry")
			}
		default:
			return fmt.Errorf("unknown observation kind")
		}
		if v.Kind == "road_condition" && (v.RoadCondition == nil || *v.RoadCondition < 0 || *v.RoadCondition > 100) {
			return fmt.Errorf("invalid road score")
		}
		if v.MaxHeightM < 0 || v.MaxWeightT < 0 {
			return fmt.Errorf("negative road restriction")
		}
		for _, vehicle := range v.BlockedVehicles {
			if vehicle != "truck" && vehicle != "car" && vehicle != "motorcycle" && vehicle != "ambulance" {
				return fmt.Errorf("invalid blocked vehicle")
			}
		}
	}
	return nil
}

// Apply returns reasons to EXCLUDE a route, never a mere scoring penalty for a
// known closure/vehicle prohibition. Unknown clearances remain explicitly unknown.
func (s *Snapshot) Apply(c *models.RouteCandidate, req models.AnalyzeRequest, now time.Time) []string {
	if s == nil {
		return nil
	}
	blocked := []string{}
	roadKnown := make([]bool, len(c.Segments))
	historyMatched := false
	coords := [][]float64{}
	if c.GeoJSON != nil {
		coords = c.GeoJSON.Coordinates
	} else {
		for _, p := range c.Segments {
			coords = append(coords, []float64{p.Longitude, p.Latitude})
		}
	}
	for _, v := range s.Items {
		if v.Kind != "landslide" && !v.ExpiresAt.After(now) {
			continue
		}
		if geo.PointLineKM(v.Latitude, v.Longitude, coords) > v.RadiusKM {
			continue
		}
		if v.Kind == "closure" {
			blocked = append(blocked, "active road closure: "+v.ID)
			continue
		}
		if v.Kind == "restriction" {
			for _, veh := range v.BlockedVehicles {
				if req.Vehicle == veh {
					blocked = append(blocked, "vehicle prohibited: "+v.ID)
				}
			}
			if d := req.VehicleDimensions; d != nil {
				if v.MaxHeightM > 0 && (d.HeightM == 0 || d.HeightM > v.MaxHeightM) {
					blocked = append(blocked, "height clearance exceeded or unknown: "+v.ID)
				}
				if v.MaxWeightT > 0 && (d.WeightT == 0 || d.WeightT > v.MaxWeightT) {
					blocked = append(blocked, "weight clearance exceeded or unknown: "+v.ID)
				}
			} else if v.MaxHeightM > 0 || v.MaxWeightT > 0 {
				blocked = append(blocked, "vehicle dimensions required for restriction: "+v.ID)
			}
		}
		for i, p := range c.Segments {
			if geo.DistanceKM(p.Latitude, p.Longitude, v.Latitude, v.Longitude) > v.RadiusKM {
				continue
			}
			if v.Kind == "landslide" {
				c.Segments[i].HistoricalLandslides++
				historyMatched = true
			}
			if v.Kind == "road_condition" {
				if !roadKnown[i] || *v.RoadCondition < c.Segments[i].RoadConditionScore {
					c.Segments[i].RoadConditionScore = *v.RoadCondition
				}
				roadKnown[i] = true
			}
		}
	}
	// An inventory containing no event near a point is not proof of zero events.
	c.Data.HistorySource = s.Source + " (presence-only inventory; no-event areas remain unknown)"
	if historyMatched {
		c.Data.Warnings = append(c.Data.Warnings, "Historical landslide reports overlap sampled points; inventory completeness is unknown.")
	}
	allRoadKnown := len(roadKnown) > 0
	for _, known := range roadKnown {
		allRoadKnown = allRoadKnown && known
	}
	if allRoadKnown {
		Known(c, "road_condition_score")
		total := 0.0
		for _, p := range c.Segments {
			total += p.RoadConditionScore
		}
		c.Reliability = total / float64(len(c.Segments)) / 100
	}
	c.Data.RoadSource = s.Source + "; expires " + s.ValidUntil.UTC().Format(time.RFC3339)
	return blocked
}
