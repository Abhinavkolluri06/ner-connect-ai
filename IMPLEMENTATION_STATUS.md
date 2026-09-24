# Implementation Status — NER-Connect AI Frontend

## Current Phase
Phase 22 — Final Frontend Hardening, Verification & Freeze Pass (Completed — Architecturally Frozen)

## Overall Status
**FROZEN** (Phases 0 through 22 Complete — 95/95 Automated Tests Passing across 9 Suites, 0 Type Errors, 0 Lint Errors, Next.js 16 Production Build & Go Builds Succeeded, Browser E2E Verified)

---

## P0 — Critical Issues
- [x] **Contract Reconciliation**: Aligned route planning requests to authoritative Go endpoint `POST /api/v1/routes/analyze` and frozen canonical types in `lib/types.ts`.
- [x] **Contract Validation & Truthful Semantics**: Built `lib/api/validators.ts` to enforce response structure, validate GeoJSON coordinates, calculate trade-offs (+min, +km), and preserve `null` for uncomputed signals (no zero-coercion).
- [x] **Typed API Client**: Built `lib/api/client.ts` with request ID propagation, timeout control, and normalized error throwing (`ApiError`).
- [x] **Contract Tests**: Created `tests/contract.test.ts` with 8/8 tests passing (valid, malformed, degraded fallback, request ID, null preservation).
- [x] **Single Authoritative Request in RoutePlanner**: Refactored `RoutePlanner.tsx` to call `analyzeRoutes()` from `lib/api/client.ts` and eliminated `mock-routes.ts` from all active live paths.
- [x] **Eliminate Independent Map Fetching**: Removed secondary OSRM/Nominatim calls in `LeafletMap.tsx` and deprecated `/api/map-route`; polylines are mapped directly from backend GeoJSON coordinates.
- [x] **Authoritative Recommendation Ownership**: Removed frontend index-0 fallbacks in `RoutePlanner.tsx` and `LeafletMap.tsx`; adherence strictly enforced to backend `recommended_route_id`.
- [x] **Deterministic Demo / Live Isolation**: Built `lib/demo/fixtures.ts` with verified static geometry (Guwahati → Shillong); live failures display actionable errors with Retry buttons and NEVER silently fall back to demo data; persistent `DEMO DATA` badge rendered when demo scenario is active.
- [x] **Route Comparison & Synchronized Selection**: Synchronized selected route state across RouteCard, Leaflet polyline (weight 6, elevated z-index, interactive click), AI explanation, hazard breakdown, and bookmark snapshot.
- [x] **Explicit Trade-off Annotations**: Displayed `+min` slower and `+km` detour relative to the fastest corridor on all candidate cards and map popups.
- [x] **Eliminate Hardcoded / Fabricated Metrics**: Refactored `AccessibilityPanel.tsx` to render authoritative road accessibility, removed fabricated 75% essential services and fake terrain difficulty, and enforced null semantics with explicit unmodeled disclaimers.
- [x] **Bookmark Architecture Migration**: Migrated bookmarks from fragile display names ("Route 1", "Route A") to Go-backed snapshot architecture (`/api/v1/bookmarks` and `/api/v1/bookmarks/{id}/recalculate`). Integrated frozen assessment snapshots, in-place recalculation, inline rename, and state-driven confirmation dialogs.

---

