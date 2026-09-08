package locations

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/ner-connect-ai/backend-go/internal/geo"
	"github.com/ner-connect-ai/backend-go/internal/httpjson"
)

type Location struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	State     string  `json:"state"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Source    string  `json:"source"`
}

//go:embed catalog.json
var catalogJSON []byte

func Catalog() []Location {
	var out []Location
	if err := json.Unmarshal(catalogJSON, &out); err != nil {
		panic("invalid embedded location catalog")
	}
	return out
}
func Search(query string) []Location {
	out := []Location{}
	q := strings.ToLower(strings.TrimSpace(query))
	for _, l := range Catalog() {
		if strings.Contains(strings.ToLower(l.Name+" "+l.State+" "+l.ID), q) {
			out = append(out, l)
		}
	}
	return out
}

type Resolver struct {
	BaseURL string
	Client  *http.Client
}

func (r Resolver) Resolve(ctx context.Context, input string) (Location, error) {
	input = strings.TrimSpace(input)
	parts := strings.Split(input, ",")
	if len(parts) == 2 {
		lat, e1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
		lon, e2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
		if e1 == nil && e2 == nil {
			if !geo.Valid(lat, lon) {
				return Location{}, fmt.Errorf("invalid coordinates")
			}
			return Location{Name: input, Latitude: lat, Longitude: lon, Source: "user_coordinates"}, nil
		}
	}
	for _, l := range Catalog() {
		if strings.EqualFold(input, l.ID) || strings.EqualFold(input, l.Name) {
			return l, nil
		}
	}
	if r.BaseURL == "" {
		return Location{}, fmt.Errorf("unknown location; use catalog ID or latitude,longitude")
	}
	u := strings.TrimRight(r.BaseURL, "/") + "/v1/search?name=" + url.QueryEscape(input) + "&count=10&language=en&format=json&countryCode=IN"
	var data struct {
		Results []struct {
			Name      string  `json:"name"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
			State     string  `json:"admin1"`
			Country   string  `json:"country_code"`
		}
	}
	if err := httpjson.Do(ctx, r.Client, "GET", u, "", nil, &data, 1<<20); err != nil {
		return Location{}, err
	}
	var matches []Location
	for _, l := range data.Results {
		if strings.EqualFold(l.Name, input) && l.Country == "IN" && isNER(l.State) && geo.Valid(l.Latitude, l.Longitude) {
			matches = append(matches, Location{Name: l.Name, State: l.State, Latitude: l.Latitude, Longitude: l.Longitude, Source: "Open-Meteo / GeoNames"})
		}
	}
	if len(matches) != 1 {
		return Location{}, fmt.Errorf("location not found or ambiguous; use catalog ID or latitude,longitude")
	}
	return matches[0], nil
}
func isNER(s string) bool {
	for _, v := range []string{"Assam", "Meghalaya", "Tripura", "Mizoram", "Manipur", "Nagaland", "Arunachal Pradesh", "Sikkim"} {
		if strings.EqualFold(v, s) {
			return true
		}
	}
	return false
}
