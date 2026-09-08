package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestForecastBySegmentAndRejectsMissingValues(t *testing.T) {
	for _, missing := range []bool{false, true} {
		t.Run(fmt.Sprint(missing), func(t *testing.T) {
			s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Query().Get("forecast_hours") != "24" || r.URL.Query().Get("hourly") != "rain" {
					t.Error("wrong forecast query")
				}
				rows := []any{}
				for i := 1; i <= 2; i++ {
					rain := []any{}
					times := []string{}
					for j := 0; j < 24; j++ {
						rain = append(rain, float64(i))
						times = append(times, fmt.Sprintf("2026-09-07T%02d:00", j))
					}
					if missing {
						rain[3] = nil
					}
					rows = append(rows, map[string]any{"hourly_units": map[string]string{"rain": "mm"}, "hourly": map[string]any{"rain": rain, "time": times}})
				}
				json.NewEncoder(w).Encode(rows)
			}))
			defer s.Close()
			got, err := (OpenMeteoProvider{BaseURL: s.URL, Client: s.Client()}).Weather(context.Background(), models.RouteCandidate{Segments: []models.Segment{{Latitude: 26, Longitude: 91}, {Latitude: 25, Longitude: 92}}})
			if missing {
				if err == nil {
					t.Fatal("null accepted as dry")
				}
				return
			}
			if err != nil || len(got.SegmentRainfallMM) != 2 || got.SegmentRainfallMM[0] != 24 || got.SegmentRainfallMM[1] != 48 || got.Risk != .4 {
				t.Fatalf("%+v %v", got, err)
			}
		})
	}
}