## P1 — Important Issues
- [x] **Evidence-Based Explanations**: Refactored `AIExplanation.tsx` to render structured backend `recommendation_reasons` (category badges, evidence chips, score impacts), intelligence mode badges, and operational disclaimers.
- [x] **Risk Breakdown Truth & Metadata**: Refactored `RiskBreakdown.tsx` with 4 hazard dimensions, severity tags, method and uncertainty metadata, observation freshness timestamps, and policy alerts with zero null coercion.
- [x] **Spatial Hazard Pins on Map**: Rendered Leaflet hazard markers along candidate corridors displaying severe/high landslide and flood zones with interactive popups.
- [x] **Saved Assessment vs Recalculated Distinction**: Clearly labeled frozen historical assessment snapshots (`SAVED SNAPSHOT` with capture timestamps) vs live recalculated assessments (`RECALCULATED LIVE`).
- [x] **Mobile Drawer Navigation**: Implemented responsive navigation drawer reachable at 360px viewport in `Header.tsx` with keyboard dismiss and focus trapping.
- [x] **Accessible Combobox for Locations**: Upgraded `LocationField` in `RouteForm.tsx` to WAI-ARIA 1.2 compliant combobox with keyboard arrow, Enter, and Escape navigation.
- [x] **Accessible Dialog for Bookmarks**: Implemented focus trap, Escape to dismiss, initial focus, and accessible labelling for bookmark save dialog in `RoutePlanner.tsx`.
- [x] **Map Visual Accessibility**: Used stroke width (6 vs 3.5), line dash patterns (`8 6` for alternatives, `3 6` for higher risk), and distinct map pins in addition to color to distinguish corridors in `LeafletMap.tsx`.
- [x] **Fix Navigation Active State**: Corrected active state in `Header.tsx` via `lib/navigation.ts` (`isRouteActive()`) preventing false matches on subpaths and root routes.
- [x] **Sanitize Authentication & Error UI**: Removed "work email" claim in `LoginForm.tsx`, sanitized raw Supabase error messages via `lib/auth-utils.ts`, and added password visibility toggle.
- [x] **Protect or Remove `/supabase-test`**: Restricted `/supabase-test` using `notFound()` in production environments.

---

## P2 — Polish Issues
- [x] **Remove Hardcoded Service Status**: Connected service indicator in `Dashboard.tsx` to dynamic `/health/ready` probe via `checkServiceHealth()`.
- [x] **Restrain Animations & Reduced Motion**: Enforced `prefers-reduced-motion: reduce` in `globals.css` suppressing transitions and spinning indicators.
- [x] **Streamline Dashboard**: Removed non-operational "Today's Thought" distraction from `Dashboard.tsx` to prioritize Route Planner and Bookmarks.
- [x] **Clean ESLint Baseline Errors in Route & Type Files**: Fixed `any` types in `app/api/v1/routes/analyze/route.ts` and `types.ts`.
- [x] **Shared Formatter Utilities**: Extracted `formatEta`, `formatDistance`, `formatRiskScore`, and `formatDateTime` into `lib/utils/format.ts`.

---

