# NER-Connect AI — Map V2 Architecture Specification

## 1. Overview & Architectural Principles

NER-Connect AI Map V2 provides a production-grade geospatial and route-analysis user interface specifically designed for complex logistics corridors across Northeast India (NER). The design aligns with the approved light/white NER-Connect design system while integrating high-fidelity interaction behaviors inspired by the RouteGuard reference (`Vivekgamedevv/NER/routeguard-ml`).

### Core Design Invariants:
1. **Strict Backend Authority**: All route geometries, alternative corridor proposals, candidate rankings, and physical road exclusions are owned 100% by the Go public API and routing orchestrator.
2. **Zero Browser-Side Routing**: The browser never queries public OSRM, never creates artificial via-points or midpoints, and never invents hypothetical route polylines.
3. **Truthful Hazard & Telemetry Modeling**: Missing risk signals (e.g. during sensor or Python ML service degradation) are surfaced truthfully as "Unavailable" or "Not Evaluated", never defaulted to "Safe" or 0%.
4. **Decoupled Geospatial Presentation**: Leaflet / React-Leaflet is strictly a presentation and interaction layer. State synchronization between route cards, map polylines, and inspection panels is unidirectional and reactive.

---

## 2. Data & Geometry Ownership

```
User Action (Origin/Dest, Preferences, Constraints)
  │
  ▼
Frontend (`RoutePlanner` & `RouteForm`)
  │
  ▼
Next.js BFF (`/api/v1/routes/analyze`)
  │ (Request ID, Supabase Auth Bearer, Timeout Propagation)
  ▼
Go Backend Service (`/api/v1/routes/analyze`)
  ├─ Provider / OSRM Orchestration (Candidate generation)
  ├─ Python ML Intelligence (Landslide / Flood / Weather inference)
  ├─ Exclusion Engine (Bridge limits, road classifications)
  └─ Scoring & Ranking Engine (Reliability & Risk Index)
  │
  ▼
JSON RouteResponse payload (authoritative `coordinates`, `segments`, `evidence`)
  │
  ▼
Frontend Map V2 (`RouteMap`, `RoutePolylines`, `EndpointMarkers`, `RouteInspector`)
```

- **Candidate Geometries**: Every polyline rendered on Map V2 is parsed directly from `route.geometry.coordinates` or `route.coordinates` returned by Go.
- **Absence of Geometry**: If a route candidate is returned without valid coordinates, Map V2 displays a prominent banner: *"Route geometry is currently unavailable for this candidate"*. No fallback route calculation (`/api/map-route` or browser OSRM) is attempted.
- **Snapshot Immutability**: When rendering saved assessments or bookmarks, Map V2 displays frozen historical geometry without re-executing route queries until the operator explicitly clicks "Recalculate".

---

## 3. Component Hierarchy

The Map V2 subsystem is modularized inside `frontend/components/map/` to prevent monolithic component degradation:

```
frontend/components/
├── MapView.tsx                     # Top-level container, card styling, full-screen frame
└── map/
    ├── RouteMap.tsx                # Dynamic Leaflet orchestrator, tile layers, state wiring
    ├── RoutePolylines.tsx          # Multi-corridor layered polylines & hit targets
    ├── EndpointMarkers.tsx         # Custom L.divIcon origin & destination pins with badges
    ├── HazardMarkers.tsx           # Spatial incident markers (landslide, flood, weather)
    ├── SegmentMarkers.tsx          # Micro-segment markers for evaluated corridors
    ├── MapControls.tsx             # Floating white action pill (Zoom, Layers, Fit, Locate, Fullscreen)
    ├── LayerControl.tsx            # Truthful layer drawer with capability states
    ├── RecenterControl.tsx         # Corridor bounding box and camera fit
    ├── LocateMeControl.tsx         # Browser Geolocation API integration
    ├── MapLocationPicker.tsx       # Floating pin prompt banner & click-anywhere context menu
    ├── MapLegend.tsx               # Accessible non-color differentiated corridor legend
    ├── MapStatusBadge.tsx          # Header badge indicating engine mode & freshness
    ├── RouteInspector.tsx          # Collapsible corridor intelligence panel
    ├── SegmentInspector.tsx        # Deep-dive segment telemetry inspector
    └── hooks/
        ├── useMapBounds.ts         # Viewport fitting, padding calculations, coordinate bounds
        ├── useLocationPicker.ts    # Pick-on-map state, coordinate extraction, reverse geocode
        ├── useRouteSelection.ts    # Semantic color mapping & active corridor promotion
        └── useGeolocation.ts       # HTML5 Geolocation permission & error lifecycle
```

---

## 4. Route Rendering & Casing System

To ensure optimal contrast over standard OpenStreetMap raster tiles, Map V2 implements a 3-tier casing system:

### Selected Route (Triple Casing)
1. **Outer Casing (Depth Layer)**: Solid dark navy (`#081F31`), weight `10px`, opacity `0.95`. Creates clean contrast against terrain and road networks.
2. **Separation Casing (Halo)**: Pure white (`#FFFFFF`), weight `7px`, opacity `0.90`. Visually isolates the route line from the dark outline.
3. **Core Accent Line**: Semantic corridor color (emerald `#059669` for recommended, blue `#2563EB` for fastest alternative, amber `#D97706` for secondary), weight `5px`, opacity `1.0`.
4. **Invisible Interaction Hit Zone**: Transparent polyline (`#000000`, opacity `0.001`), weight `22px`, pointer-events enabled. Guarantees effortless clicking on high-DPI screens and mobile touch targets.

