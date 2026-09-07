package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/database"
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
		writeError(w, status, code, "The route analysis could not be completed.", id)
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
