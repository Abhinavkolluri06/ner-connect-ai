# NER-Connect AI — Frontend Hackathon Demo Runbook

> **Target Audience**: Hackathon Judges, Technical Evaluators, Operational Dispatchers  
> **Platform**: NER-Connect AI (Disaster-Resilient Route Assessment Platform)  
> **Last Verified**: September 23, 2026  
> **Primary Scenario**: Guwahati (Assam) → Shillong (Meghalaya) Mountain Highway Corridor

---

## 1. Architecture Overview & Core Invariants

Before demonstrating, keep these three non-negotiable principles in mind:
1. **Authoritative Backend**: A single Go backend endpoint (`POST /api/v1/routes/analyze`) computes all candidate routes, geometry, trade-offs, structured evidence reasons, and rankings. The browser never computes its own route risk scores.
2. **Zero Fabrication**: Missing or failed hazard telemetry is strictly preserved as `null` and displayed as `"Not evaluated"` or `"Unavailable"`. It is **never** coerced to `0` or false `"Safe"` status.
3. **Explicit Isolation**: Live network or ML failures display actionable error messages with correlation request IDs and **never** silently fall back to mock data. Demo data is loaded only when explicitly requested and is always badged with `DEMO DATA`.

---

## 2. Environment Startup & Health Check

### Terminal 1: Python Intelligence Service (Port 8000)
```bash
cd backend/python
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Health verification*: `curl http://127.0.0.1:8000/health` → `{"status": "ok"}`

### Terminal 2: Go Core Routing & Scoring Engine (Port 8080)
```bash
cd backend/go
go run ./cmd/server
```
*Health verification*: `curl http://127.0.0.1:8080/health/ready` → `{"status": "ready", ...}`

### Terminal 3: Next.js Frontend (Port 3000)
```bash
cd frontend
npm run dev
```
*Access in browser*: `http://localhost:3000`

---

## 3. Demonstration Flow A: Normal Live Operation

### Step 1: Open the Application Dashboard
- Navigate to `http://localhost:3000`.
- **Observe Telemetry**: In the top metrics banner, observe the real-time **System Health** badge (`Operational`). Point out that this is actively queried from `/health/ready` and is not a static claim.

### Step 2: Open Route Planner
- Click **Route Planner** in the top navigation or sidebar.
- Observe the singular main landmark layout and accessible combobox input fields.

### Step 3: Input Corridor Points
- In the **Origin** field, type `Guwahati` (or press Down arrow to select from suggestions).
- In the **Destination** field, type `Shillong`.
- Set **Vehicle** to `Truck` and **Cargo** to `Medical Supplies`.
- Click **Analyze Route Options**.

### Step 4: Multi-Corridor Comparison
- When the assessment returns, show the candidate cards in the **Route Options** section:
  1. **Recommended Corridor** (e.g. `NH6 Primary Corridor`): Badged in green with `Recommended`.
  2. **Fastest Corridor** (e.g. `Bhoirymbong Bypass`): Badged in blue with `Fastest` and duration savings.
  3. **Alternative Corridors**: Badged in slate or amber with explicit trade-off indicators (`+24m slower (+11 km)`).
- **Key Talking Point**: Highlight that the fastest route is **not** automatically the recommended route; the engine balanced speed against landslide exposure.

### Step 5: Interactive Map Synchronization
- Click the alternative corridor card or click its polyline directly on the **Leaflet Map**.
- Point out the visual feedback:
  - Selected polyline elevates to weight `6` and raises to the top z-index.
  - Non-selected alternatives show a dashed stroke (`8 6`), while high-risk segments use a dotted stroke (`3 6`).
  - The map popup provides a one-click `Select Corridor` action.
- Click the **⛶ Fit Corridors** button in the map's upper-right corner to show automatic recentering.

### Step 6: Active Hazard Pins & Layer Toggles
- In the top-right map controls, click **Legend & Layers ▾**.
- Demonstrate the **Hazard Layer Toggles**:
  - Toggle off `Landslide Warning Pins` to clean the view.
  - Toggle them back on to reveal severe hazard points along the highway pass.
- Click an individual warning pin on the map to reveal its exact coordinate, hazard type, and severity tag.

