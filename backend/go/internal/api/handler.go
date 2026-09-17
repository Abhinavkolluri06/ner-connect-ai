package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/database"
	"github.com/ner-connect-ai/backend-go/internal/locations"
	"github.com/ner-connect-ai/backend-go/internal/middleware"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"github.com/ner-connect-ai/backend-go/internal/routing"
	"github.com/ner-connect-ai/backend-go/internal/weather"
)

type Handler struct {
	Service         *Service
	Routing         routing.Provider
	Weather         weather.Provider
	Repository      database.Repository
	MaxRequestBytes int64
	Logger          *slog.Logger
}
type apiError struct {
	Error errorBody `json:"error"`
}
type errorBody struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"request_id"`
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /health/live", h.live)
	mux.HandleFunc("GET /health/ready", h.ready)
	mux.HandleFunc("POST /api/v1/routes/analyze", h.analyze)
	mux.HandleFunc("POST /api/v1/routes/compare", h.compare)
	mux.HandleFunc("POST /api/v1/tools/routes/compare-supplied", h.compare)
	mux.HandleFunc("GET /api/v1/locations", h.locations)
	mux.HandleFunc("POST /api/v1/locations/{id}/accessibility", h.analyze)
	mux.HandleFunc("GET /api/v1/analyses", h.history)
	mux.HandleFunc("GET /api/v1/analyses/{id}", h.analysisRecord)
	mux.HandleFunc("DELETE /api/v1/analyses/{id}", h.deleteAnalysisRecord)
	mux.HandleFunc("POST /api/v1/bookmarks", h.saveBookmark)
	mux.HandleFunc("GET /api/v1/bookmarks", h.listBookmarks)
	mux.HandleFunc("GET /api/v1/bookmarks/{id}", h.getBookmark)
	mux.HandleFunc("DELETE /api/v1/bookmarks/{id}", h.deleteBookmark)
	mux.HandleFunc("POST /api/v1/bookmarks/{id}/recalculate", h.recalculateBookmark)
	mux.HandleFunc("GET /api/v1/openapi.json", h.openapi)
	return mux
}
func (h *Handler) analyze(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	limit := h.MaxRequestBytes
	if limit <= 0 {
		limit = 1 << 20
	}
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var req models.AnalyzeRequest
	if err := dec.Decode(&req); err != nil {
		msg := "Request body must contain one valid JSON object."
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			msg = "Request body exceeds the allowed size."
		}
		writeError(w, http.StatusBadRequest, "INVALID_ROUTE_REQUEST", msg, id)
		return
	}
	if err := ensureEOF(dec); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ROUTE_REQUEST", "Request body must contain exactly one JSON object.", id)
		return
	}
	req.Origin = strings.TrimSpace(req.Origin)
	req.Destination = strings.TrimSpace(req.Destination)
	req.Vehicle = strings.ToLower(strings.TrimSpace(req.Vehicle))
	req.Cargo = strings.ToLower(strings.TrimSpace(req.Cargo))
	req.Priority = strings.ToLower(strings.TrimSpace(req.Priority))
	var target *locations.Location
	if locationID := r.PathValue("id"); locationID != "" {
		for _, l := range locations.Catalog() {
			if l.ID == locationID {
				copy := l
				target = &copy
				break
			}
		}
		if target == nil {
			writeError(w, 404, "LOCATION_NOT_FOUND", "Unknown location ID.", id)
			return
		}
		if req.Destination != "" && !strings.EqualFold(req.Destination, target.ID) && !strings.EqualFold(req.Destination, target.Name) {
			writeError(w, 400, "INVALID_ROUTE_REQUEST", "Destination must match the location in the URL.", id)
			return
		}
		req.Destination = target.Name
	}
	if msg := validateRequest(req); msg != "" {
		writeError(w, http.StatusBadRequest, "INVALID_ROUTE_REQUEST", msg, id)
		return
	}
	ctx := r.Context()
	if middleware.UserIDFromContext(ctx) == "" {
		if uid := middleware.UserIDFrom(r); uid != "" {
			ctx = middleware.WithUserID(ctx, uid)
		}
	}
	resp, err := h.Service.Analyze(ctx, id, req)
	if err != nil {
		h.Logger.Error("route analysis failed", "request_id", id, "error", err)
		code := "INTERNAL_ERROR"
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "routing provider") {
			code = "ROUTING_PROVIDER_UNAVAILABLE"
			status = http.StatusServiceUnavailable
		}
		if strings.Contains(err.Error(), "required advisory feed") {
			status = 503
			code = "ADVISORY_DATA_UNAVAILABLE"
		}
		if strings.Contains(err.Error(), "all routes blocked") {
			status = 422
			code = "NO_ELIGIBLE_ROUTE"
		}
		if errors.Is(err, context.DeadlineExceeded) {
			status = 504
			code = "ANALYSIS_TIMEOUT"
		}
		writeError(w, status, code, "The route analysis could not be completed.", id)
		return
	}
	if target != nil {
		writeJSON(w, 200, map[string]any{"location": target, "origin": req.Origin, "accessibility_score": math.Round(resp.Routes[0].AccessibilityScore*10000) / 100, "scale": "0-100", "scope": "Best eligible route from the specified origin; not an intrinsic city rating", "analysis": resp})
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
func validateRequest(r models.AnalyzeRequest) string {
	r.Origin = strings.TrimSpace(r.Origin)
	r.Destination = strings.TrimSpace(r.Destination)
	if r.Origin == "" || r.Destination == "" {
		return "Origin and destination are required."
	}
	if len(r.Origin) > 200 || len(r.Destination) > 200 {
		return "Origin and destination must not exceed 200 characters."
	}
	if d := r.VehicleDimensions; d != nil {
		for _, v := range []float64{d.WeightT, d.HeightM, d.WidthM, d.LengthM, d.AxleLoadT} {
			if math.IsNaN(v) || math.IsInf(v, 0) || v < 0 {
				return "Vehicle dimensions must be finite non-negative numbers."
			}
		}
		if d.WeightT > 200 || d.AxleLoadT > 100 || d.HeightM > 10 || d.WidthM > 10 || d.LengthM > 100 {
			return "Vehicle dimensions exceed supported limits."
		}
		if d.WeightT > 0 && d.AxleLoadT > d.WeightT {
			return "Axle load cannot exceed gross vehicle weight."
		}
	}
	if strings.EqualFold(r.Origin, r.Destination) {
		return "Origin and destination must differ."
	}
	if !oneOf(r.Vehicle, "car", "truck", "motorcycle", "ambulance") {
		return "Vehicle must be one of: car, truck, motorcycle, ambulance."
	}
	if !oneOf(r.Cargo, "general", "food", "medical_supplies", "passengers", "emergency_equipment") {
		return "Cargo must be one of: general, food, medical_supplies, passengers, emergency_equipment."
	}
	if !oneOf(r.Priority, "normal", "fastest", "safest", "emergency") {
		return "Priority must be one of: normal, fastest, safest, emergency."
	}
	return ""
}

func (h *Handler) locations(w http.ResponseWriter, r *http.Request) {
	if len(r.URL.Query().Get("q")) > 200 {
		writeError(w, 400, "INVALID_QUERY", "Search is too long.", middleware.RequestIDFrom(r))
		return
	}
	writeJSON(w, 200, map[string]any{"locations": locations.Search(r.URL.Query().Get("q")), "attribution": "Open-Meteo / GeoNames, CC BY 4.0; approximate settlement centers, not verified delivery addresses"})
}
func (h *Handler) history(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	userID := middleware.UserIDFrom(r)
	repo, ok := h.Repository.(database.HistoryRepository)
	if !ok {
		writeError(w, 503, "HISTORY_UNAVAILABLE", "History storage is unavailable.", id)
		return
	}
	limit, offset := 20, 0
	var err error
	if v := r.URL.Query().Get("limit"); v != "" {
		limit, err = strconv.Atoi(v)
	}
	if err != nil || limit < 1 || limit > 50 {
		writeError(w, 400, "INVALID_QUERY", "limit must be 1..50.", id)
		return
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		offset, err = strconv.Atoi(v)
	}
	if err != nil || offset < 0 || offset > 10000 {
		writeError(w, 400, "INVALID_QUERY", "offset must be 0..10000.", id)
		return
	}
	records, err := repo.ListUser(r.Context(), userID, limit, offset)
	if err != nil {
		writeError(w, 503, "HISTORY_UNAVAILABLE", "Could not read history.", id)
		return
	}
	summaries := []map[string]any{}
	for _, v := range records {
		summaries = append(summaries, map[string]any{
			"request_id":           v.RequestID,
			"created_at":           v.CreatedAt,
			"owner_user_id":        v.OwnerUserID,
			"request":              v.Request,
			"recommended_route_id": v.Response.RecommendedRouteID,
			"intelligence_mode":    v.Response.IntelligenceMode,
			"route_count":          len(v.Response.Routes),
		})
	}
	writeJSON(w, 200, map[string]any{"analyses": summaries, "limit": limit, "offset": offset, "count": len(summaries)})
}

func (h *Handler) analysisRecord(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	userID := middleware.UserIDFrom(r)
	repo, ok := h.Repository.(database.HistoryRepository)
	if !ok {
		writeError(w, 503, "HISTORY_UNAVAILABLE", "History storage is unavailable.", id)
		return
	}
	record, err := repo.GetUser(r.Context(), userID, r.PathValue("id"))
	if errors.Is(err, database.ErrNotFound) {
		writeError(w, 404, "ANALYSIS_NOT_FOUND", "Analysis not found.", id)
		return
	}
	if errors.Is(err, database.ErrUnauthorized) {
		writeError(w, 403, "FORBIDDEN", "You do not have permission to view this analysis.", id)
		return
	}
	if err != nil {
		writeError(w, 503, "HISTORY_UNAVAILABLE", "Could not read history.", id)
		return
	}
	writeJSON(w, 200, record)
}

func (h *Handler) deleteAnalysisRecord(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	userID := middleware.UserIDFrom(r)
	repo, ok := h.Repository.(database.HistoryRepository)
	if !ok {
		writeError(w, 503, "HISTORY_UNAVAILABLE", "History storage is unavailable.", id)
		return
	}
	targetID := r.PathValue("id")
	err := repo.DeleteUser(r.Context(), userID, targetID)
	if errors.Is(err, database.ErrNotFound) {
		writeError(w, 404, "ANALYSIS_NOT_FOUND", "Analysis not found.", id)
		return
	}
	if errors.Is(err, database.ErrUnauthorized) {
		writeError(w, 403, "FORBIDDEN", "You do not have permission to delete this analysis.", id)
		return
	}
	if err != nil {
		writeError(w, 503, "DELETE_FAILED", "Could not delete analysis.", id)
		return
	}
	writeJSON(w, 200, map[string]any{"status": "deleted", "analysis_id": targetID})
}

func (h *Handler) saveBookmark(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	userID := middleware.UserIDFrom(r)
	bookmarkRepo, ok := h.Repository.(database.BookmarkRepository)
	historyRepo, histOK := h.Repository.(database.HistoryRepository)
	if !ok || !histOK {
		writeError(w, 503, "BOOKMARKS_UNAVAILABLE", "Bookmark storage is unavailable.", id)
		return
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var req models.SaveBookmarkRequest
	if err := dec.Decode(&req); err != nil {
		writeError(w, 400, "INVALID_BOOKMARK_REQUEST", "Invalid JSON request body.", id)
		return
	}
	if req.AssessmentID == "" {
		writeError(w, 400, "INVALID_BOOKMARK_REQUEST", "assessment_id is required.", id)
		return
	}
	analysis, err := historyRepo.GetUser(r.Context(), userID, req.AssessmentID)
	if errors.Is(err, database.ErrNotFound) {
		writeError(w, 404, "ANALYSIS_NOT_FOUND", "Referenced assessment not found.", id)
		return
	}
	if errors.Is(err, database.ErrUnauthorized) {
		writeError(w, 403, "FORBIDDEN", "You do not have permission to bookmark this assessment.", id)
		return
	}
	if err != nil {
		writeError(w, 500, "DATABASE_ERROR", "Failed to retrieve assessment.", id)
		return
	}

	selectedRouteID := req.SelectedRouteID
	if selectedRouteID == "" {
		selectedRouteID = analysis.Response.RecommendedRouteID
	}
	var selectedRoute *models.ScoredRoute
	for i := range analysis.Response.Routes {
		if analysis.Response.Routes[i].RouteID == selectedRouteID {
			rCopy := analysis.Response.Routes[i]
			selectedRoute = &rCopy
			break
		}
	}
	if selectedRoute == nil && len(analysis.Response.Routes) > 0 {
		rCopy := analysis.Response.Routes[0]
		selectedRoute = &rCopy
		selectedRouteID = rCopy.RouteID
	}
	if selectedRoute == nil {
		writeError(w, 400, "INVALID_ROUTE", "No eligible route in assessment to bookmark.", id)
		return
	}

	bmID := fmt.Sprintf("bm-%d", time.Now().UnixNano())
	now := time.Now().UTC()
	bookmark := models.Bookmark{
		BookmarkID:                  bmID,
		OwnerUserID:                 userID,
		AssessmentID:                analysis.RequestID,
		SelectedRouteID:             selectedRouteID,
		OriginSummary:               analysis.Request.Origin,
		DestinationSummary:          analysis.Request.Destination,
		RouteType:                   analysis.Request.Vehicle,
		DistanceKM:                  selectedRoute.DistanceKM,
		ETAMinutes:                  selectedRoute.ETAMinutes,
		RiskLevel:                   selectedRoute.RiskLevel,
		AssessedAt:                  analysis.Response.GeneratedAt,
		SavedAt:                     now,
		ScoringVersion:              analysis.Response.ScoringVersion,
		SnapshotOrRecalculateStatus: "snapshot_saved",
		Snapshot:                    selectedRoute,
		Request:                     analysis.Request,
	}

	if err := bookmarkRepo.SaveBookmark(r.Context(), bookmark); err != nil {
		h.Logger.Error("save bookmark failed", "error", err)
		writeError(w, 500, "DATABASE_ERROR", "Could not save bookmark.", id)
		return
	}

	writeJSON(w, http.StatusCreated, bookmark)
}

func (h *Handler) listBookmarks(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	userID := middleware.UserIDFrom(r)
	bookmarkRepo, ok := h.Repository.(database.BookmarkRepository)
	if !ok {
		writeError(w, 503, "BOOKMARKS_UNAVAILABLE", "Bookmark storage is unavailable.", id)
		return
	}
	limit, offset := 20, 0
	var err error
	if v := r.URL.Query().Get("limit"); v != "" {
		limit, err = strconv.Atoi(v)
	}
	if err != nil || limit < 1 || limit > 50 {
		writeError(w, 400, "INVALID_QUERY", "limit must be 1..50.", id)
		return
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		offset, err = strconv.Atoi(v)
	}
	if err != nil || offset < 0 || offset > 10000 {
		writeError(w, 400, "INVALID_QUERY", "offset must be 0..10000.", id)
		return
	}
	records, err := bookmarkRepo.ListBookmarks(r.Context(), userID, limit, offset)
	if err != nil {
		writeError(w, 503, "BOOKMARKS_UNAVAILABLE", "Could not read bookmarks.", id)
		return
	}
	writeJSON(w, 200, map[string]any{"bookmarks": records, "limit": limit, "offset": offset, "count": len(records)})
}

func (h *Handler) getBookmark(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	userID := middleware.UserIDFrom(r)
	bookmarkRepo, ok := h.Repository.(database.BookmarkRepository)
	if !ok {
		writeError(w, 503, "BOOKMARKS_UNAVAILABLE", "Bookmark storage is unavailable.", id)
		return
	}
	bm, err := bookmarkRepo.GetBookmark(r.Context(), userID, r.PathValue("id"))
	if errors.Is(err, database.ErrNotFound) {
		writeError(w, 404, "BOOKMARK_NOT_FOUND", "Bookmark not found.", id)
		return
	}
	if errors.Is(err, database.ErrUnauthorized) {
		writeError(w, 403, "FORBIDDEN", "You do not have permission to view this bookmark.", id)
		return
	}
	if err != nil {
		writeError(w, 503, "BOOKMARKS_UNAVAILABLE", "Could not read bookmark.", id)
		return
	}
	writeJSON(w, 200, bm)
}

func (h *Handler) deleteBookmark(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	userID := middleware.UserIDFrom(r)
	bookmarkRepo, ok := h.Repository.(database.BookmarkRepository)
	if !ok {
		writeError(w, 503, "BOOKMARKS_UNAVAILABLE", "Bookmark storage is unavailable.", id)
		return
	}
	bmID := r.PathValue("id")
	err := bookmarkRepo.DeleteBookmark(r.Context(), userID, bmID)
	if errors.Is(err, database.ErrNotFound) {
		writeError(w, 404, "BOOKMARK_NOT_FOUND", "Bookmark not found.", id)
		return
	}
	if errors.Is(err, database.ErrUnauthorized) {
		writeError(w, 403, "FORBIDDEN", "You do not have permission to delete this bookmark.", id)
		return
	}
	if err != nil {
		writeError(w, 503, "DELETE_FAILED", "Could not delete bookmark.", id)
		return
	}
	writeJSON(w, 200, map[string]any{"status": "deleted", "bookmark_id": bmID})
}

func (h *Handler) recalculateBookmark(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	userID := middleware.UserIDFrom(r)
	bookmarkRepo, ok := h.Repository.(database.BookmarkRepository)
	if !ok {
		writeError(w, 503, "BOOKMARKS_UNAVAILABLE", "Bookmark storage is unavailable.", id)
		return
	}
	bmID := r.PathValue("id")
	bm, err := bookmarkRepo.GetBookmark(r.Context(), userID, bmID)
	if errors.Is(err, database.ErrNotFound) {
		writeError(w, 404, "BOOKMARK_NOT_FOUND", "Bookmark not found.", id)
		return
	}
	if errors.Is(err, database.ErrUnauthorized) {
		writeError(w, 403, "FORBIDDEN", "You do not have permission to recalculate this bookmark.", id)
		return
	}
	if err != nil {
		writeError(w, 503, "BOOKMARKS_UNAVAILABLE", "Could not read bookmark.", id)
		return
	}

	recalcID := fmt.Sprintf("recalc-%d", time.Now().UnixNano())
	analysis, err := h.Service.Analyze(r.Context(), recalcID, bm.Request)
	if err != nil {
		h.Logger.Error("bookmark recalculation failed", "error", err, "bookmark_id", bmID)
		writeError(w, 500, "RECALCULATION_FAILED", "Could not recalculate route with current data.", id)
		return
	}

	selectedRouteID := bm.SelectedRouteID
	var selectedRoute *models.ScoredRoute
	for i := range analysis.Routes {
		if analysis.Routes[i].RouteID == selectedRouteID {
			rCopy := analysis.Routes[i]
			selectedRoute = &rCopy
			break
		}
	}
	if selectedRoute == nil && len(analysis.Routes) > 0 {
		rCopy := analysis.Routes[0]
		selectedRoute = &rCopy
		selectedRouteID = rCopy.RouteID
	}

	if selectedRoute != nil {
		bm.SelectedRouteID = selectedRouteID
		bm.DistanceKM = selectedRoute.DistanceKM
		bm.ETAMinutes = selectedRoute.ETAMinutes
		bm.RiskLevel = selectedRoute.RiskLevel
		bm.AssessedAt = analysis.GeneratedAt
		bm.SnapshotOrRecalculateStatus = "recalculated_live"
		bm.ScoringVersion = analysis.ScoringVersion
		bm.Snapshot = selectedRoute
		_ = bookmarkRepo.SaveBookmark(r.Context(), bm)
	}

	writeJSON(w, 200, map[string]any{
		"bookmark": bm,
		"analysis": analysis,
	})
}

func oneOf(v string, allowed ...string) bool {
	for _, a := range allowed {
		if v == a {
			return true
		}
	}
	return false
}
func ensureEOF(dec *json.Decoder) error {
	var extra any
	err := dec.Decode(&extra)
	if errors.Is(err, io.EOF) {
		return nil
	}
	if err == nil {
		return errors.New("extra JSON value")
	}
	return err
}
func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "ner-connect-go", "time": time.Now().UTC()})
}
func (h *Handler) live(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "live"})
}
func (h *Handler) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 750*time.Millisecond)
	defer cancel()
	routingOK := h.Routing != nil && h.Routing.Healthy(ctx)
	repoOK := h.Repository == nil || h.Repository.Healthy(ctx)
	intelOK := h.Service != nil && h.Service.Intelligence != nil && h.Service.Intelligence.Healthy(ctx)
	status := http.StatusOK
	state := "ready"
	if !routingOK || !repoOK {
		status = http.StatusServiceUnavailable
		state = "not_ready"
	}
	intelStatus := "healthy"
	if !intelOK {
		intelStatus = "degraded_fallback_active"
	}
	writeJSON(w, status, map[string]any{
		"status": state,
		"dependencies": map[string]any{
			"routing":      routingOK,
			"repository":   repoOK,
			"intelligence": intelStatus,
			"weather":      "degraded_operation_supported",
		},
	})
}
func writeError(w http.ResponseWriter, status int, code, message, id string) {
	writeJSON(w, status, apiError{Error: errorBody{Code: code, Message: message, RequestID: id}})
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
