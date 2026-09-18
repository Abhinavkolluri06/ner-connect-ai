# NER-Connect AI: Disaster-Resilient Logistics & Route Intelligence for Northeast India

NER-Connect AI is an intelligent route-planning and disaster-resilience accessibility platform engineered specifically for the unique terrain and hazard landscape of Northeast India (NER).

---

## 1. Project Objective

To provide emergency responders, humanitarian relief agencies, and logistics operators with transparent, multi-criteria route recommendations that balance travel time, road infrastructure constraints, and dynamic natural hazard exposure across the 8 Northeastern states.

---

## 2. The Problem Being Solved

Standard commercial navigation systems optimize almost exclusively for shortest travel time or distance. In mountainous terrain like Northeast India, this creates dangerous vulnerabilities:
- **Severe Natural Hazards**: Heavy monsoon rainfall triggers frequent landslides, mudslides, and flash flooding in narrow river valleys.
- **Single-Corridor Bottlenecks**: Many highland settlements rely on a single highway artery; uncoordinated routing into closed or hazardous corridors strands critical relief convoys.
- **Infrastructure Constraints**: Steep gradients, narrow switchbacks, and bridge load limits prohibit heavy trucks and fuel tankers from traversing shortcuts that passenger cars might navigate.

NER-Connect AI replaces blind travel-time minimization with risk-aware route orchestration that explicitly evaluates terrain slopes, precipitation levels, vehicle dimensions, and verified road closures.

---

## 3. System Architecture

The architecture enforces strict separation of concerns, fail-closed boundaries, and zero secret leakage:

```
[Browser / Leaflet UI]
         │  (HTTPS / User Session Cookie)
         ▼
[Next.js 16 BFF Server Handlers]  (frontend/app/api/v1/...)
         │  • Authenticates Supabase session server-side
         │  • Attaches verified X-User-ID
         │  • Attaches internal Bearer API_TOKEN (never exposed to browser)
         ▼
[Authoritative Go Public API :8080]  (backend/go/cmd/server)
   ├── Routing Providers (OSRM / OpenRouteService / Offline Demo)
   ├── Weather & Terrain Ingestion (Open-Meteo APIs / SRTM DEM)
   ├── Advisory Feed & Hard Closures (Pre-scoring exclusion)
   ├── Internal Intelligence Invocation
   │        │
   │        ▼
   │   [Internal Python Intelligence :8001]  (backend/python/app/main.py)
   │        • /internal/v1/risk/analyze (Internal-only)
   │        • Evaluates segment physical proxies (slope, rain, elevation)
   │        • Computes settlement accessibility indices
   │        • Returns segment-level risk metrics
   │
   ├── Fallback Engine (Activates automatically if Python fails)
   ├── Multi-Criteria Scoring Engine (Absolute trade-off guards & vehicle weights)
   ├── Final Route Ranking & Recommendation Reasons
   └── Encrypted Persistence (BoltDB / PostgreSQL with strict user isolation)
```

---

## 4. Go & Python Responsibilities

| Responsibility | Go Public Backend | Python Intelligence Service |
| :--- | :---: | :---: |
| **Public HTTP Boundary & CORS** | **Sole Owner** | *Internal Only (Port 8001)* |
| **Input Validation & Sanitization** | **Sole Owner** | Feature Schema Validation |
| **Routing Provider Orchestration** | **Sole Owner** | Does Not Route |
| **Live Weather & DEM Ingestion** | **Sole Owner** | Receives Normalized Segments |
| **Road Closures & Vehicle Clearance**| **Sole Owner (Pre-Scoring)**| Does Not Filter Closures |
| **Geohazard Physical Modeling** | Fallback Heuristic Owner | **Primary Advisor** |
| **Settlement Accessibility Evaluation**| High-Level API | Graph & Corridor Analysis |
| **Multi-Criteria Scoring & Ranking**| **Sole Owner** | *Forbidden from Selecting Winner* |
| **Database Persistence & User Isolation**| **Sole Owner** | Stateless |

---

## 5. How Routing Works

1. **Request Ingestion**: Accepts origin, destination, vehicle class (`truck`, `car`, `van`, `ambulance`, `motorcycle`), cargo type (`medical_supplies`, `food`, `general`, `passengers`, `emergency_equipment`), priority profile (`emergency`, `fastest`, `normal`, `safest`), and optional vehicle dimensions (height, width, length, weight, axle load).
2. **Corridor Discovery**: Obtains 1–3 alternative candidate corridors from live routing providers (OSRM / OpenRouteService) or local deterministic datasets, preserving high-resolution GeoJSON coordinates.
3. **Hard Exclusions (Pre-Scoring)**: Evaluates active road closures and vehicle physical restrictions (e.g. bridge weight limits or tunnel clearances). Any corridor violating hard constraints is disqualified prior to scoring and recorded in exclusion warnings.

