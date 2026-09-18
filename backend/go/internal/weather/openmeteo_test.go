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

func TestArrivalAwareWeatherForecast(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rows := []any{}
		for i := 1; i <= 3; i++ {
			rain := []any{}
			times := []string{}
			for j := 0; j < 24; j++ {
				// hourly rainfall: hour * 10
				rain = append(rain, float64(j*10))
				times = append(times, fmt.Sprintf("2026-09-07T%02d:00", j))
			}
			rows = append(rows, map[string]any{
				"hourly_units": map[string]string{"rain": "mm"},
				"hourly":       map[string]any{"rain": rain, "time": times},
			})
		}
		json.NewEncoder(w).Encode(rows)
	}))
	defer s.Close()

	p := OpenMeteoProvider{BaseURL: s.URL, Client: s.Client()}
	candidate := models.RouteCandidate{
		RouteID:    "route-timed",
		ETAMinutes: 120, // 2 hours
		Segments: []models.Segment{
			{Latitude: 26.1, Longitude: 91.7},
			{Latitude: 25.8, Longitude: 91.8},
			{Latitude: 25.5, Longitude: 91.9},
		},
	}

	got, err := p.Weather(context.Background(), candidate)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got.ArrivalAware {
		t.Fatalf("expected ArrivalAware to be true")
	}
	if len(got.SegmentArrivals) != 3 {
		t.Fatalf("expected 3 segment arrival timestamps, got %d", len(got.SegmentArrivals))
	}
	if len(got.SegmentRainfallMM) != 3 {
		t.Fatalf("expected 3 segment rainfall values, got %d", len(got.SegmentRainfallMM))
	}
}
