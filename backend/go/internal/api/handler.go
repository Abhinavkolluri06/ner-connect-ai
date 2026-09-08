package api

import (
	"context"
	"encoding/json"
	"errors"
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
	mux.HandleFunc("GET /api/v1/locations", h.locations)
	mux.HandleFunc("POST /api/v1/locations/{id}/accessibility", h.analyze)
	mux.HandleFunc("GET /api/v1/analyses", h.history)
	mux.HandleFunc("GET /api/v1/analyses/{id}", h.analysisRecord)
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
	resp, err := h.Service.Analyze(r.Context(), id, req)
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
	records, err := repo.List(r.Context(), limit, offset)
	if err != nil {
		writeError(w, 503, "HISTORY_UNAVAILABLE", "Could not read history.", id)
		return
	}
	summaries := []map[string]any{}
	for _, v := range records {
		summaries = append(summaries, map[string]any{"request_id": v.RequestID, "created_at": v.CreatedAt, "request": v.Request, "recommended_route_id": v.Response.RecommendedRouteID, "intelligence_mode": v.Response.IntelligenceMode, "route_count": len(v.Response.Routes)})
	}
	writeJSON(w, 200, map[string]any{"analyses": summaries, "limit": limit, "offset": offset, "count": len(summaries)})
}
func (h *Handler) analysisRecord(w http.ResponseWriter, r *http.Request) {
	id := middleware.RequestIDFrom(r)
	repo, ok := h.Repository.(database.HistoryRepository)
	if !ok {
		writeError(w, 503, "HISTORY_UNAVAILABLE", "History storage is unavailable.", id)
		return
	}
	record, err := repo.Get(r.Context(), r.PathValue("id"))
	if errors.Is(err, database.ErrNotFound) {
		writeError(w, 404, "ANALYSIS_NOT_FOUND", "Analysis not found.", id)
		return
	}
	if err != nil {
		writeError(w, 503, "HISTORY_UNAVAILABLE", "Could not read history.", id)
		return
	}
	writeJSON(w, 200, record)
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
	routingOK := h.Routing.Healthy(ctx)
	repoOK := h.Repository == nil || h.Repository.Healthy(ctx)
	status := http.StatusOK
	state := "ready"
	if !routingOK || !repoOK {
		status = http.StatusServiceUnavailable
		state = "not_ready"
	}
	writeJSON(w, status, map[string]any{"status": state, "dependencies": map[string]any{"routing": routingOK, "repository": repoOK, "intelligence": "optional_with_fallback", "weather": "degraded_operation_supported"}})
}
func writeError(w http.ResponseWriter, status int, code, message, id string) {
	writeJSON(w, status, apiError{Error: errorBody{Code: code, Message: message, RequestID: id}})
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
