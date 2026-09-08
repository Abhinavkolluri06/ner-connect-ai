package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/ner-connect-ai/backend-go/internal/comparison"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Batch struct {
	Scenarios []comparison.Request `json:"scenarios"`
}
type Row struct {
	ScenarioID string             `json:"scenario_id"`
	Result     *comparison.Result `json:"result,omitempty"`
	Error      string             `json:"error,omitempty"`
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
}
func run() error {
	input := flag.String("file", "", "Path to a single comparison or batch JSON file")
	output := flag.String("out", "", "New output JSON file (existing files are never overwritten)")
	flag.Parse()
	if *input == "" {
		fmt.Print("Enter your JSON file path: ")
		line, err := bufio.NewReader(os.Stdin).ReadString('\n')
		if err != nil && err != io.EOF {
			return err
		}
		*input = strings.Trim(strings.TrimSpace(line), "\"")
	}
	if *input == "" {
		return fmt.Errorf("a JSON file path is required")
	}
	f, err := os.Open(*input)
	if err != nil {
		return err
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, comparison.MaxBytes+1))
	if err != nil {
		return err
	}
	if len(b) > comparison.MaxBytes {
		return fmt.Errorf("file exceeds 4 MiB")
	}
	var envelope map[string]json.RawMessage
	if err = json.Unmarshal(b, &envelope); err != nil {
		return err
	}
	var scenarios []comparison.Request
	if _, ok := envelope["scenarios"]; ok {
		var batch Batch
		if err = comparison.Decode(bytes.NewReader(b), &batch); err != nil {
			return err
		}
		scenarios = batch.Scenarios
	} else {
		var req comparison.Request
		if err = comparison.Decode(bytes.NewReader(b), &req); err != nil {
			return err
		}
		scenarios = []comparison.Request{req}
	}
	if len(scenarios) < 1 || len(scenarios) > 100 {
		return fmt.Errorf("file must contain 1..100 scenarios")
	}
	rows := []Row{}
	failed := false
	fmt.Println("Rule-based JSON comparison — no network or trained ML. Scores are not safety probabilities.")
	for i, req := range scenarios {
		id := req.ScenarioID
		if id == "" {
			id = fmt.Sprintf("scenario-%02d", i+1)
		}
		out, err := comparison.Evaluate(context.Background(), req)
		if err != nil {
			rows = append(rows, Row{ScenarioID: id, Error: err.Error()})
			fmt.Printf("\n%s INVALID: %v\n", id, err)
			failed = true
			continue
		}
		rows = append(rows, Row{ScenarioID: id, Result: &out})
		fmt.Printf("\n%s — %s\n%s\n", id, req.Description, out.Explanation)
		fmt.Printf("%-16s %10s %10s %10s %12s\n", "Route", "Score/100", "KM", "ETA min", "Decision")
		for _, r := range out.Routes {
			fmt.Printf("%-16s %10.2f %10.1f %10.1f %12s\n", r.RouteID, r.FinalScore*100, r.DistanceKM, r.ETAMinutes, r.Recommendation)
		}
		for _, r := range out.Excluded {
			fmt.Printf("EXCLUDED %s: %s\n", r.RouteID, strings.Join(r.Reasons, "; "))
		}
		for _, warning := range out.Warnings[4:] {
			fmt.Println("NOTE:", warning)
		}
	}
	if *output == "" {
		stem := strings.TrimSuffix(*input, filepath.Ext(*input))
		*output = stem + ".results-" + time.Now().Format("20060102-150405.000000000") + ".json"
	}
	data, err := json.MarshalIndent(map[string]any{"model_mode": "heuristic", "scenario_count": len(rows), "results": rows}, "", "  ")
	if err != nil {
		return err
	}
	dest, err := os.OpenFile(*output, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	_, writeErr := dest.Write(append(data, '\n'))
	closeErr := dest.Close()
	if writeErr != nil {
		return writeErr
	}
	if closeErr != nil {
		return closeErr
	}
	fmt.Println("\nFull results saved to:", *output)
	if failed {
		return fmt.Errorf("one or more scenarios were invalid; see output for individual errors")
	}
	return nil
}
