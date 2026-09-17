# SIH 2024 / Demo Runbook: NER-Connect AI

This runbook contains exact, step-by-step instructions for demonstrating the system locally or to SIH judges. It covers the four core presentation tracks:

1. **LIVE**: Real OSRM / OpenRouteService routing + live Open-Meteo weather & elevation.
2. **DEMO**: Deterministic, reproducible offline scenario (Guwahati → Shillong) requiring no external API keys or active internet.
3. **RESILIENCE / FALLBACK**: Live demonstration of stopping the internal Python intelligence service, verifying Go's automatic transition to `go_fallback`, and restoring Python.
4. **RESEARCH TRACK**: Honest display of the Kentucky experiment strictly as academic evidence, quarantined from Northeast India routing.

---

## 1. Quick Start: Zero-Config Offline Demo Mode

This mode runs completely locally using pre-packaged demo geometry and simulated terrain/weather proxies.

### Step 1: Start Internal Python Intelligence Service
```bash
cd backend/python
# Activate virtual environment
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # Linux/macOS

# Set environment
export PYTHON_HOST=127.0.0.1
export PYTHON_PORT=8001
export MODEL_MODE=heuristic

python -m app.main
```
*Health verification:*
```bash
curl http://127.0.0.1:8001/health
# Response: {"status":"ok","model_mode":"heuristic","service":"ner-connect-python"}
```

### Step 2: Start Go Public API Service (In a second terminal)
```bash
cd backend/go
# Start in demo mode
export NER_DEMO_MODE=true
export GO_PORT=8080
export PYTHON_SERVICE_URL=http://127.0.0.1:8001
export DATA_PATH=data/demo.db

go run ./cmd/server
```
*Health and readiness check:*
```bash
curl http://127.0.0.1:8080/health/ready
# Response: {"status":"ready","dependencies":{"routing":true,"repository":true,"intelligence":"healthy","weather":"degraded_operation_supported"}}
```

### Step 3: Start Next.js Frontend (In a third terminal)
```bash
cd frontend
npm run dev
```
Open your browser to `http://localhost:3000`.

---

## 2. Controlled SIH Fallback Demonstration

This demonstration proves architectural resilience: **when the internal Python intelligence service crashes or becomes unreachable, Go remains fully operational, entering an explicit fallback mode without inventing fake data or crashing the browser.**

### Step-by-Step Demonstration Flow

1. **Normal State**:
   - In the frontend Route Planner (`http://localhost:3000/route-planner`), enter:
     - Origin: `Guwahati`
     - Destination: `Shillong`
     - Vehicle: `Truck`
     - Priority: `Emergency`
   - Click **Find Safe Route**.
   - Observe the map and route cards:
     - Badge displays: `DEMONSTRATION SCENARIO` or `HEURISTIC ESTIMATE`.
     - Route 1 (Recommended), Route 2, and Route 3 appear with exact road geometry.
     - Structured recommendation reasons appear under "Why Route 1?".

2. **Simulate Service Failure (Kill Python)**:
   - In Terminal 1 (running Python), press `Ctrl+C` to stop the Python service.
   - Run the readiness check:
     ```bash
     curl http://127.0.0.1:8080/health/ready
     ```
   - Notice the truthful output:
     ```json
     {
       "status": "ready",
       "dependencies": {
         "routing": true,
         "repository": true,
         "intelligence": "degraded_fallback_active",
         "weather": "degraded_operation_supported"
       }
     }
     ```

3. **Re-run Route Planning in Degraded Mode**:
   - In the browser, click **Find Safe Route** again.
   - Observe:
     - Request succeeds (HTTP 200).
     - Badge clearly updates to: `GO FALLBACK ACTIVE`.
     - A visible amber banner warns: `Assessment Notices & Limitations: Python intelligence service unavailable; deterministic Go fallback scoring applied.`
     - No fake zero-risk values appear.
     - Route planning remains safe and available for emergency dispatch.

4. **Restore Service**:
   - In Terminal 1, restart Python:
     ```bash
     python -m app.main
     ```
   - In browser, click **Find Safe Route** again.
   - Status instantly recovers from fallback to healthy intelligence.

---

## 3. Testing Authentication & User Isolation

NER-Connect AI strictly isolates user history and bookmarks. User A can never inspect, bookmark, or delete User B's route assessments.

### Automated Smoke Verification:
```bash
python scripts/smoke-python-go.py
```
This script validates:
- Python service contract and latency benchmarks.
- Authoritative Go `POST /api/v1/routes/analyze` orchestration.
- Bookmark creation, snapshot geometry retention, and recalculation.
- Automatic transition to `go_fallback` upon Python termination.
- Database recovery and consistency across restarts.

---

## 4. Key Architectural Claims for Judges

1. **Go is the Sole Authority**: Go owns public endpoints, input validation, external providers, caching, persistence, hard route closures, and final route ranking. Python is an internal advisory service only.
2. **Never Treat Missing Data as Safe**: If weather or hazard sensors are missing or offline, the system marks them as `unavailable` or `degraded`. It never pretends missing rainfall means zero flood risk.
3. **Deterministic Tie-Breaking & Trade-Off Guards**: Small ETA differences (<3 minutes) are guarded to prevent relative normalization from producing wild score swings on near-identical routes.
4. **GeoJSON Geometric Truth**: The exact GeoJSON coordinates calculated by the routing engine and scored by the backend flow directly to the interactive Leaflet map and saved bookmarks. The frontend never invents or guesses route paths.

---

## 5. Database Backup, Restore, and History Retention Policy

### A. BoltDB (Embedded Development/Standalone Mode)
- **File Location**: Configured via `DATA_PATH` (default: `data/ner-connect.db`).
- **Hot Backup**:
  ```bash
  # Install bbolt CLI if needed: go install go.etcd.io/bbolt/cmd/bbolt@latest
  bbolt dump data/ner-connect.db > backup-$(date +%Y%m%d).db
  # Or copy when Go server process is stopped:
  cp data/ner-connect.db data/ner-connect-backup.db
  ```
- **Restore**:
  ```bash
  # Stop Go server, replace database file, and restart
  cp data/ner-connect-backup.db data/ner-connect.db
  ```

### B. PostgreSQL (Production / Containerized Cluster)
- **Database Backup**:
  ```bash
  docker compose exec -T postgres pg_dump -U ner_connect -Fc ner_connect > ner_connect_backup_$(date +%Y%m%d).dump
  ```
- **Database Restore**:
  ```bash
  docker compose exec -T postgres pg_restore -U ner_connect -d ner_connect --clean --if-exists ner_connect_backup.dump
  ```

### C. History Retention and Purge Policy
- **Automated Retention**: Historical route assessments are subject to a 90-day retention window. Older assessment records can be pruned using the database engine's `PruneOlderThan(ctx, cutoff)` API.
- **User Self-Serve Purge**: Authenticated users have full control to immediately delete any of their historical assessments via `DELETE /api/v1/analyses/{id}`. Ownership is strictly enforced; attempting to delete another user's assessment yields `HTTP 403 Forbidden`.
- **Bookmarks Immortality**: Saved bookmarks (`/api/v1/bookmarks`) are exempt from 90-day retention until explicitly deleted by their owner, preserving audit trails and key critical transport routes.

