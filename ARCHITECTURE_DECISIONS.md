# Architecture Decision Log — NER-Connect AI Frontend

This document records significant architectural decisions made during the evolution of the NER-Connect AI frontend.

---

## ADR 001: Authoritative Route Planning Endpoint Selection (`/api/v1/routes/analyze` vs `/api/v1/routes/compare`)

- **Status**: Accepted (Phase 1 Contract Freeze)
- **Date**: 2026-09-23
- **Context**:
  The execution prompt referenced `POST /api/v1/routes/compare` as the target Go endpoint for route comparison.
  Upon code and OpenAPI inspection:
  1. `POST /api/v1/routes/analyze` is the authoritative orchestrating endpoint implemented in `backend/go/internal/api/handler.go` and defined in `openapi.json`. It accepts `{ origin, destination, vehicle, cargo, priority, vehicle_dimensions }`, fetches routes via OSRM/ORS/Demo, enriches them with terrain and Open-Meteo weather, invokes the internal Python risk service, scores/ranks candidates, and returns GeoJSON coordinates, recommendation reasons, and hazard breakdowns.
  2. `POST /api/v1/routes/compare` is an offline supplied-features tool (defined in `internal/comparison/comparison.go`) that takes pre-calculated numeric route metrics without querying external routing providers or models.
  3. `frontend/app/api/v1/routes/analyze/route.ts` already exists as a trusted Next.js BFF proxy to Go's `/api/v1/routes/analyze`.
- **Options Considered**:
  - *Option A*: Change Go to make `/api/v1/routes/compare` do full orchestration (high risk, breaks existing Go comparison tool).
  - *Option B (Recommended)*: Use `POST /api/v1/routes/analyze` as the live route-planning and comparison engine, and retain `/api/v1/routes/compare` strictly for offline scenario evaluation.
- **Decision**:
  Target `POST /api/v1/routes/analyze` via the Next.js BFF proxy for all live route-planning requests.
- **Impact & Trade-offs**:
  Preserves existing Go architecture and OpenAPI contract. Aligns frontend with authoritative backend models and eliminates redundant provider calls.

---

## ADR 002: Single Authoritative Response and Elimination of Browser Mock Logic

- **Status**: Accepted (Phase 1 Contract Freeze)
- **Date**: 2026-09-23
- **Context**:
  The frontend previously had scattered logic:
  - `LeafletMap.tsx` independently invoked `/api/map-route` (calling Nominatim/OSRM) if routes were missing coordinates.
  - `mock-routes.ts` introduced browser-side fabrications (e.g. `isRecommended = route.route_id === recommendedId || index === 0`, hardcoded `essentialServicesProximity: 75`).
  - `RoutePlanner.tsx` calculated some state independently.
- **Decision**:
  A single authoritative response from `POST /api/v1/routes/analyze` drives:
  1. Route cards and trade-off comparison.
  2. Selected and recommended route identities.
  3. Leaflet map geometry and waypoints (using returned GeoJSON).
  4. Evidence and recommendation rationale.
  5. Hazard breakdowns, confidence, and freshness metadata.
  6. Bookmark snapshot payloads.
  The frontend is strictly prohibited from overriding recommendation rankings or generating operational risk scores.
- **Impact & Trade-offs**:
  Eliminates `/api/map-route` from the live path. Guarantees consistency between visible route cards, map paths, and evidence.

---

## ADR 003: Bookmark Storage and Snapshot Model

- **Status**: Accepted (Phase 5)
- **Date**: 2026-09-23
- **Context**:
  Previously, `BookmarksPage` directly queried the Supabase `route_bookmarks` table and stored routes by display names (e.g. `selected_route: "Route 1"`). Opening a bookmark navigated to `/route-planner?origin=...` and automatically forced a recalculation with current conditions, destroying the historical assessment record.
  Meanwhile, the Go backend already possesses a hardened snapshot API:
  - `POST /api/v1/bookmarks`: captures an immutable snapshot (`ScoredRoute`, `AnalyzeRequest`, `assessment_id`, `scoring_version`).
  - `GET /api/v1/bookmarks`: lists user bookmarks.
  - `GET /api/v1/bookmarks/{id}`: retrieves a saved snapshot.
  - `PATCH /api/v1/bookmarks/{id}`: renames an existing bookmark with user isolation.
  - `POST /api/v1/bookmarks/{id}/recalculate`: explicitly recalculates the saved corridor with current hazard data.
  - `DELETE /api/v1/bookmarks/{id}`: removes a saved bookmark.
