package routing

import (
	"context"
	"encoding/json"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOSRMRealGeometrySingleAlternativeAndValidation(t *testing.T) {
	for _, bad := range []bool{false, true} {
		t.Run(map[bool]string{false: "valid", true: "invalid_coordinate"}[bad], func(t *testing.T) {
			s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasPrefix(r.URL.Path, "/route/v1/driving/91.745800,26.184400;") || r.URL.Query().Get("geometries") != "geojson" {
					t.Error("wrong route query", r.URL)
				}
				g := models.LineString{Type: "LineString", Coordinates: [][]float64{{91.7458, 26.1844}, {91.82, 25.8}, {91.88313, 25.56892}}}
				if bad {
					g.Coordinates[1][1] = 200
				}
				json.NewEncoder(w).Encode(map[string]any{"code": "Ok", "routes": []any{map[string]any{"distance": 110000, "duration": 7200, "geometry": g}}})
			}))
			defer s.Close()
			p := OSRMProvider{BaseURL: s.URL, Client: s.Client()}
			routes, err := p.Routes(context.Background(), models.AnalyzeRequest{Origin: "guwahati", Destination: "shillong"})
			if bad {
				if err == nil {
					t.Fatal("invalid coordinates accepted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if len(routes) != 1 || routes[0].GeoJSON == nil || routes[0].DistanceKM != 110 || len(routes[0].Segments) > 16 || len(routes[0].Data.MissingFeatures) != 5 {
				t.Fatalf("bad candidate %+v", routes)
			}
		})
	}
}
func TestORSForwardsTruckRestrictions(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v2/directions/driving-hgv/geojson" || r.Header.Get("Authorization") != "test-key" {
			t.Error("wrong hgv request")
		}
		var body map[string]any
		json.NewDecoder(r.Body).Decode(&body)
		opts := body["options"].(map[string]any)
		restr := opts["profile_params"].(map[string]any)["restrictions"].(map[string]any)
		if opts["vehicle_type"] != "hgv" || restr["weight"] != 12.0 || restr["height"] != 3.5 {
			t.Error("dimensions not forwarded", opts)
		}
		w.Write([]byte(`{"type":"FeatureCollection","features":[{"geometry":{"type":"LineString","coordinates":[[91.7458,26.1844],[91.88313,25.56892]]},"properties":{"summary":{"distance":110000,"duration":7200}}}]}`))
	}))
	defer s.Close()
	p := ORSProvider{BaseURL: s.URL, APIKey: "test-key", Client: s.Client()}
	out, err := p.Routes(context.Background(), models.AnalyzeRequest{Origin: "guwahati", Destination: "shillong", Vehicle: "truck", VehicleDimensions: &models.VehicleDimensions{WeightT: 12, HeightM: 3.5}})
	if err != nil || len(out) != 1 || out[0].VehicleSuitability != "driving-hgv" {
		t.Fatalf("%+v %v", out, err)
	}
}
