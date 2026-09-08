package features

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/ner-connect-ai/backend-go/internal/httpjson"
	"github.com/ner-connect-ai/backend-go/internal/memo"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

type Terrain struct {
	BaseURL, APIKey string
	Client          *http.Client
	Cache           *memo.Cache[[]*float64]
}

func (p Terrain) Enrich(ctx context.Context, c *models.RouteCandidate) error {
	if len(c.Segments) == 0 || len(c.Segments) > 16 {
		return fmt.Errorf("terrain requires 1..16 samples")
	}
	lat, lon := []string{}, []string{}
	const spacingM = 100.0
	for _, s := range c.Segments {
		dy := spacingM / 111195
		dx := dy / math.Cos(s.Latitude*math.Pi/180)
		for _, point := range [][2]float64{{s.Latitude, s.Longitude}, {s.Latitude + dy, s.Longitude}, {s.Latitude - dy, s.Longitude}, {s.Latitude, s.Longitude + dx}, {s.Latitude, s.Longitude - dx}} {
			lat = append(lat, strconv.FormatFloat(point[0], 'f', 6, 64))
			lon = append(lon, strconv.FormatFloat(point[1], 'f', 6, 64))
		}
	}
	q := url.Values{"latitude": {strings.Join(lat, ",")}, "longitude": {strings.Join(lon, ",")}}
	if p.APIKey != "" {
		q.Set("apikey", p.APIKey)
	}
	elevations, err := p.Cache.Do(ctx, q.Encode(), func() ([]*float64, error) {
		var result struct {
			Elevation []*float64 `json:"elevation"`
		}
		err := httpjson.Do(ctx, p.Client, "GET", strings.TrimRight(p.BaseURL, "/")+"/v1/elevation?"+q.Encode(), "", nil, &result, 1<<20)
		return result.Elevation, err
	})
	if err != nil {
		return err
	}
	if len(elevations) != 5*len(c.Segments) {
		return fmt.Errorf("terrain sample count mismatch")
	}
	for _, v := range elevations {
		if v == nil || math.IsNaN(*v) || math.IsInf(*v, 0) || *v < -500 || *v > 9000 {
			return fmt.Errorf("missing or invalid terrain elevation")
		}
	}
	for i := range c.Segments {
		e := elevations[5*i : 5*i+5]
		c.Segments[i].ElevationM = *e[0]
		gradient := math.Hypot((*e[1]-*e[2])/(2*spacingM), (*e[3]-*e[4])/(2*spacingM))
		c.Segments[i].SlopeDeg = math.Atan(gradient) * 180 / math.Pi
	}
	c.Data.TerrainSource = "Open-Meteo / Copernicus GLO-90 DEM; terrain slope from 100m central differences, not road grade"
	Known(c, "elevation_m", "slope_deg")
	return nil
}
func Unknown(c *models.RouteCandidate, name string) {
	for _, v := range c.Data.MissingFeatures {
		if v == name {
			return
		}
	}
	c.Data.MissingFeatures = append(c.Data.MissingFeatures, name)
	c.Data.FeatureCoverage = float64(5-len(c.Data.MissingFeatures)) / 5
}
func Known(c *models.RouteCandidate, names ...string) {
	missing := []string{}
	for _, v := range c.Data.MissingFeatures {
		remove := false
		for _, name := range names {
			if v == name {
				remove = true
			}
		}
		if !remove {
			missing = append(missing, v)
		}
	}
	c.Data.MissingFeatures = missing
	c.Data.FeatureCoverage = float64(5-len(missing)) / 5
}