- **Decision**:
  Migrate the frontend bookmark UX to use the Go backend snapshot API via the Next.js BFF proxy:
  1. Saving a bookmark creates an immutable assessment snapshot referenced by stable `assessment_id` and `route_id`.
  2. Opening a bookmark defaults to viewing the **Saved Assessment Snapshot** (`SAVED SNAPSHOT` badge with captured and saved timestamps).
  3. A distinct, explicit action allows the operator to **Recalculate With Current Conditions** (`RECALCULATED LIVE` badge) without losing bookmark identity.
  4. State-driven confirmations replace brittle timer-based popup dismissals.
  5. Duplicate save policy creates distinct immutable snapshots (`bm-...`) rather than overwriting historical records.
- **Impact & Trade-offs**:
  Prevents route confusion, eliminates display name fragility, and guarantees historical auditability for disaster response planning.

---

## ADR 004: Lightweight Native Frontend Test Runner (`node:test`)

- **Status**: Accepted (Phase 1 & Fortified in Phase 7)
- **Date**: 2026-09-23
- **Context**:
  The frontend required high-velocity, deterministic testing across contract validation, mock isolation, route comparison, accessibility utilities, and failure matrix scenarios. Adding heavyweight test suites with complex transform pipelines often introduces build fragility with Next.js 16 and React 19.
- **Decision**:
  Adopt Node's native test runner (`node:test` + `node:assert/strict`) with `--experimental-strip-types`:
  - Zero external testing dependencies or runtime overhead.
  - Executes pure TypeScript tests directly in sub-second intervals (~400ms for 76 test cases).
  - Integrates seamlessly with CI (`npm test`).
- **Impact & Trade-offs**:
  Extremely fast local test execution and rock-solid determinism without extra node_modules footprint.

---

## ADR 005: Decoupled Demo Mode & Direct Coordinate Mapping

- **Status**: Accepted (Phase 2)
- **Date**: 2026-09-23
- **Context**:
  In early frontend prototypes, `/api/map-route` was called asynchronously when rendering `LeafletMap.tsx`, creating race conditions and making external Nominatim/OSRM calls independent of Go's authoritative scoring. In addition, when errors occurred or when developing offline, there was a risk of silent fallback to fabricated mock data.
