package database

import (
	"context"
	"errors"
	"fmt"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func exercise(t *testing.T, r HistoryRepository, prefix string) {
	t.Helper()
	ctx := context.Background()
	for i := 0; i < 3; i++ {
		v := models.AnalysisRecord{RequestID: fmt.Sprintf("%s-%d", prefix, i), CreatedAt: time.Now().UTC().Add(time.Duration(i) * time.Second), Request: models.AnalyzeRequest{Origin: "Guwahati"}, Response: models.AnalyzeResponse{Persisted: true}}
		if err := r.Save(ctx, v); err != nil {
			t.Fatal(err)
		}
		if err := r.Save(ctx, v); !errors.Is(err, ErrDuplicate) {
			t.Fatalf("duplicate: %v", err)
		}
	}
	v, err := r.Get(ctx, prefix+"-1")
	if err != nil || v.Request.Origin != "Guwahati" {
		t.Fatalf("get: %+v %v", v, err)
	}
	if _, err := r.Get(ctx, "no-such-id"); !errors.Is(err, ErrNotFound) {
		t.Fatal("expected not found")
	}
	list, err := r.List(ctx, 1, 1)
	if err != nil || len(list) != 1 || list[0].RequestID != prefix+"-1" {
		t.Fatalf("pagination: %+v %v", list, err)
	}
	if !r.Healthy(ctx) {
		t.Fatal("unhealthy")
	}
}
func TestBoltPersistsAcrossRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "history.db")
	r, err := OpenBolt(path)
	if err != nil {
		t.Fatal(err)
	}
	exercise(t, r, "bolt")
	if err := r.Close(); err != nil {
		t.Fatal(err)
	}
	r, err = OpenBolt(path)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	rows, err := r.List(context.Background(), 10, 0)
	if err != nil || len(rows) != 3 {
		t.Fatalf("restart: %v %v", rows, err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := r.Get(ctx, "bolt-1"); err == nil {
		t.Fatal("cancel ignored")
	}
}
func TestPostgresIntegration(t *testing.T) {
	dsn := os.Getenv("NER_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set NER_TEST_DATABASE_URL to a disposable test database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	r, err := OpenPostgres(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	prefix := fmt.Sprintf("test-%d", time.Now().UnixNano())
	defer r.pool.Exec(context.Background(), "DELETE FROM ner_analyses WHERE request_id IN ($1,$2,$3)", prefix+"-0", prefix+"-1", prefix+"-2")
	exercise(t, r, prefix)
}
