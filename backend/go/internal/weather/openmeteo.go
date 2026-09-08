package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/ner-connect-ai/backend-go/internal/httpjson"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

type OpenMeteoProvider struct {
	BaseURL, APIKey string
	Client          *http.Client
}

func (p OpenMeteoProvider) Healthy(ctx context.Context) bool {
	return ctx.Err() == nil && p.BaseURL != ""
}
func (p OpenMeteoProvider) Weather(ctx context.Context, r models.RouteCandidate) (models.Weather, error) {
	if len(r.Segments) == 0 || len(r.Segments) > 16 {
		return models.Weather{}, fmt.Errorf("weather requires 1..16 sampled locations")
	}
	lat, lon := []string{}, []string{}
	for _, s := range r.Segments {
		lat = append(lat, strconv.FormatFloat(s.Latitude, 'f', 6, 64))
		lon = append(lon, strconv.FormatFloat(s.Longitude, 'f', 6, 64))
	}
	q := url.Values{"latitude": {strings.Join(lat, ",")}, "longitude": {strings.Join(lon, ",")}, "hourly": {"rain"}, "forecast_hours": {"24"}, "timezone": {"UTC"}}
	if p.APIKey != "" {
		q.Set("apikey", p.APIKey)
	}
	var raw json.RawMessage
	if err := httpjson.Do(ctx, p.Client, "GET", strings.TrimRight(p.BaseURL, "/")+"/v1/forecast?"+q.Encode(), "", nil, &raw, 2<<20); err != nil {
		return models.Weather{}, err
	}
	type forecast struct {
		Hourly struct {
			Time []string   `json:"time"`
			Rain []*float64 `json:"rain"`
		} `json:"hourly"`
		Units struct {
			Rain string `json:"rain"`
		} `json:"hourly_units"`
	}
	var rows []forecast
	if len(raw) > 0 && raw[0] == '[' {
		if err := json.Unmarshal(raw, &rows); err != nil {
			return models.Weather{}, err
		}
	} else {
		var f forecast
		if err := json.Unmarshal(raw, &f); err != nil {
			return models.Weather{}, err
		}
		rows = []forecast{f}
	}
	if len(rows) != len(r.Segments) {
		return models.Weather{}, fmt.Errorf("weather location count mismatch")
	}
	w := models.Weather{Source: "Open-Meteo: sum of next 24 hourly rain intervals (mm); model forecast, not observation"}
	for _, f := range rows {
		if f.Units.Rain != "mm" || len(f.Hourly.Rain) != 24 || len(f.Hourly.Time) != 24 {
			return models.Weather{}, fmt.Errorf("incomplete 24-hour rainfall forecast")
		}
		total := 0.0
		for _, v := range f.Hourly.Rain {
			if v == nil || *v < 0 || math.IsNaN(*v) || math.IsInf(*v, 0) {
				return models.Weather{}, fmt.Errorf("missing or invalid rainfall value")
			}
			total += *v
		}
		if w.WindowStart != "" && (w.WindowStart != f.Hourly.Time[0]+"Z" || w.WindowEnd != f.Hourly.Time[23]+"Z") {
			return models.Weather{}, fmt.Errorf("weather windows do not match")
		}
		w.SegmentRainfallMM = append(w.SegmentRainfallMM, total)
		w.RainfallMM = math.Max(w.RainfallMM, total)
		w.WindowStart = f.Hourly.Time[0] + "Z"
		w.WindowEnd = f.Hourly.Time[23] + "Z"
	}
	w.Risk = math.Min(1, w.RainfallMM/120)
	return w, nil
}