- **Decision**:
  1. `LeafletMap.tsx` and `MapView.tsx` strictly consume candidate coordinates directly from `routes.map(r => r.coordinates)` supplied by the authoritative backend response. The independent `/api/map-route` fetch is permanently removed from the live routing flow.
  2. Demo mode is fully decoupled into `lib/demo/fixtures.ts` featuring verified static geometry for Guwahati → Shillong (matching the Go backend's `DemoProvider`).
  3. Live API failures display an actionable error banner with request ID, error code, and Retry button; they NEVER silently fall back to demo fixtures.
  4. Demo mode displays a persistent `DEMO DATA` badge and operational limitation disclaimer.
- **Impact & Trade-offs**:
  Guarantees zero silent degradation, eliminates secondary network requests, provides immediate map rendering without geocoding latency, and maintains complete operational transparency.

---

## ADR 006: Accessible Navigation, WAI-ARIA 1.2 Combobox & Modal Trapping

- **Status**: Accepted (Phase 6)
- **Date**: 2026-09-23
- **Context**:
  The prototype had accessibility shortcomings: nested `<main>` landmarks caused screen-reader confusion, dropdown pickers lacked keyboard focus management, modal dialogs permitted keyboard focus escape, and Dashboard active links produced false positive highlights on `/route-planner`.
- **Decision**:
  1. Standardize page landmarks: global `layout.tsx` renders a high-priority `"Skip to main content"` skip-link targeting `#main-content`, and exactly one authoritative `<main id="main-content">` is rendered per page.
  2. Upgraded corridor location selectors in `RouteForm.tsx` to full WAI-ARIA 1.2 Combobox specifications with `ArrowDown`/`ArrowUp` keyboard selection, `Enter` commit without form submission, `Escape` dismissal, and recent query caching.
  3. Upgraded modal dialogs (`RoutePlanner.tsx`) with dynamic focus trapping, backdrop click dismissal, `Escape` key listeners, and focus restoration to the trigger element upon modal close.
  4. Added global vestibular motion compliance with `@media (prefers-reduced-motion: reduce)`.
  5. Implemented strict active route logic via `isRouteActive()`, ensuring `/` matches only on exact root pathname.
- **Impact & Trade-offs**:
  WCAG 2.1 AA compliant keyboard navigation and semantic structure throughout all operational interfaces.

---

## ADR 007: Resilient Failure Handling & Zero-Coercion Policy

- **Status**: Accepted (Phase 4 & Phase 7)
- **Date**: 2026-09-23
- **Context**:
  Traditional web applications frequently convert missing, unmodeled, or failed sensor signals into `0`, misleading operators into assuming a corridor is "0% risk" or "Safe" when sensors are merely offline.
- **Decision**:
  1. Enforce strict **Zero-Coercion**: Missing hazard signals remain `null` and are rendered as *"Not evaluated"* or *"Unavailable"*, never 0% or "Safe".
  2. Degraded Python intelligence triggers `go_fallback` mode with an explicit alert banner disclosing that rule heuristics are active instead of ML models.
  3. Open redirect protection: `getSafeRedirectUrl()` strictly enforces relative paths (`/route-planner`), preventing phishing redirects upon login.
  4. Authentication error sanitization: raw database exceptions are intercepted and scrubbed to prevent leaking internal PostgreSQL schemas or connection strings.
- **Impact & Trade-offs**:
  Ensures technical truthfulness and operational safety under disaster conditions where sensor networks may be compromised.

---

## ADR 008: Intelligence Mode Contract Parity & Canonical Union Derivation

- **Status**: Accepted (Final Freeze Pass)
- **Date**: 2026-09-23
- **Context**:
  The frontend previously possessed informal or scattered intelligence-mode strings (such as `hybrid`, `ml_calibrated`, `live_ml`, `heuristic`, `fallback`) without canonical derivations from the authoritative Go backend enum.
- **Decision**:
  1. Derive a strict canonical TypeScript union directly mirroring the Go backend contract (`models.IntelligenceMode`):
     `"live_ml" | "live_heuristic" | "go_fallback" | "partial" | "routing_only" | "demo"`.
  2. Implement `frontend/lib/intelligence-mode.ts` as the single source of truth for display labels, badges, color palettes, degraded warnings, and truthful explanations.
  3. Ensure that when intelligence operates under degraded states (`go_fallback`, `partial`, `routing_only`), the frontend displays prominent fallback indicators and explicitly clarifies which models are active versus unmodeled.
- **Impact & Trade-offs**:
  Completely eliminates invented frontend modes, synchronizes contract tests with backend truth, and guarantees operational transparency during network partitions.

---

## ADR 009: Interactive Map Overlay Controls, Inline Two-Step Deletion, and Password Recovery Hardening

- **Status**: Accepted (Final Freeze Pass)
- **Date**: 2026-09-23
- **Context**:
  Operator feedback and QA audits highlighted gaps in map usability (lack of visible recentering and legend differentiation without color), bookmark deletion safety (reliance on browser `window.confirm`), and authentication recovery flows.
- **Decision**:
  1. Enhance `LeafletMap.tsx` with `MapOverlayControls`:
     - Visible, keyboard-accessible **"Fit Corridors"** recenter control fitting bounds to all candidate routes.
     - Accessible **Corridor Legend** explicitly distinguishing route categories using line patterns (solid double, solid, dashed, dotted) alongside colors.
     - **Hazard Layer Toggles** for landslides and floods matching active backend evidence.
     - **Data Provenance & Freshness** panel surfacing data source origins and timestamps.
  2. Replace browser-native blocking `window.confirm()` with an accessible inline two-step confirmation pattern (`Delete? [Confirm] [Cancel]`) with explicit loading states and error sanitization.
  3. Fortify `LoginForm.tsx` with email password recovery (`supabase.auth.resetPasswordForEmail`) that protects against user enumeration and provides clear return navigation.
- **Impact & Trade-offs**:
  Delivers a complete, resilient, and accessible operator control experience across both desktop and mobile viewports.

