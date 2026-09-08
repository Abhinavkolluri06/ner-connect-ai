package api

import (
	"github.com/ner-connect-ai/backend-go/internal/comparison"
	"github.com/ner-connect-ai/backend-go/internal/middleware"
	"net/http"
)

func (h *Handler) compare(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, comparison.MaxBytes)
	defer r.Body.Close()
	var in comparison.Request
	if err := comparison.Decode(r.Body, &in); err != nil {
		writeError(w, 400, "INVALID_COMPARISON", err.Error(), middleware.RequestIDFrom(r))
		return
	}
	out, err := comparison.Evaluate(r.Context(), in)
	if err != nil {
		writeError(w, 400, "INVALID_COMPARISON", err.Error(), middleware.RequestIDFrom(r))
		return
	}
	status := 200
	if out.Status == "no_eligible_routes" {
		status = 422
	}
	writeJSON(w, status, out)
}