### Alternative Corridors
1. **Outer Halo**: Pure white (`#FFFFFF`), weight `6px`, opacity `0.85`.
2. **Dashed Core**: Semantic corridor color, weight `4px`, dash array `"6, 8"`, opacity `0.80`.
3. **Hit Target**: Transparent polyline, weight `18px`. Clicking promotes the alternative to selected state.

### Semantic Color Resolution
Color assignment is strictly decoupled from array indexing:
- **Recommended Corridor**: Emerald (`#059669`), marked by backend `route.id === recommendedRouteId` or `route.is_recommended`.
- **Fastest Non-Recommended Corridor**: Cobalt Blue (`#2563EB`).
- **High Disruption / Risk Corridor**: Amber / Coral Red (`#DC2626` / `#D97706`) only when backend telemetry explicitly scores risk > 65%.
- **Secondary Alternatives**: Violet (`#7C3AED`) or Slate (`#64748B`).

---

## 5. Location Picking & Geocoding Flow

### Pick-on-Map Mode
1. Operator clicks **"Pick on map"** for either Origin or Destination in `RouteForm`.
2. Map enters `activePickMode` (`'origin'` | `'destination'`).
3. Cursor switches to `crosshair` across the Leaflet canvas.
4. Persistent floating banner displays: *"Pick on Map: Click any road or hub to set [Origin/Destination]"* with a cancel button.
5. On map click:
   - Latitude and longitude are captured at full decimal precision.
   - Request is dispatched to Next.js BFF: `GET /api/v1/reverse-geocode?lat=...&lon=...`.
   - Reverse geocoder checks regional cache of 19 Northeast India transit hubs (< 8 km match).
   - If outside hub radii, reverse geocodes via bounded Nominatim geocoding server-side (no client keys leaked).
   - Form field updates with resolved location name or formatted coordinate fallback (`26.1445°N, 91.7362°E`).
   - Pick mode terminates automatically. Route analysis is NOT auto-triggered until the user reviews and clicks "Analyze Routes".

### Click-Anywhere Context Menu
When not in explicit pick mode, clicking an arbitrary point on the map displays a lightweight context popup:
- Shows geographical coordinates.
- Provides two immediate actions: **"Set as Origin"** and **"Set as Destination"**.
- Does not clutter the map or interfere with polyline hit detection.

### Endpoint Swapping
- The dedicated **Swap** control in `RouteForm` swaps `origin` and `destination` coordinates and names simultaneously without triggering premature network queries.

---

## 6. Route & Segment Intelligence Inspection

### Route Inspector (Collapsible)
Positioned in the lower-left corner of the map view (or bottom sheet on mobile):
- Displays active corridor name, ETA, distance, and delta versus the fastest corridor (+18 min, +12 km).
- Displays reliability index and hazard exposure breakdown (landslide, flood, weather).
- Displays backend intelligence engine mode:
  - `full`: Complete Python ML & sensor data active.
  - `go_fallback`: Limited intelligence mode (Go routing active, Python ML degraded).
  - `demo`: Explicit demo fixtures active.
- Displays data freshness and timestamp of observation.

### Segment Explorer
When backend provides corridor segment data:
- Corridors are split into discrete evaluated segments with color-coded status points.
- Clicking a segment opens the **Segment Inspector** displaying segment ID, road classification (e.g. NH-06, GS Road), elevation, slope, 24-hour rainfall, and hazard confidence level.

---

## 7. Layer Control & Truthful Availability

The custom white layer control drawer allows operators to toggle visual layers. Unlike generic map interfaces, Map V2 strictly conveys backend availability:

| Layer | Status Badge | Condition |
| :--- | :--- | :--- |
| **Active Routes** | `Active` | Candidate geometries present. |
| **Landslide Evidence** | `Active` / `Unavailable` | Only active if backend ML model returned landslide inference points. |
| **Flood Inundation** | `Active` / `Unavailable` | Active only when flood telemetry points are present. |
| **Weather Telemetry** | `Active` / `Not Evaluated` | Reflects IMD / Open-Meteo observation coverage. |
| **Segment Pins** | `Active` / `Unavailable` | Enabled when corridor micro-segments exist in response. |

---

## 8. Mobile & Fullscreen UX

- **Responsive Viewport**: On screens < 768px, map controls adapt with enlarged 44px touch targets.
- **Expanded Geospatial Mode**: Clicking the **Expand** control expands the map to fill the entire application viewport, giving operators an unobstructed command-center view while retaining floating controls, legend, and route inspector.
- **Card-to-Map Synchronization**: Tapping a route card on mobile smoothly scrolls the map into view and centers the camera on the newly selected route bounds.

---

## 9. Performance & Security Considerations

- **Memoization**: All polyline coordinates, endpoint positions, and bounding boxes are memoized via `useMemo` to prevent React re-renders during panning or hovering.
- **DOM Leaks**: Leaflet DIV icons use lightweight CSS HTML without heavy inline SVG strings. Popups clean up event handlers on unmount.
- **Zero API Key Leakage**: Nominatim and external geocoding requests are proxied via `/api/v1/reverse-geocode`. No external provider secrets exist in client bundles.
- **OpenStreetMap Attribution**: The legal attribution `© OpenStreetMap contributors` remains permanently anchored and visible in the bottom-right corner of the map canvas across all zoom levels and viewports.