## Completed Phases
- [x] **Phase 0** — Complete repository file tree and dependency audit.
- [x] **Phase 0** — Discrepancy Matrix documented (ADR 001–004).
- [x] **Phase 1** — Authoritative API Contract frozen in `lib/types.ts` based on OpenAPI 3.1.0 & Go models.
- [x] **Phase 1** — Runtime validation and trade-off normalization in `lib/api/validators.ts`.
- [x] **Phase 1** — Typed API client with request ID propagation in `lib/api/client.ts`.
- [x] **Phase 1** — API configuration module in `lib/config/api.ts`.
- [x] **Phase 1** — Contract test suite in `tests/contract.test.ts` (8/8 tests passing).
- [x] **Phase 1** — Package test and type-check scripts configured in `package.json`.
- [x] **Phase 2** — Refactored `RoutePlanner.tsx` to invoke authoritative `analyzeRoutes()`.
- [x] **Phase 2** — Implemented complete lifecycle state machine (`idle`, `validation`, `loading`, `success`, `degraded_fallback`, `error`).
- [x] **Phase 2** — Removed array-0 recommendation fallbacks; strictly enforced `recommended_route_id`.
- [x] **Phase 2** — Refactored `LeafletMap.tsx` and `MapView.tsx` to consume backend coordinates directly with zero secondary network calls.
- [x] **Phase 2** — Created deterministic demo fixtures in `lib/demo/fixtures.ts` (Guwahati → Shillong) with persistent `DEMO DATA` badge.
- [x] **Phase 2** — Decoupled live error states from demo mode: live API errors display actionable retry UI with request ID and NEVER silently load demo fixtures.
- [x] **Phase 2** — Deprecated `/api/map-route` with `X-Deprecated` response headers.
- [x] **Phase 2** — Added `tests/fixtures.test.ts` bringing test suite to 15/15 tests passing.
- [x] **Phase 3** — Upgraded `RouteCard.tsx` with category badges (`recommended`, `fastest`, `higher_risk`, `alternative`), explicit trade-off indicators (+min, +km), truthful risk formatting, and interactive focus states.
- [x] **Phase 3** — Upgraded `LeafletMap.tsx` with interactive polyline click selection, z-index elevation for selected corridor, distinct stroke dashes (`8 6` vs `3 6`), and interactive popups with corridor switching.
- [x] **Phase 3** — Synchronized corridor selection across RouteCard, Leaflet polyline, Active Corridor summary, AI Explanation comparison, and Risk Breakdown.
- [x] **Phase 3** — Added `tests/comparison.test.ts` bringing test suite to 20/20 tests passing.
- [x] **Phase 4** — Elevated `AIExplanation.tsx` with structured recommendation reasons, evidence tags, and intelligence mode badges.
- [x] **Phase 4** — Elevated `RiskBreakdown.tsx` with 4 hazard dimensions, severity tags, method and uncertainty metadata, freshness timestamps, and policy alerts with zero null coercion.
- [x] **Phase 4** — Refactored `AccessibilityPanel.tsx` to remove fabricated metrics and truthfully render road accessibility while explicitly disclosing unmodeled dimensions.
- [x] **Phase 4** — Added spatial hazard markers to `LeafletMap.tsx` with hazard popups for high/severe landslide or flood zones.
- [x] **Phase 4** — Added `tests/evidence.test.ts` bringing test suite to 25/25 tests passing.
- [x] **Phase 5** — Unified bookmarks with authoritative Go backend snapshot API (`/api/v1/bookmarks`, `/api/v1/bookmarks/{id}`, `/api/v1/bookmarks/{id}/recalculate`).
- [x] **Phase 5** — Implemented `transformBookmarkToRouteResponse` to restore exact frozen historical snapshot in `RoutePlanner.tsx`.
- [x] **Phase 5** — Added prominent `SAVED SNAPSHOT` historical banner with one-click live recalculation in `RoutePlanner.tsx`.
- [x] **Phase 5** — Refactored `BookmarksPage.tsx` with snapshot status badges, corridor details, inline rename, in-place recalculation, and graceful guest/signed-out handling.
- [x] **Phase 5** — Extended Go backend handler with `PATCH /api/v1/bookmarks/{id}` for bookmark renaming with user isolation.
- [x] **Phase 5** — Replaced brittle `setTimeout(..., 900)` save confirmation with state-driven confirmation and direct navigation links.
- [x] **Phase 5** — Added `tests/bookmarks.test.ts` bringing test suite to 34/34 tests passing across 5 test suites.
- [x] **Phase 5** — TypeScript check (`tsc --noEmit`) and Turbopack Next.js production build (`next build`) passing with 0 errors.
- [x] **Phase 6** — Eliminated nested `<main>` landmarks and added "Skip to main content" link to `layout.tsx`; set singular `<main id="main-content">` across all pages.
- [x] **Phase 6** — Added `prefers-reduced-motion` compliance to `globals.css` with animation suppression for vestibular accessibility.
- [x] **Phase 6** — Refactored `Header.tsx` with mobile drawer navigation (`id="mobile-nav-drawer"`, Escape key, backdrop click, focus management) and strict active-route matching.
- [x] **Phase 6** — Upgraded `RouteForm.tsx` location pickers to WAI-ARIA 1.2 Combobox with keyboard navigation (Arrow keys, Enter, Escape), recent search caching, and ARIA roles.
- [x] **Phase 6** — Upgraded Bookmark modal dialog in `RoutePlanner.tsx` with focus trapping, Escape key dismissal, backdrop dismissal, and trigger focus restoration.
- [x] **Phase 6** — Enhanced `LoginForm.tsx` with password visibility toggle, safe `returnUrl` / `redirect` query handling, generic email phrasing, and sanitized auth errors.
- [x] **Phase 6** — Protected `/supabase-test` with `notFound()` in production and sanitized error display in development.
- [x] **Phase 6** — Upgraded placeholder pages (`/emergency`, `/hospitals-relief`, `/live-map`, `/logistics-hub`, `/reports`, `/risk-analytics`) with clear roadmap badges and route planner links.
- [x] **Phase 6** — Added `tests/navigation.test.ts` bringing test suite to 58/58 tests passing across 6 test suites; `tsc --noEmit` and `next build` pass with 0 errors.
- [x] **Phase 7** — Created `tests/failure-matrix.test.ts` verifying Go offline (503), timeouts (504), non-2xx errors with `X-Request-ID` propagation, malformed proxy gateway responses, Python degraded fallback, and non-fabrication of missing signals.
- [x] **Phase 7** — Created `tests/e2e-journey.test.ts` verifying the full 9-step critical operator workflow (Sign-in → Safe redirect → Request validation → Go comparison → Trade-off ranking → Selection & Leaflet geometry → Evidence inspection → Bookmark snapshot save → Historical restoration → In-place live recalculation).
- [x] **Phase 7** — Completed security and secret audit: verified zero service-role keys in frontend, verified strict `.gitignore` ignoring all `.env*` files, validated zero committed secrets, verified only public Supabase keys client-side.
- [x] **Phase 7** — Automated test suite expanded to 76/76 tests passing across 8 test suites; Go backend test suite 100% passing (`go test ./...`); Turbopack `next build` and `tsc --noEmit` 100% passing with 0 errors.
- [x] **Phase 8** — Upgraded `Dashboard.tsx` with dynamic backend health telemetry check via `checkServiceHealth()`, eliminating false static "online" claims.
- [x] **Phase 8** — Removed non-operational "Today's Thought" clutter from `Dashboard.tsx` to strictly prioritize Route Planner, Saved Bookmarks, and core dispatch actions.
- [x] **Phase 8** — Refactored `AboutPage.tsx` with explicit Current (Active Core), Experimental (ML Calibration & Fallback), and Planned (Milestone 2) status matrix.
- [x] **Phase 8** — Documented regional geographic coverage across all eight North Eastern states and truthful operational/data limitations (OSRM highway graph, sparse mountainous sensor telemetry, non-zero-coercion rule).
- [x] **Phase 8** — Verified Leaflet canvas performance: dynamic client-side loading (`ssr: false`), memoized coordinate transformations via `useMemo`, and layout-shift prevention with fixed aspect skeletons.
- [x] **Phase 9** — Complete architectural review: `README.md` updated with comprehensive Mermaid architecture diagrams (System Architecture, Route Comparison Lifecycle, Bookmark Lifecycle), runbooks, and capability matrix.
- [x] **Phase 9** — Documented Architecture Decision Records (ADR 001–007) in `ARCHITECTURE_DECISIONS.md`.
- [x] **Phase 9** — Zero-fabrication demo mode documented with strict boundary rules and fallback disclosures.
- [x] **Phase 9** — Full automated verification: 76/76 unit, contract, fixture, comparison, evidence, bookmark, navigation, failure-matrix, and e2e-journey tests passing.
- [x] **Phase 9** — TypeScript compilation (`tsc --noEmit`) and Turbopack production build (`next build`) validated with 0 errors across all 21 pages.
- [x] **Phase 9** — Backend test suite validated with 100% passing rate (`go test ./...`).

