package locations

import (
	"context"
	"testing"
)

func TestCatalogAndResolution(t *testing.T) {
	if len(Catalog()) != 20 {
		t.Fatal("need 20 locations")
	}
	ids := map[string]bool{}
	for _, l := range Catalog() {
		if ids[l.ID] || l.Source == "" {
			t.Fatal("invalid catalog")
		}
		ids[l.ID] = true
	}
	for _, input := range []string{" guwahati ", "26.1844,91.7458"} {
		l, err := (Resolver{}).Resolve(context.Background(), input)
		if err != nil || l.Latitude != 26.1844 {
			t.Fatalf("%+v %v", l, err)
		}
	}
	for _, input := range []string{"NaN,91", "95,91", "unknown"} {
		if _, err := (Resolver{}).Resolve(context.Background(), input); err == nil {
			t.Fatal("invalid location accepted")
		}
	}
	if len(Search("Assam")) < 5 {
		t.Fatal("state search missing")
	}
}
