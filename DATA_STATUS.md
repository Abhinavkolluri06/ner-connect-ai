# Data Status & Provenance Registry

This document records the geographic scope, temporal refresh, license, missingness policy, and production/demo status for all data sources used across NER-Connect AI.

---

## 1. Live Operational Providers

| Source | License | Geographic Coverage | Temporal Refresh | Feature Produced | Missingness Policy | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Open-Meteo Weather API** | CC BY 4.0 | Global (0.1° grid, ~11 km) | Hourly updates | Precipitation (mm), wind speed, temperature | Explicit `degraded` state if timeout; never assumed 0 mm. | `production` |
| **Open-Meteo Elevation / SRTM** | Public Domain / NASA | Global 90m SRTM | Static topography | Elevation (m), central-difference slope (degrees) | Cached; fallback to regional mean with explicit warning. | `production` |
| **OpenStreetMap / OSRM** | ODbL 1.0 | Global / Northeast India | Weekly extract / live routing | Road geometry, distance (km), baseline duration (min) | Service unavailable (503) if routing fails; no imaginary corridors. | `production` |
| **OpenRouteService (ORS)** | Apache 2.0 / ODbL | Global / India | Dynamic | Dimension-aware truck routing (weight, height, width, axle) | Fallback to standard car routing with vehicle restriction warnings. | `production` |
| **Advisory & Closure Feed** | User / Agency supplied | Northeast India highway network | Event-driven (poll / push) | Blocked corridors, vehicle load restrictions | Expired feed blocks route planning if strict mode is enabled. | `production_optional` |

---

## 2. Research & Scaffolding Data

| Source | License | Geographic Coverage | Temporal Scope | Features | Limitations | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Geological Survey of India (GSI) Landslide Inventory Scaffold** | Open Government Data (OGD) India | Northeast India (Assam, Meghalaya, Sikkim, Manipur) | Historical catalog | Historical event points, coordinates, trigger date | Scaffolded schema; ground truth requires field verification. | `research_scaffold` |
| **Eastern Kentucky Landslide Study** | US Geological Survey (Public Domain) | Appalachian Basin, KY, USA | 2020–2022 | Topographic wetness, soil moisture, lithology | Out-of-domain for Himalayas. Quarantined to research scripts. | `research_only` |
| **NASA FIRMS / MODIS Thermal Anomalies** | Public Domain | South Asia | Daily satellite pass | Wildfire / burning proxy | Spatial resolution 375m; cloud cover obscuration in monsoon. | `research_scaffold` |

---

## 3. Synthetic & Demonstration Data

| Dataset | Origin | Features Generated | Strict Prohibition | Production Status |
| :--- | :--- | :--- | :--- | :--- |
| **Guwahati–Shillong Demo Corridor** | OSRM baseline geometry + static weather values | Route A (92 km, 150 min), Route B (103 km, 188 min), Route C (118 km, 222 min) | Must carry explicit `demo` mode badge. Must NEVER be disguised as live real-time observations. | `demo_only` |
| **Legacy Synthetic Road Condition (`backend/models`)** | Random generation script | `road_condition_score` (0..100) | **QUARANTINED**. Prohibited from shipping in production containers or public browser bundle. | `quarantined_legacy` |

---

## 4. Missing Data & Honesty Invariants

1. **No Magic Numbers**: Missing rainfall is never recorded as 0.0 mm without provider confirmation. Unknown road quality is never represented as 50/100.
2. **Explicit Per-Signal Availability**:
   - `available`: Data retrieved successfully from live provider within valid freshness window.
   - `unavailable`: Data source could not be contacted or does not cover coordinate.
   - `degraded`: Backup heuristic or stale cache utilized; warnings attached.
   - `stale`: Last known valid reading older than freshness threshold.
3. **Hard Exclusions Precede Scoring**: Known bridge collapses, flood inundation closures, or vehicle weight limit violations eliminate a candidate route from eligible ranking regardless of its speed or composite score.
