package api

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestCompareEndpointUsesSuppliedDataWithoutService(t *testing.T) {
	b, err := os.ReadFile("../../../../examples/route-comparison/single-trip.json")
	if err != nil {
		t.Fatal(err)
	}
	h := (&Handler{}).Routes()
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/v1/routes/compare", strings.NewReader(string(b))))
	if w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	var out map[string]any
	json.Unmarshal(w.Body.Bytes(), &out)
	if out["recommended_route_id"] != "B" {
		t.Fatal("unexpected winner")
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/v1/routes/compare", strings.NewReader(`{}`)))
	if w.Code != 400 {
		t.Fatal("invalid body accepted")
	}
}