---

## Automated Test Matrix (95 Tests across 9 Suites)

| Suite | Test Case | Description | Result |
| :--- | :--- | :--- | :--- |
| Contract | `normalizes UI route request` | Maps UI labels (e.g. "Truck", "Medical Supplies") to backend enums | **PASS** |
| Contract | `throws on missing origin/destination` | Rejects empty or whitespace-only location inputs | **PASS** |
| Contract | `validates conforming backend response` | Validates complete Go response schema and candidate IDs | **PASS** |
| Contract | `rejects malformed response` | Fails on missing `request_id`, empty `routes`, or invalid types | **PASS** |
| Contract | `rejects mismatched recommendation` | Fails if `recommended_route_id` does not match any candidate route | **PASS** |
| Contract | `transforms to rich RouteResponse` | Accurately computes fastest route, trade-offs (+min, +km), and coordinates | **PASS** |
| Contract | `handles degraded go_fallback mode` | Emits `isFallback: true` and truthful fallback warning banner | **PASS** |
| Contract | `preserves null on uncomputed signals` | Ensures missing hazard signals are never coerced to zero | **PASS** |
| Fixtures | `DEMO_BACKEND_ANALYZE_RESPONSE conforms` | Confirms static fixture satisfies OpenAPI schema without degradation | **PASS** |
| Fixtures | `getDemoRouteResponse without array-0` | Validates demo transformer identifies fastest vs recommended route | **PASS** |
| Fixtures | `isDemoCorridor matches correctly` | Accurately checks Guwahati-Shillong corridor queries | **PASS** |
| Fixtures | `formatEta formats hours/minutes` | Accurately formats ETA strings and handles invalid numbers | **PASS** |
| Fixtures | `formatDistance formats km` | Formats distance with single decimal place | **PASS** |
| Fixtures | `formatRiskScore preserves null` | Ensures null risks return "Not evaluated" instead of 0% | **PASS** |
| Comparison | `calculates fastest corridor & trade-offs` | Validates +min slower and +km detour calculations relative to fastest | **PASS** |
| Comparison | `assigns category badges without array-0 bias` | Checks recommended, fastest, higher_risk, alternative badges | **PASS** |
| Comparison | `synchronizes active selection` | Verifies corridor switching updates risk and metrics while preserving recommendation | **PASS** |
| Comparison | `converts GeoJSON coordinates to Leaflet format` | Tests longitude/latitude swap for Leaflet polylines | **PASS** |
| Evidence | `preserves null on unmodeled accessibility` | Verifies unmodeled metrics remain null without zero-coercion | **PASS** |
| Evidence | `truthfully marks accessibility Unavailable` | Validates truthful "Unavailable" status when score omitted | **PASS** |
| Evidence | `generates spatial hazard markers` | Confirms hazard pins created for high/severe landslide or flood zones | **PASS** |
| Evidence | `preserves detailed hazard metadata` | Validates method, uncertainty, source quality, and completeness propagation | **PASS** |
| Bookmarks | `transformBookmarkToRouteResponse creates valid RouteResponse` | Reconstructs exact RouteResponse from historical snapshot | **PASS** |
| Bookmarks | `preserves frozen historical timestamps & versions` | Ensures snapshot generatedAt, scoringVersion, and requestId are preserved | **PASS** |
| Bookmarks | `throws ContractValidationError when snapshot missing` | Guarantees snapshot integrity validation | **PASS** |
| Bookmarks | `explicitly distinguishes snapshot_saved from recalculated_live` | Validates status transitions and preservation of bookmark identity | **PASS** |
| Bookmarks | `avoids fragile display names and binds to backend route ID` | Ensures stable route IDs (e.g. corridor-nh6-alpha) instead of "Route 1" | **PASS** |
| Bookmarks | `supports custom name with summary fallback` | Validates custom bookmark naming and automatic fallback formatting | **PASS** |
| Bookmarks | `duplicate save policy produces distinct snapshots` | Enforces immutable snapshot creation on repeated saves | **PASS** |
| Bookmarks | `preserves truthful null values for unmodeled signals` | Ensures snapshots never fabricate unmodeled sensor scores | **PASS** |
| Bookmarks | `recalculated response retains recommendation reasons` | Confirms evidence and reasoning are maintained across recalculations | **PASS** |
| Navigation | `matches root route '/' strictly` | Root route matches only on exact '/' pathname | **PASS** |
| Navigation | `does NOT match root route '/' when on another page` | Prevents false-positive dashboard highlights | **PASS** |
| Navigation | `matches '/route-planner' exactly and on subpaths` | Supports active tab on base and nested routes | **PASS** |
| Navigation | `does NOT match partial route prefixes without slash` | Guards against '/route-plannerv2' false matches | **PASS** |
| Navigation | `correctly identifies other primary routes` | Verifies active state for bookmarks, accessibility, and about | **PASS** |
| Navigation | `permits standard internal relative paths` | Allows clean routing to internal relative destinations | **PASS** |
| Navigation | `permits internal query parameters` | Preserves bookmarkId and filter queries in redirect target | **PASS** |
| Navigation | `safely falls back to '/route-planner'` | Protects against null, undefined, or empty redirect params | **PASS** |
| Navigation | `blocks open redirect attempts to external protocols` | Prevents redirection to external http/https phishing targets | **PASS** |
| Navigation | `blocks protocol-relative URLs (//malicious.com)` | Prevents protocol-relative scheme hijacking | **PASS** |
| Navigation | `blocks backslash open redirect variations (/\evil.com)` | Blocks backslash evasion vectors | **PASS** |
| Navigation | `blocks non-HTTP URI schemes` | Rejects javascript: and data: URI injection attempts | **PASS** |
| Navigation | `sanitizes invalid login credential messages` | Emits helpful guidance without technical jargon | **PASS** |
| Navigation | `sanitizes invalid_grant token errors` | Standardizes authentication grant failure messages | **PASS** |
| Navigation | `sanitizes unconfirmed email errors` | Prompts user to check inbox for verification link | **PASS** |
| Navigation | `sanitizes already registered user errors` | Guides user to sign in when account already exists | **PASS** |
| Navigation | `sanitizes rate limiting errors` | Informs user to pause before repeated sign-in attempts | **PASS** |
| Navigation | `sanitizes raw database internal errors` | Conceals internal Postgres schemas, connection URIs, and credentials | **PASS** |
| Navigation | `accepts valid email addresses` | Verifies standard operator and government email patterns | **PASS** |
| Navigation | `rejects malformed email strings` | Rejects empty strings, missing domain, and spaces | **PASS** |
| Navigation | `returns all standard locations on empty query` | Lists complete North East regional hub inventory | **PASS** |
| Navigation | `prioritizes recent locations at top` | Deduplicates and ranks operator search history first | **PASS** |
| Navigation | `filters options case-insensitively by query` | Matches corridor names regardless of input casing | **PASS** |
| Navigation | `returns empty on non-matching query` | Handles queries with zero matching locations gracefully | **PASS** |
| Failure Matrix | `handles Go backend offline (503)` | Converts connection refusal into clean retry alert | **PASS** |
| Failure Matrix | `handles request timeout (504)` | Catches AbortError and produces actionable timeout notification | **PASS** |
| Failure Matrix | `handles non-2xx HTTP errors with X-Request-ID` | Propagates error payload and correlation request ID | **PASS** |
| Failure Matrix | `handles malformed non-JSON gateway responses` | Gracefully extracts status code and message without crashing | **PASS** |
| Failure Matrix | `truthfully marks intelligence mode as fallback` | Sets isFallback: true and renders fallbackNotice on degraded ML | **PASS** |
| Failure Matrix | `does not fabricate 0% or 'Safe' for missing hazards` | Preserves null overallRiskScore and individual hazard values | **PASS** |
| Failure Matrix | `rejects backend response missing routes array` | Throws ContractValidationError on empty routes | **PASS** |
| Failure Matrix | `rejects whitespace-only origin or destination` | Halts pre-flight execution before issuing network request | **PASS** |
| Failure Matrix | `preserves vehicle dimension constraints` | Maps height, weight, and axle limits to backend request payload | **PASS** |
| E2E Journey | `Step 1: Authenticates operator & safe redirect` | Validates email format and blocks open redirect attack vectors | **PASS** |
| E2E Journey | `Step 2: Validates & normalizes inputs` | Normalizes request parameters to canonical backend enums | **PASS** |
| E2E Journey | `Step 3: Fetches authoritative Go comparison` | Deserializes multi-corridor response and preserves recommendation | **PASS** |
| E2E Journey | `Step 4: Computes trade-offs & categories` | Verifies +min slower and +km detour relative to fastest corridor | **PASS** |
| E2E Journey | `Step 5: Synchronizes selection & Leaflet geometry` | Converts GeoJSON coordinates to Leaflet lat/lon pairs | **PASS** |
| E2E Journey | `Step 6: Inspects evidence reasons & freshness` | Validates structured reasoning factors and observation timestamps | **PASS** |
| E2E Journey | `Step 7: Saves assessment snapshot into bookmark` | Archives immutable assessment state with selected route ID | **PASS** |
| E2E Journey | `Step 8: Restores historical snapshot identically` | Reconstructs RouteResponse preserving frozen historical timestamp | **PASS** |
| E2E Journey | `Step 9: Recalculates bookmark with live conditions` | Updates live hazard risks and transitions status to recalculated_live | **PASS** |
| Failure Matrix | `truthfully captures and normalizes HTTP 401` | Captures 401 Unauthorized status with actionable authentication message | **PASS** |
| Failure Matrix | `truthfully captures and normalizes HTTP 403` | Captures 403 Forbidden status with authorization access message | **PASS** |
| Failure Matrix | `truthfully captures and normalizes HTTP 404` | Captures 404 Not Found status with corridor availability message | **PASS** |
| Failure Matrix | `truthfully captures and normalizes HTTP 429` | Captures 429 Rate Limited status with throttling backoff advice | **PASS** |
| Failure Matrix | `truthfully captures and normalizes HTTP 500` | Captures 500 Internal Error status with retry suggestion | **PASS** |
| Failure Matrix | `truthfully captures and normalizes HTTP 502` | Captures 502 Bad Gateway status with gateway retry alert | **PASS** |
| Failure Matrix | `truthfully captures and normalizes HTTP 503` | Captures 503 Service Unavailable status with maintenance advisory | **PASS** |
| Failure Matrix | `truthfully captures and normalizes HTTP 504` | Captures 504 Gateway Timeout status with upstream timeout advice | **PASS** |
| Failure Matrix | `handles partial intelligence mode` | Truthfully renders partial mode when weather telemetry fails without zero-coercion | **PASS** |
| Accessibility | `single main landmark and skip-to-content` | Verifies singular `<main id="main-content">` and skip link targeting `#main-content` | **PASS** |
| Accessibility | `combobox accessibility attributes` | Verifies WAI-ARIA 1.2 combobox attributes, roles, and aria-expanded state | **PASS** |
| Accessibility | `bookmark modal focus trapping` | Enforces focus trap, initial focus, Escape listener, and focus restoration | **PASS** |
| Accessibility | `reduced motion media queries` | Validates `@media (prefers-reduced-motion: reduce)` in styling tokens | **PASS** |
| Accessibility | `non-color route differentiation` | Confirms stroke dash patterns and distinct badges convey route status beyond color | **PASS** |
| Accessibility | `interactive map recenter control` | Verifies visible keyboard-accessible 'Fit Corridors' recenter control | **PASS** |
| Accessibility | `accessible inline bookmark deletion` | Verifies accessible two-step confirmation pattern without blocking dialogs | **PASS** |
| Accessibility | `login form accessibility & forgot password` | Validates aria-label, aria-invalid, descriptive error text, and toggle semantics | **PASS** |
| Accessibility | `responsive mobile drawer navigation` | Confirms mobile drawer accessibility, focus lock, and backdrop dismissal | **PASS** |
| Accessibility | `truthful zero-coercion disclaimers` | Ensures screen readers receive 'Not evaluated' instead of misleading '0%' | **PASS** |



