# NER-Connect AI

NER-Connect AI is a route-planning and logistics accessibility platform for Northeast India. This repository currently includes the resilient Go public backend; the frontend and Python intelligence service are separate components.

## Run the Go backend

```powershell
cd backend/go
$env:NER_DEMO_MODE="true"
go run ./cmd/server
```

Demo mode provides deterministic Guwahati-to-Shillong routing and weather data. If the Python intelligence service is unavailable, the API remains operational using the explicitly identified heuristic fallback.

See `docs/go-backend.md`, `docs/api.md`, `docs/scoring.md`, `docs/testing.md`, and `docs/demo.md` for details.
