# NER-Connect AI — Complete Backend Architecture & Technical Reference (A to Z)

> **Full Documentation Location**: [`docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md`](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md)  
> **Document Version**: 2.0.0  
> **Scope**: Go Core Decision & Routing Engine (`backend/go`) and Python Intelligence Service (`backend/python`)

---

## Quick Navigation

1. **[Executive Summary & System Purpose](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#1-executive-summary--system-purpose)**: Problem statement for Northeast India (monsoon rainfall, landslides, flash floods, Himalayan terrain, single-artery logistics).
2. **[High-Level System Topology](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#2-high-level-system-topology--separation-of-concerns)**: Architecture diagram, separation of concerns between Go (Decision/Routing Authority) and Python (Hazard ML Inference).
3. **[Core Architectural Invariants](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#3-core-architectural-invariants)**: Non-negotiable rules (Go sole authority, zero risk fabrication, bounded timeouts, circuit breaking).
4. **[Go Core Routing & Decision Engine](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#4-go-core-routing--decision-engine-backendgo)**:
   - Server lifecycle & main entrypoint (`cmd/server/main.go`)
   - Configuration matrix & environment variables (`internal/config/config.go`)
   - HTTP API handlers & middleware stack (`internal/api/handler.go`, `internal/middleware/`)
   - Analysis orchestrator & concurrent request flow (`internal/api/service.go`)
   - Routing providers: OSRM, OpenRouteService, and Demo Guwahati–Shillong benchmark (`internal/routing/`)
   - Weather telemetry: Open-Meteo arrival-aware hourly precipitation windows (`internal/weather/`)
   - Exclusion engine: Bridge weight limits, vehicle height clearance, road survey closures (`internal/features/feed.go`)
   - Terrain enrichment: DEM slope & elevation calculation (`internal/features/terrain.go`)
   - Multi-Criteria Decision Analysis (MCDA) scoring & ranking engine (`internal/scoring/scoring.go`)
   - Circuit breaker registry (`internal/circuit/circuit.go`)
   - Database repository: Supabase PostgreSQL, BoltDB, and snapshot persistence (`internal/database/`)
5. **[Python Intelligence Service](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#5-python-intelligence-service-backendpython)**:
   - FastAPI structure & lifespan (`app/main.py`, `app/service.py`)
   - Heuristic risk engine (`app/risk/heuristics.py`)
   - Machine learning risk engine (`app/risk/ml.py`)
   - Bottleneck-weighted micro-segment hazard aggregation: `0.6*Max + 0.4*P90` (`app/risk/aggregation.py`)
   - Model training pipelines & NASA landslide data integration (`training/`)
6. **[Inter-Service Communication & Failure Matrix](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#6-inter-service-communication--failure-matrix)**: State transitions (`live_ml`, `go_fallback`, `partial`, `demo`) and fault isolation matrix.
7. **[API Contracts & Schemas](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#7-api-contracts--schema-specifications)**: Canonical JSON schemas for requests, responses, hazard details, and recommendation reasons.
8. **[Security, Auth & Compliance](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#8-security-authentication--data-protection)**: Supabase JWT validation, service token constant-time comparison, DoS body limits, provider secret isolation.
9. **[Operational Runbook & Testing](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md#9-operational-runbook-testing--deployment)**: Terminal commands to run Go, Python, and Next.js, test suites, and Docker container builds.

---

*(Please refer to the full master reference in [docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md](file:///c:/ner-connect-ai/docs/BACKEND_ARCHITECTURE_AND_REFERENCE.md) for complete technical text, mathematical formulas, sequence diagrams, and source code excerpts).*
