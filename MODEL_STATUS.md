# Model Status & Scientific Registry

This document records the serving status, scientific validity, training datasets, artifact verification, and known limitations for every intelligence and hazard model in NER-Connect AI.

## Architectural Ownership & Verification Rules

1. **Go Owner Rule**: Go is the sole orchestrator, validator, scorer, and final ranking authority. Python provides intelligence signals only and does NOT make route ranking decisions.
2. **Truthful Labeling**: Deterministic heuristics must **never** be presented as trained machine learning predictions.
3. **No False Safety**: Missing data must **never** be interpreted as zero risk. Synthetic training outputs must never be presented as real-world safety probabilities.
4. **Geographic Quarantine**: Models trained on non-Northeast-India geographies (e.g. Kentucky) are classified strictly as **research** and cannot claim regional validation in Northeast India.

---

## Status Classification Taxonomy

| Status | Definition | Serving Policy |
| :--- | :--- | :--- |
| `approved_ml` | Validated on regional Northeast India holdouts with calibration & uncertainty bounds. | Allowed for live inference when input features pass validation. |
| `heuristic` | Deterministic mathematical domain heuristics based on physical proxies. | Active default in production when ML is unapproved or inputs are out-of-domain. |
| `research` | Experimental research models (e.g. Kentucky landslide study) under active investigation. | Quarantined to research workflows; never used for live user-facing routing. |
| `unavailable` | Data or models that do not meet scientific standards for inference. | Explicitly declared as `unavailable` with reason. |

---

## Component Registry

### 1. Landslide Susceptibility (Live Serving)
- **Serving Status**: `heuristic`
- **Method**: Deterministic multi-factor terrain susceptibility rule based on slope gradient, cumulative precipitation, and historical occurrence proxies.
- **Feature Contract**: `rainfall_mm` (float >= 0), `slope_deg` (0..90), `elevation_m` (-500..9000), `historical_landslides` (integer >= 0).
- **Dataset**: USGS SRTM DEM elevation derivatives + Open-Meteo precipitation aggregates.
- **Model Version**: `heuristic-v2.0`
- **Artifact Status**: Code-based deterministic pipeline; no binary weights required.
- **Validation Region**: `not_regionally_validated` (Northeast India regional calibration pending ground truth event inventory).
- **Approval Status**: Approved for live decision-support heuristics.
- **Known Limitations**: Does not account for real-time geotechnical pore-water pressure, bedrock geology, or sudden seismicity. Evaluated per-segment; provides relative susceptibility rather than an absolute event probability.

### 2. Kentucky Landslide Model (Experimental Research)
- **Serving Status**: `research`
- **Method**: Supervised classification (RandomForest / GradientBoosting) trained on US geological survey inventories.
- **Feature Contract**: Soil moisture, topographic wetness index, geological stratum, slope, aspect.
- **Dataset**: Eastern Kentucky Landslide Inventory (2020–2022).
- **Model Version**: `research-ky-landslide-v1.2`
- **Artifact Status**: Verified SHA-256 artifacts stored in `research/experiments/kentucky_landslide/`.
- **Validation Region**: `kentucky_research_only`
- **Approval Status**: **Not approved** for live Northeast India routing. Strictly quarantined to research evaluation scripts.
- **Known Limitations**: Extreme geographic shift. Geological formations, monsoonal rainfall intensity, and Himalayan tectonics differ radically from Appalachian topography.

### 3. Flash Flood Susceptibility
- **Serving Status**: `heuristic`
- **Method**: Precipitation accumulation, elevation depression, and river drainage proximity heuristic.
- **Feature Contract**: `rainfall_mm`, `elevation_m`, `drainage_proximity_m`.
- **Dataset**: Open-Meteo live weather + DEM valley bottom indices.
- **Model Version**: `heuristic-flood-v1.0`
- **Artifact Status**: Deterministic code heuristic.
- **Validation Region**: `not_regionally_validated`
- **Approval Status**: Approved as decision-support proxy only.
- **Known Limitations**: No real-time river gauge telemetry or hydro-dynamic dam release data.

### 4. Weather Risk Assessment
- **Serving Status**: `live_provider`
- **Method**: Real-time precipitation rate and wind gust thresholds mapped via sigmoidal severity curves.
- **Feature Contract**: Hourly precipitation rate (mm/h), wind speed (km/h), visibility (m).
- **Dataset**: Open-Meteo Weather API (ECMWF & GFS ensemble models).
- **Model Version**: `weather-eval-v2.0`
- **Artifact Status**: Live provider ingestion.
- **Validation Region**: Global / Northeast India coverage via satellite assimilation.
- **Approval Status**: Approved.
- **Known Limitations**: Mountainous valleys in Northeast India (e.g. Sohra, Meghalaya plateau) experience microclimates that global grid models (11 km) can smooth out. Degraded operation supported if provider times out.

### 5. Settlement Accessibility Intelligence
- **Serving Status**: `heuristic`
- **Method**: Travel-time penalty accumulation, single-access corridor vulnerability index, and vehicle clearance compatibility.
- **Feature Contract**: Route alternative count, bridge load limits, vehicle axle weight, terrain slope.
- **Dataset**: OpenStreetMap highway tags + OpenRouteService dimension constraints.
- **Model Version**: `access-v2.0`
- **Artifact Status**: Deterministic graph evaluation.
- **Validation Region**: Northeast India 20 catalog locations.
- **Approval Status**: Approved.
- **Known Limitations**: Static road classification; unpaved rural road conditions during peak monsoon require field surveyor verification.

### 6. Legacy Synthetic Road Model (Quarantined)
- **Serving Status**: `quarantined_legacy`
- **Method**: Synthetic neural network / regression trained on artificially generated road condition labels.
- **Feature Contract**: Legacy schema (`backend/src/predict.py`).
- **Dataset**: `synthetic_road_labels.csv` (artificial dataset).
- **Model Version**: `legacy-synthetic-v0.1`
- **Artifact Status**: Quarantined under `legacy/synthetic_model_legacy/`.
- **Validation Region**: None (mathematically generated synthetic numbers).
- **Approval Status**: **Rejected & Removed from Production**.
- **Known Limitations**: Synthetic labels validate only themselves. Must NEVER be shown to users or presented as real hazard probabilities.