---

## 6. How Intelligence Works

1. **Segment Decomposition**: Routes are divided into discrete spatial segments along the road network.
2. **Feature Enrichment**: Go annotates segments with central-difference slope gradients, absolute elevation, and live/forecast precipitation from Open-Meteo.
3. **Feature-Range Validation**: Feature bounds (e.g. latitude, longitude, rainfall >= 0, slope 0°–90°) are checked. Non-finite values (NaN/Infinity) are rejected.
4. **Hazard Assessment**: Python evaluates susceptibility using verified physical proxies:
   - *Landslide Susceptibility*: Multi-factor rule combining slope gradient, cumulative precipitation, and historical event frequency.
   - *Flash Flood Risk*: Inundation proxy combining precipitation accumulation, elevation depression, and valley bottom drainage.
   - *Settlement Accessibility*: Vulnerability index accounting for alternative corridor redundancy and single-access choke points.
5. **Transparent Hand-off**: Python returns segment-level metrics to Go. Go verifies mathematical bounds and normalizes scores using guarded trade-off functions.

---

## 7. Explicit Engine Modes

Every assessment returned by the system declares its exact operational mode:

- `live_ml`: Serving approved machine learning inference on complete regional feature sets.
- `live_heuristic`: Active production default utilizing deterministic physical domain heuristics on live weather and terrain feeds.
- `go_fallback`: Automatic Go internal fallback engaged when Python intelligence is unreachable or input features are incomplete.
- `partial`: Operating with partial sensor signals (e.g. live weather provider unreachable); missing features are explicitly surfaced.
- `demo`: Deterministic, offline demonstration scenario (Guwahati → Shillong) using verified static geometry.

---

## 8. Resilience & Fallback Behavior

NER-Connect AI is built to maintain emergency operations during severe infrastructure disruptions:
- **Python Service Outage**: If the Python service crashes, times out, or returns an error, Go does NOT drop the user request. Go automatically transitions to `go_fallback` mode using internal heuristic scoring.
- **Frontend Alerting**: The user interface displays a visible badge (`GO FALLBACK ACTIVE`) and clear warning banners detailing that fallback scoring is in effect.
- **No False Safety**: Missing data is never converted into zero risk. Missing weather or terrain is flagged explicitly.
- **Automatic Recovery**: Once the Python service restarts, Go immediately resumes full intelligence scoring on subsequent requests without requiring a backend restart.

---

## 9. Authentication & User Isolation

- **Server-Side BFF Verification**: Browser clients authenticate with Supabase Auth. The Next.js BFF validates the user session server-side and forwards requests to Go with an authenticated `X-User-ID` header.
- **Cryptographic JWT Validation**: Go verifies Supabase HMAC-SHA256 signatures, `iss`, `aud: "authenticated"`, and token expiration (`exp`).
- **Strict Data Isolation**: Every saved analysis and bookmark is stamped with `owner_user_id`. User A cannot read, recalculate, or delete User B's records (HTTP 403 Forbidden is strictly enforced).

---

## 10. Data Sources & Provenance

| Signal / Layer | Source | License | Refresh | Fallback Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Road Network & Routing** | OpenStreetMap / OSRM / ORS | ODbL 1.0 / Apache 2.0 | Weekly extract / live | Fails closed (503) if network unreachable. |
| **Precipitation & Weather** | Open-Meteo (ECMWF & GFS) | CC BY 4.0 | Hourly update | Explicit `degraded` warning; no zero-rain assumption. |
| **Elevation & Slope** | NASA SRTM 90m DEM | Public Domain | Static reference | Cached; central-difference slope estimation. |
| **Advisory & Closures** | Regional Agency Feed | Public Data | Event-driven | Expired feeds trigger cautionary advisories. |

---

## 11. Machine Learning Status & Scientific Honesty

- **Production Serving**: Landslide susceptibility (`heuristic-v2.0`) and flood susceptibility (`heuristic-flood-v1.0`) are deterministic physical heuristics.
- **Research Experiment Quarantined**: The Eastern Kentucky Landslide study (`research-ky-landslide-v1.2`, XGBoost) is an academic experiment on Appalachian geology. It is **not** validated for Northeast India Himalayan terrain and is strictly quarantined from live routing.
- **Legacy Quarantine**: Unauthenticated synthetic road models have been removed from production and archived under `legacy/synthetic_model_legacy/`.

