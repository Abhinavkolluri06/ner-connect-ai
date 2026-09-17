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

func TestUserIsolationAndBookmarks(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "bolt_user_test.db")
	boltRepo, err := OpenBolt(path)
	if err != nil {
		t.Fatal(err)
	}
	defer boltRepo.Close()

	inMemoryRepo := NewInMemoryRepository()

	repos := []struct {
		name     string
		histRepo HistoryRepository
		bmRepo   BookmarkRepository
	}{
		{"InMemory", inMemoryRepo, inMemoryRepo},
		{"Bolt", boltRepo, boltRepo},
	}

	for _, tc := range repos {
		t.Run(tc.name, func(t *testing.T) {
			userA := "user-alice"
			userB := "user-bob"

			// Save analyses for User A and User B
			recA := models.AnalysisRecord{
				RequestID:   "req-a-1",
				OwnerUserID: userA,
				CreatedAt:   time.Now().UTC(),
				Request:     models.AnalyzeRequest{Origin: "Guwahati", Destination: "Shillong"},
			}
			recB := models.AnalysisRecord{
				RequestID:   "req-b-1",
				OwnerUserID: userB,
				CreatedAt:   time.Now().UTC().Add(time.Second),
				Request:     models.AnalyzeRequest{Origin: "Silchar", Destination: "Agartala"},
			}
			if err := tc.histRepo.Save(ctx, recA); err != nil {
				t.Fatalf("save recA: %v", err)
			}
			if err := tc.histRepo.Save(ctx, recB); err != nil {
				t.Fatalf("save recB: %v", err)
			}

			// User A lists their analyses -> only sees recA
			listA, err := tc.histRepo.ListUser(ctx, userA, 10, 0)
			if err != nil || len(listA) != 1 || listA[0].RequestID != "req-a-1" {
				t.Fatalf("User A list mismatch: len %d, err %v", len(listA), err)
			}

			// User B tries to read User A's record -> unauthorized
			_, err = tc.histRepo.GetUser(ctx, userB, "req-a-1")
			if !errors.Is(err, ErrUnauthorized) {
				t.Fatalf("expected ErrUnauthorized when User B gets User A's record, got %v", err)
			}

			// User B tries to delete User A's record -> unauthorized
			err = tc.histRepo.DeleteUser(ctx, userB, "req-a-1")
			if !errors.Is(err, ErrUnauthorized) {
				t.Fatalf("expected ErrUnauthorized when User B deletes User A's record, got %v", err)
			}

			// User A deletes their own record -> succeeds
			if err := tc.histRepo.DeleteUser(ctx, userA, "req-a-1"); err != nil {
				t.Fatalf("User A delete own record failed: %v", err)
			}

			// Verify recA is gone
			_, err = tc.histRepo.Get(ctx, "req-a-1")
			if !errors.Is(err, ErrNotFound) {
				t.Fatalf("expected ErrNotFound for deleted recA, got %v", err)
			}

			// Bookmarks testing
			bmA := models.Bookmark{
				BookmarkID:         "bm-a-1",
				OwnerUserID:        userA,
				OriginSummary:      "Guwahati",
				DestinationSummary: "Shillong",
				SelectedRouteID:    "route-b",
				SavedAt:            time.Now().UTC(),
			}
			bmB := models.Bookmark{
				BookmarkID:         "bm-b-1",
				OwnerUserID:        userB,
				OriginSummary:      "Silchar",
				DestinationSummary: "Agartala",
				SelectedRouteID:    "route-a",
				SavedAt:            time.Now().UTC().Add(time.Second),
			}
			if err := tc.bmRepo.SaveBookmark(ctx, bmA); err != nil {
				t.Fatalf("save bmA: %v", err)
			}
			if err := tc.bmRepo.SaveBookmark(ctx, bmB); err != nil {
				t.Fatalf("save bmB: %v", err)
			}

			// User A lists bookmarks -> only sees bmA
			bmsA, err := tc.bmRepo.ListBookmarks(ctx, userA, 10, 0)
			if err != nil || len(bmsA) != 1 || bmsA[0].BookmarkID != "bm-a-1" {
				t.Fatalf("User A bookmarks mismatch: len %d, err %v", len(bmsA), err)
			}

			// User B cannot access User A's bookmark
			_, err = tc.bmRepo.GetBookmark(ctx, userB, "bm-a-1")
			if !errors.Is(err, ErrUnauthorized) {
				t.Fatalf("expected ErrUnauthorized when User B gets User A's bookmark, got %v", err)
			}

			// User B cannot delete User A's bookmark
			err = tc.bmRepo.DeleteBookmark(ctx, userB, "bm-a-1")
			if !errors.Is(err, ErrUnauthorized) {
				t.Fatalf("expected ErrUnauthorized when User B deletes User A's bookmark, got %v", err)
			}

			// User A deletes own bookmark
			if err := tc.bmRepo.DeleteBookmark(ctx, userA, "bm-a-1"); err != nil {
				t.Fatalf("User A delete bookmark: %v", err)
			}
			_, err = tc.bmRepo.GetBookmark(ctx, userA, "bm-a-1")
			if !errors.Is(err, ErrNotFound) {
				t.Fatalf("expected ErrNotFound for deleted bookmark, got %v", err)
			}
		})
	}
}
