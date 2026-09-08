package main

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/ner-connect-ai/backend-go/internal/comparison"
)

func TestJSONProtocolMatchesEngine(t *testing.T) {
	data, err := os.ReadFile("../../../../examples/route-comparison/scenarios/scenario-01.json")
	if err != nil {
		t.Fatal(err)
	}
	var req comparison.Request
	if err := comparison.Decode(bytes.NewReader(data), &req); err != nil {
		t.Fatal(err)
	}
	scores := map[string]float64{"A": .1, "B": .2, "C": .3}
	payload, _ := json.Marshal(map[string]any{"request": req, "scores": scores})
	var buffer bytes.Buffer
	if err := runJSON(bytes.NewReader(payload), &buffer); err != nil {
		t.Fatal(err)
	}
	var got comparison.Result
	if err := json.Unmarshal(buffer.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	want, err := comparison.EvaluateExperimental(context.Background(), req, scores)
	if err != nil {
		t.Fatal(err)
	}
	got.GeneratedAt = want.GeneratedAt
	g, _ := json.Marshal(got)
	w, _ := json.Marshal(want)
	if !bytes.Equal(g, w) {
		t.Fatal("pipe changed ranking or warnings")
	}
}

func TestJSONProtocolRejectsMalformedInput(t *testing.T) {
	for _, input := range []string{"{}", `{"request":{},"scores":null}`, `{"unexpected":1}`, `{} {}`, strings.Repeat(" ", comparison.MaxBytes+1)} {
		var buffer bytes.Buffer
		if err := runJSON(strings.NewReader(input), &buffer); err == nil {
			t.Fatal("invalid protocol accepted")
		}
		if buffer.Len() != 0 {
			t.Fatal("partial success written")
		}
	}
}
