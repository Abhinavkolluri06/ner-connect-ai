package api

import (
	_ "embed"
	"net/http"
)

//go:embed openapi.json
var openapiDocument []byte

func (h *Handler) openapi(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	_, _ = w.Write(openapiDocument)
}
