package comparison

import (
	"context"
	"encoding/json"
	"math"
	"os"
	"strings"
	"testing"
)

func TestExperimentalGuardsAndCoverage(t *testing.T) {
	r := input(t)
	for _, scores := range []map[string]float64{nil, {"A": .1}, {"A": .1, "B": math.NaN()}, {"A": .1, "C": .2}, {"A": .1, "B": 2}} {
		if _, err := EvaluateExperimental(context.Background(), r, scores); err == nil {
			t.Fatal("invalid scores accepted")
		}
	}
	out, err := EvaluateExperimental(context.Background(), r, map[string]float64{"A": 0, "B": .2})
	if err != nil || out.ModelMode != "experimental_ml_hybrid" || out.RecommendedRouteID != "B" || len(out.Excluded) != 1 {
		t.Fatalf("experimental score cleared unsafe route: %+v %v", out, err)
	}
	r.Routes[1].Closed = true
	out, err = EvaluateExperimental(context.Background(), r, map[string]float64{"A": 0, "B": 0})
	if err != nil || out.Status != "no_eligible_routes" {
		t.Fatal("closed route recommended")
	}
}

func TestExperimentalScoreChangesRanking(t *testing.T) {
	r := input(t)
	r.Routes[0] = r.Routes[1]
	r.Routes[0].RouteID = "A"
	first, err := EvaluateExperimental(context.Background(), r, map[string]float64{"A": .1, "B": .7})
	if err != nil || first.RecommendedRouteID != "A" {
		t.Fatal("low hazard score not ranked first")
	}
	second, err := EvaluateExperimental(context.Background(), r, map[string]float64{"A": .7, "B": .1})
	if err != nil || second.RecommendedRouteID != "B" {
		t.Fatal("ranking did not respond to model scores")
	}
}

const sample = `{"vehicle":"car","cargo":"general","priority":"safest","routes":[{"route_id":"A","distance_km":70,"eta_minutes":90,"rainfall_mm":110,"slope_deg":42,"elevation_m":1200,"historical_landslides":9,"road_condition_score":30},{"route_id":"B","distance_km":100,"eta_minutes":125,"rainfall_mm":10,"slope_deg":8,"elevation_m":1200,"historical_landslides":0,"road_condition_score":92}]}`

func input(t *testing.T) Request {
	t.Helper()
	var r Request
	if err := Decode(strings.NewReader(sample), &r); err != nil {
		t.Fatal(err)
	}
	return r
}

func BenchmarkComparison25(b *testing.B) {
	var r Request
	if err := Decode(strings.NewReader(sample), &r); err != nil {
		b.Fatal(err)
	}
	base := r.Routes[1]
	r.Routes = make([]Route, 25)
	for i := range r.Routes {
		r.Routes[i] = base
		r.Routes[i].RouteID = string(rune('A' + i))
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := Evaluate(context.Background(), r); err != nil {
			b.Fatal(err)
		}
	}
}
func TestComparisonRespondsToDataNotIDs(t *testing.T) {
	r := input(t)
	out, err := Evaluate(context.Background(), r)
	if err != nil || out.RecommendedRouteID != "B" || len(out.Excluded) != 1 {
		t.Fatalf("%+v %v", out, err)
	}
	r.Routes[0].RouteID = "B"
	r.Routes[1].RouteID = "A"
	out, err = Evaluate(context.Background(), r)
	if err != nil || out.RecommendedRouteID != "A" {
		t.Fatal("winner tied to route name")
	}
	r.Routes[1].Closed = true
	out, err = Evaluate(context.Background(), r)
	if err != nil || out.Status != "no_eligible_routes" || out.RecommendedRouteID != "" {
		t.Fatal("closed route recommended")
	}
}
func TestFastestRespectsLimit(t *testing.T) {
	r := input(t)
	r.Priority = "fastest"
	out, _ := Evaluate(context.Background(), r)
	if out.RecommendedRouteID != "B" {
		t.Fatal("hazard limit ignored")
	}
	one := 1.0
	r.MaxHazardIndex = &one
	out, _ = Evaluate(context.Background(), r)
	if out.RecommendedRouteID != "A" {
		t.Fatal("priority not applied")
	}
}

func TestImprovingInputsChangesWinner(t *testing.T) {
	r := input(t)
	zero, road := 0.0, 99.0
	history := 0
	r.Routes[0].RainfallMM = &zero
	r.Routes[0].SlopeDeg = &zero
	r.Routes[0].HistoricalLandslides = &history
	r.Routes[0].RoadConditionScore = &road
	out, err := Evaluate(context.Background(), r)
	if err != nil || out.RecommendedRouteID != "A" {
		t.Fatalf("changed features should change winner: %+v %v", out, err)
	}
}
func TestRequiredFieldsAndRestrictions(t *testing.T) {
	for _, body := range []string{strings.Replace(sample, `"rainfall_mm":110,`, "", 1), strings.Replace(sample, `"rainfall_mm":110`, `"rainfall_mm":null`, 1), strings.Replace(sample, `"route_id":"B"`, `"route_id":"A"`, 1), strings.Replace(sample, `"slope_deg":42`, `"slope_deg":99`, 1), sample + `{}`} {
		var r Request
		err := Decode(strings.NewReader(body), &r)
		if err == nil {
			_, err = Evaluate(context.Background(), r)
		}
		if err == nil {
			t.Fatal("invalid input accepted")
		}
	}
	r := input(t)
	r.Routes[1].BlockedVehicles = []string{"car"}
	out, _ := Evaluate(context.Background(), r)
	if out.Status != "no_eligible_routes" {
		t.Fatal("vehicle ban ignored")
	}
}
func TestAll25Examples(t *testing.T) {
	b, err := os.ReadFile("../../../../examples/route-comparison/25-scenarios.json")
	if err != nil {
		t.Fatal(err)
	}
	var batch struct {
		Scenarios []Request `json:"scenarios"`
	}
	if err = json.Unmarshal(b, &batch); err != nil {
		t.Fatal(err)
	}
	if len(batch.Scenarios) != 25 {
		t.Fatal("expected25")
	}
	for _, r := range batch.Scenarios {
		out, err := Evaluate(context.Background(), r)
		if err != nil {
			t.Fatalf("%s %v", r.ScenarioID, err)
		}
		if len(out.Routes)+len(out.Excluded) != len(r.Routes) {
			t.Fatal("route omitted")
		}
	}
}
