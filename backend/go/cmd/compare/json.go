package main

import (
	"context"
	"encoding/json"
	"io"

	"github.com/ner-connect-ai/backend-go/internal/comparison"
)

// One bounded message per process; no network listener or temporary files.
func runJSON(input io.Reader, output io.Writer) error {
	var payload struct {
		Request comparison.Request `json:"request"`
		Scores  map[string]float64 `json:"scores"`
	}
	if err := comparison.Decode(input, &payload); err != nil {
		return err
	}
	result, err := comparison.EvaluateExperimental(context.Background(), payload.Request, payload.Scores)
	if err != nil {
		return err
	}
	return json.NewEncoder(output).Encode(result)
}