---

## 12. Known Limitations

1. **Microclimatic Weather Resolution**: Global weather grid cells (11 km) can smooth out extreme localized rainfall spikes in narrow Himalayan gorges.
2. **Hydraulic Telemetry**: Flash flood indices are based on precipitation and elevation depressions, not real-time river gauge telemetry.
3. **Decision Support Only**: Assessments are planning guidelines and do not constitute legal travel clearance or guarantees of zero risk.

---

## 13. Running Locally

### Prerequisites
- Go 1.25+
- Python 3.14+ (with `venv`)
- Node.js 20+

### Step 1: Start Python Intelligence Service
```bash
cd backend/python
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt -r requirements-dev.txt
python -m app.main
```
*Health Check:* `http://127.0.0.1:8001/health`

### Step 2: Start Go Backend API (Terminal 2)
```bash
cd backend/go
# For deterministic demo mode:
go run ./cmd/server
```
*Readiness Check:* `http://127.0.0.1:8080/health/ready`

### Step 3: Start Next.js Frontend (Terminal 3)
```bash
cd frontend
npm install
npm run dev
```
*Access UI:* `http://localhost:3000`

---

## 14. Running Tests

### Go Backend Test Suite
```bash
cd backend/go
go test -v ./...
go vet ./...
```

### Python Intelligence Test Suite
```bash
cd backend/python
python -m pytest -q
python -m ruff check app
```

### Synthetic Backend Scenario Suite (15 End-to-End Scenarios)
```bash
python scripts/test-backend-scenarios.py --output scratch/scenarios.json
```

### Integration Smoke & Fallback Test
```bash
python scripts/smoke-python-go.py
```

---

## 15. Running the SIH Demonstration

Follow the full presentation sequence in [`docs/SIH_DEMO_RUNBOOK.md`](docs/SIH_DEMO_RUNBOOK.md):
1. **Normal Flow**: Plan Guwahati → Shillong (Emergency, Truck). Observe exact geometry, badges, and recommendation rationale.
2. **Bookmark Flow**: Save bookmark, refresh, reopen from `/bookmarks`, and trigger live recalculation.
3. **Fallback Flow**: Terminate Python process (`Ctrl+C`). Rerun route analysis in browser. Confirm Go remains operational, switches to `GO FALLBACK ACTIVE`, and surfaces informative alerts.
4. **Recovery Flow**: Restart Python. Rerun route analysis. Confirm instantaneous recovery to healthy intelligence.

---

## 16. Project Structure

```
ner-connect-ai/
├── .github/workflows/          # GitHub Actions CI (Ubuntu race, vet, pytest, docker, frontend)
├── backend/
│   ├── go/                     # Authoritative public Go backend
│   │   ├── cmd/server/         # HTTP server entrypoint
│   │   ├── internal/
│   │   │   ├── api/            # Route handlers, OpenAPI 2.0, bookmarks CRUD
│   │   │   ├── database/       # BoltDB & PostgreSQL repositories, user isolation
│   │   │   ├── intelligence/   # Internal HTTP client for Python & fallback engine
│   │   │   ├── middleware/     # Auth, Supabase JWT verification, rate limiting, logging
│   │   │   ├── routing/        # OSRM, OpenRouteService, and Demo providers
│   │   │   ├── scoring/        # Multi-criteria scoring, trade-off guards, ranking
│   │   │   └── weather/        # Open-Meteo weather integration
│   │   └── Dockerfile          # Multi-stage unprivileged container build
│   └── python/                 # Internal Python intelligence service
│       ├── app/                # FastAPI application, schemas, and heuristic engines
│       ├── model_artifacts/    # Cryptographically verified model weights
│       ├── tests/              # Pytest suite (86 contract, heuristic, and unit tests)
│       └── Dockerfile          # Hardened Python 3.14 container build
├── frontend/                   # Next.js 16 / React 19 Frontend
│   ├── app/                    # App Router pages and trusted BFF proxy handlers
│   ├── components/             # RoutePlanner, LeafletMap, RouteCard, RouteForm
│   └── lib/                    # Supabase client/server auth and typed contracts
├── docs/                       # Runbooks, architecture docs, performance reports
├── legacy/                     # Quarantined legacy synthetic models
├── scripts/                    # Test suites, benchmarks, and smoke test utilities
├── DATA_STATUS.md              # Data provenance and license registry
├── MODEL_STATUS.md             # Scientific status and model limitations registry
└── compose.yaml                # Multi-service production deployment manifest
```
