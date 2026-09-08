# NER-Connect AI

## Compare your own JSON file (offline demo)

```powershell
cd C:\ner-connect-ai
.\scripts\compare-routes.ps1
```

Paste `C:\ner-connect-ai\examples\route-comparison\25-scenarios.json` at the prompt,
or use your own file following `examples/route-comparison/single-trip.json`.
The engine compares supplied routes, prints the winner and exclusions, and saves
timestamped JSON results. No web server or Python service is needed. This is
rule-based scoring, not trained ML. See [JSON workflow instructions](docs/json-route-comparison.md).

The running Go API also accepts direct JSON at `POST /api/v1/routes/compare`.

NER-Connect AI is a route-planning and logistics accessibility platform for Northeast India. This repository currently includes the resilient Go public backend; the frontend and Python intelligence service are separate components.

## Run the Go backend

```powershell
cd backend/go
$env:NER_DEMO_MODE="true"
go run ./cmd/server
```

Demo mode provides deterministic Guwahati-to-Shillong routing and weather data. If the Python intelligence service is unavailable, the API remains operational using the explicitly identified heuristic fallback.

Backend verification commands are in [docs/testing.md](docs/testing.md).

## Run the Python intelligence service

```powershell
cd backend/python
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m app.main
```

Python listens on `127.0.0.1:8001`. Start Go in a separate terminal. The Python service
returns transparent heuristic hazard/accessibility signals; no real trained model is supplied.
Go keeps final scoring and ranking. See [Python architecture](docs/python-intelligence.md),
[risk features](docs/risk-features.md), [model status](docs/ml-models.md),
[training](docs/training.md) and [testing](docs/testing.md).