### Step 7: Inspect "Why This Route?" Evidence
- Direct attention to the right-hand **Recommendation Analysis** panel:
  - Show the **Intelligence Mode Badge**: badged with `Live ML Decision Support` (or `Multi-Criteria Heuristic`).
  - Show the **Key Decision Factors & Evidence**: structured evidence chips (e.g. `slope gradient: 18°`, `rainfall: 42 mm/h`) derived directly from Go backend models.

### Step 8: Source Provenance & Freshness
- Click **Data Provenance & Freshness** in the map overlay:
  - Shows NASA/USGS SRTM 90m topography source.
  - Shows Open-Meteo hourly weather provider.
  - Explains that unmodeled signals are preserved as null.

### Step 9: Save Assessment Snapshot
- In the left sidebar under the form, click **Save Assessment**.
- In the accessible modal dialog, enter: `Guwahati-Shillong Medical Dispatch Alpha`.
- Click **Save Bookmark**.
- Show the success confirmation: *"Assessment Snapshot Saved! This corridor and its evaluated risk metrics have been archived as an immutable snapshot."*

### Step 10: Restore Historical Snapshot
- Navigate to **Saved Bookmarks** (`/bookmarks`).
- Show the newly saved bookmark card displaying the `SAVED SNAPSHOT` badge and capture timestamp.
- Click **View Saved Snapshot →**.
- Route Planner opens with an amber warning banner:
  *"Historical Assessment Snapshot: Hazards reflect capture conditions from [Date]."*
- Explain to judges: even if tomorrow's rain changes, this historical log remains legally and operationally frozen.

### Step 11: In-Place Live Recalculation
- Click **⟳ Recalculate with Live Conditions** directly in the banner.
- The platform issues a request to `POST /api/v1/bookmarks/{id}/recalculate`.
- The banner transitions to green: `RECALCULATED LIVE` with fresh telemetry.

### Step 12: Inline Rename & Accessible Delete
- Return to `/bookmarks`.
- Click **Rename** on a bookmark card, edit the title, and save.
- Click **Remove**; demonstrate the accessible two-step confirmation (`Delete? [Confirm] [Cancel]`).
- Click **Confirm**; observe immediate removal without page reloads or raw errors.

---

## 4. Demonstration Flow B: Degraded Intelligence (Go Fallback)

This flow proves that the frontend truthfully reports backend degradation rather than hiding failures.

### Step 1: Simulate ML Service Outage
- In Terminal 1, stop the Python service (`Ctrl + C`).

### Step 2: Request Route Assessment
- In the Route Planner, submit another search for `Guwahati → Shillong`.

### Step 3: Observe Truthful Degraded State
- The route planning **still succeeds** (resilience).
- A prominent amber operational alert appears:
  *"Operational Notice: Heuristic Fallback Mode Active. Python ML hazard service is unavailable; deterministic Go heuristic scoring applied."*
- The AI Explanation badge changes from `Live ML Decision Support` to `Go Fallback Active`.
- The UI **does not pretend** ML was computed.

### Step 4: Service Recovery
- Restart the Python service in Terminal 1.
- Click **Analyze Route Options** again.
- The system automatically transitions back to `Live ML Decision Support`.

---

## 5. Demonstration Flow C: Deterministic Offline Demo Mode

If internet connectivity is lost or evaluating in an offline environment:

### Step 1: Load Demo Scenario
- On the Route Planner, click **Load Guwahati → Shillong** under *Demo Scenarios*.
- A purple banner appears across the top:
  `DEMO DATA` — *Demonstration Scenario Active: Verified static corridor geometry (Guwahati → Shillong) with synthetic hazard indicators.*
- Candidate routes, Leaflet polylines, and trade-offs load instantly.
- Judges can verify that this demo scenario is explicitly badged and **never** masquerades as live telemetry.

---

## 6. Summary of Judge Takeaways

| Evaluator Question | NER-Connect AI Architecture Proof |
| :--- | :--- |
| *Who calculates the route risks?* | The Go backend engine (`/api/v1/routes/analyze`); the browser is purely a thin, accessible presentation client. |
| *What happens if a sensor is missing?* | Never coerced to 0% or "Safe". Preserved as `null` and displayed as "Not evaluated". |
| *What happens when ML crashes?* | Circuit breaker activates `go_fallback` mode; user is warned with clear operational disclaimers. |
| *How are saved routes preserved?* | Frozen historical snapshots with immutable timestamps, with optional live recalculation. |
| *Is the app accessible?* | WCAG 2.1 AA compliant: keyboard combobox, focus trapping, reduced motion, and non-color route differentiation. |
