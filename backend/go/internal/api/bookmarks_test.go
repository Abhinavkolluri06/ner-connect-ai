package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ner-connect-ai/backend-go/internal/models"
	"github.com/ner-connect-ai/backend-go/internal/routing"
	"github.com/ner-connect-ai/backend-go/internal/weather"
)

func TestBookmarksAndUserIsolationAPI(t *testing.T) {
	h := testHandler(liveIntel(), weather.DemoProvider{}, routing.DemoProvider{})

	// 1. User A analyzes a route with X-User-ID: user-alpha
	reqAnalyze := httptest.NewRequest(http.MethodPost, "/api/v1/routes/analyze", bytes.NewReader(validBody()))
	reqAnalyze.Header.Set("X-User-ID", "user-alpha")
	recAnalyze := httptest.NewRecorder()
	h.ServeHTTP(recAnalyze, reqAnalyze)
	if recAnalyze.Code != http.StatusOK {
		t.Fatalf("analyze failed: %d %s", recAnalyze.Code, recAnalyze.Body.String())
	}

	var analysis models.AnalyzeResponse
	if err := json.NewDecoder(recAnalyze.Body).Decode(&analysis); err != nil {
		t.Fatalf("failed to decode analyze response: %v", err)
	}
	if analysis.RequestID == "" || len(analysis.Routes) == 0 {
		t.Fatalf("invalid analyze response: %+v", analysis)
	}

	// 2. User A creates a bookmark
	bookmarkPayload, _ := json.Marshal(models.SaveBookmarkRequest{
		AssessmentID:    analysis.RequestID,
		SelectedRouteID: analysis.RecommendedRouteID,
	})
	reqSave := httptest.NewRequest(http.MethodPost, "/api/v1/bookmarks", bytes.NewReader(bookmarkPayload))
	reqSave.Header.Set("X-User-ID", "user-alpha")
	recSave := httptest.NewRecorder()
	h.ServeHTTP(recSave, reqSave)
	if recSave.Code != http.StatusCreated {
		t.Fatalf("save bookmark failed: %d %s", recSave.Code, recSave.Body.String())
	}

	var createdBookmark models.Bookmark
	if err := json.NewDecoder(recSave.Body).Decode(&createdBookmark); err != nil {
		t.Fatalf("failed to decode bookmark: %v", err)
	}
	if createdBookmark.BookmarkID == "" || createdBookmark.OwnerUserID != "user-alpha" {
		t.Fatalf("unexpected bookmark: %+v", createdBookmark)
	}
	if createdBookmark.Snapshot == nil || createdBookmark.Snapshot.RouteID != analysis.RecommendedRouteID {
		t.Fatalf("snapshot route mismatch: %+v", createdBookmark.Snapshot)
	}

	// 3. User A lists bookmarks
	reqListA := httptest.NewRequest(http.MethodGet, "/api/v1/bookmarks", nil)
	reqListA.Header.Set("X-User-ID", "user-alpha")
	recListA := httptest.NewRecorder()
	h.ServeHTTP(recListA, reqListA)
	if recListA.Code != http.StatusOK {
		t.Fatalf("list bookmarks failed: %d", recListA.Code)
	}
	var listRespA struct {
		Bookmarks []models.Bookmark `json:"bookmarks"`
		Count     int               `json:"count"`
	}
	_ = json.NewDecoder(recListA.Body).Decode(&listRespA)
	if listRespA.Count != 1 || listRespA.Bookmarks[0].BookmarkID != createdBookmark.BookmarkID {
		t.Fatalf("expected 1 bookmark for user-alpha, got %+v", listRespA)
	}

	// 4. User B attempts to list bookmarks -> should see 0
	reqListB := httptest.NewRequest(http.MethodGet, "/api/v1/bookmarks", nil)
	reqListB.Header.Set("X-User-ID", "user-beta")
	recListB := httptest.NewRecorder()
	h.ServeHTTP(recListB, reqListB)
	if recListB.Code != http.StatusOK {
		t.Fatalf("list bookmarks user B failed: %d", recListB.Code)
	}
	var listRespB struct {
		Bookmarks []models.Bookmark `json:"bookmarks"`
		Count     int               `json:"count"`
	}
	_ = json.NewDecoder(recListB.Body).Decode(&listRespB)
	if listRespB.Count != 0 {
		t.Fatalf("user-beta should have 0 bookmarks, got %d", listRespB.Count)
	}

	// 5. User B attempts to read User A's bookmark directly -> 403 Forbidden
	reqGetB := httptest.NewRequest(http.MethodGet, "/api/v1/bookmarks/"+createdBookmark.BookmarkID, nil)
	reqGetB.Header.Set("X-User-ID", "user-beta")
	recGetB := httptest.NewRecorder()
	h.ServeHTTP(recGetB, reqGetB)
	if recGetB.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when User B accesses User A's bookmark, got %d %s", recGetB.Code, recGetB.Body.String())
	}

	// 6. User B attempts to read User A's analysis record -> 403 Forbidden
	reqGetAnalysisB := httptest.NewRequest(http.MethodGet, "/api/v1/analyses/"+analysis.RequestID, nil)
	reqGetAnalysisB.Header.Set("X-User-ID", "user-beta")
	recGetAnalysisB := httptest.NewRecorder()
	h.ServeHTTP(recGetAnalysisB, reqGetAnalysisB)
	if recGetAnalysisB.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when User B accesses User A's analysis, got %d", recGetAnalysisB.Code)
	}

	// 7. User A recalculates the bookmark
	reqRecalc := httptest.NewRequest(http.MethodPost, "/api/v1/bookmarks/"+createdBookmark.BookmarkID+"/recalculate", nil)
	reqRecalc.Header.Set("X-User-ID", "user-alpha")
	recRecalc := httptest.NewRecorder()
	h.ServeHTTP(recRecalc, reqRecalc)
	if recRecalc.Code != http.StatusOK {
		t.Fatalf("recalculate failed: %d %s", recRecalc.Code, recRecalc.Body.String())
	}
	var recalcResp struct {
		Bookmark models.Bookmark        `json:"bookmark"`
		Analysis models.AnalyzeResponse `json:"analysis"`
	}
	if err := json.NewDecoder(recRecalc.Body).Decode(&recalcResp); err != nil {
		t.Fatalf("failed to decode recalc response: %v", err)
	}
	if recalcResp.Bookmark.SnapshotOrRecalculateStatus != "recalculated_live" {
		t.Fatalf("expected recalculated_live status, got %s", recalcResp.Bookmark.SnapshotOrRecalculateStatus)
	}

	// 7a. User B attempts to recalculate User A's bookmark -> 403 Forbidden
	reqRecalcB := httptest.NewRequest(http.MethodPost, "/api/v1/bookmarks/"+createdBookmark.BookmarkID+"/recalculate", nil)
	reqRecalcB.Header.Set("X-User-ID", "user-beta")
	recRecalcB := httptest.NewRecorder()
	h.ServeHTTP(recRecalcB, reqRecalcB)
	if recRecalcB.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when User B recalculates User A's bookmark, got %d %s", recRecalcB.Code, recRecalcB.Body.String())
	}

	// 7b. User A renames the bookmark
	patchPayload, _ := json.Marshal(map[string]string{"name": "Emergency Medical Corridor Alpha"})
	reqPatchA := httptest.NewRequest(http.MethodPatch, "/api/v1/bookmarks/"+createdBookmark.BookmarkID, bytes.NewReader(patchPayload))
	reqPatchA.Header.Set("X-User-ID", "user-alpha")
	recPatchA := httptest.NewRecorder()
	h.ServeHTTP(recPatchA, reqPatchA)
	if recPatchA.Code != http.StatusOK {
		t.Fatalf("rename bookmark failed: %d %s", recPatchA.Code, recPatchA.Body.String())
	}
	var patchedBookmark models.Bookmark
	if err := json.NewDecoder(recPatchA.Body).Decode(&patchedBookmark); err != nil {
		t.Fatalf("failed to decode patched bookmark: %v", err)
	}
	if patchedBookmark.Name != "Emergency Medical Corridor Alpha" {
		t.Fatalf("expected updated name, got %s", patchedBookmark.Name)
	}

	// 7c. User B attempts to rename User A's bookmark -> 403 Forbidden
	reqPatchB := httptest.NewRequest(http.MethodPatch, "/api/v1/bookmarks/"+createdBookmark.BookmarkID, bytes.NewReader(patchPayload))
	reqPatchB.Header.Set("X-User-ID", "user-beta")
	recPatchB := httptest.NewRecorder()
	h.ServeHTTP(recPatchB, reqPatchB)
	if recPatchB.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when User B renames User A's bookmark, got %d", recPatchB.Code)
	}

	// 8. User B attempts to delete User A's bookmark -> 403 Forbidden
	reqDelB := httptest.NewRequest(http.MethodDelete, "/api/v1/bookmarks/"+createdBookmark.BookmarkID, nil)
	reqDelB.Header.Set("X-User-ID", "user-beta")
	recDelB := httptest.NewRecorder()
	h.ServeHTTP(recDelB, reqDelB)
	if recDelB.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when User B deletes User A's bookmark, got %d", recDelB.Code)
	}

	// 9. User A deletes their bookmark -> 200 OK
	reqDelA := httptest.NewRequest(http.MethodDelete, "/api/v1/bookmarks/"+createdBookmark.BookmarkID, nil)
	reqDelA.Header.Set("X-User-ID", "user-alpha")
	recDelA := httptest.NewRecorder()
	h.ServeHTTP(recDelA, reqDelA)
	if recDelA.Code != http.StatusOK {
		t.Fatalf("expected 200 when User A deletes bookmark, got %d", recDelA.Code)
	}

	// 10. User B attempts to delete User A's analysis -> 403 Forbidden
	reqDelAnalysisB := httptest.NewRequest(http.MethodDelete, "/api/v1/analyses/"+analysis.RequestID, nil)
	reqDelAnalysisB.Header.Set("X-User-ID", "user-beta")
	recDelAnalysisB := httptest.NewRecorder()
	h.ServeHTTP(recDelAnalysisB, reqDelAnalysisB)
	if recDelAnalysisB.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when User B attempts to delete User A's analysis, got %d", recDelAnalysisB.Code)
	}

	// 11. User A deletes their analysis -> 200 OK
	reqDelAnalysis := httptest.NewRequest(http.MethodDelete, "/api/v1/analyses/"+analysis.RequestID, nil)
	reqDelAnalysis.Header.Set("X-User-ID", "user-alpha")
	recDelAnalysis := httptest.NewRecorder()
	h.ServeHTTP(recDelAnalysis, reqDelAnalysis)
	if recDelAnalysis.Code != http.StatusOK {
		t.Fatalf("expected 200 when User A deletes analysis, got %d", recDelAnalysis.Code)
	}
}
