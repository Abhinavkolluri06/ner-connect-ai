# Risk features and heuristic assumptions

All seven Go segment fields are required. Missing values are rejected, not zero-filled.
No network or raster lookup silently enriches an incomplete request.

| Field | Definition / units | Source in serving | Missing policy |
|---|---|---|---|
| latitude | WGS84 latitude, degrees, [-90,90] | Go route segment | reject |
| longitude | WGS84 longitude, degrees, [-180,180] | Go route segment | reject |
| rainfall_mm | supplied rainfall accumulation, millimetres, >=0 | Go weather features | reject |
| slope_deg | terrain slope, degrees, [0,90] | Go road/terrain metadata | reject |
| elevation_m | elevation, metres; negative elevations allowed | Go terrain metadata | reject |
| historical_landslides | pre-observation inventory count for a consistently defined neighbourhood | Go road metadata | reject |
| road_condition_score | condition index, [0,100], higher is better | Go road metadata | reject |

The contract does not encode rainfall duration, timestamp, inventory radius or elevation datum.
Before real training/serving, the team must make these consistent and record them in dataset
metadata. Merely naming the value `rainfall_mm` does not make it a 24-hour observation.
Date-only training cutoffs cannot detect within-day leakage; time-aware data review is still needed.

Training and inference use exactly five raw predictors in this order:
`rainfall_mm, slope_deg, elevation_m, historical_landslides, road_condition_score`.
`app/features.py` is the single implementation, feature version `1`. Latitude/longitude are
for validation and spatial blocking, not predictive shortcut features. Learned scaling is
inside the serialized estimator and fitted on training data only.

## Baseline formulas

All assumptions are centralized in `app/risk/parameters.py` under `heuristic-v1`.
Define `clip(x)=max(0,min(1,x))`, `r=clip(rainfall/120)`, `s=clip(slope/45)`,
`h=clip(history/10)`, `q=clip(road/100)`, and `low=1-clip(elevation/2500)`.

- Landslide index: `0.30*r + 0.35*s + 0.25*h + 0.10*(1-q)`.
- Flood proxy index: `0.65*r + 0.20*low + 0.15*(1-s)`.
- Weather proxy index: `r`.
- Accessibility: `0.60*q + 0.15*(1-s) + 0.10*(1-r) + 0.15*(1-max(landslide,flood))`.

The scales and coefficients are unvalidated engineering choices for a reproducible demo.
Flood proxies cannot establish inundation without hydrology, river proximity and drainage.
Elevation alone is particularly weak across mixed mountain/valley terrain. Road condition
does not establish the structural capacity or legal suitability of a road for a truck.
No vehicle/cargo/priority is supplied to Python, so no such business weighting is applied.

## Segments and route aggregation

Each segment is evaluated separately. For each hazard return `0.60*max + 0.40*p90`,
using the linearly interpolated 90th percentile. The explanation also includes mean, maximum,
p90 and number of segments >=0.70. For accessibility return `0.60*min + 0.40*mean`.
A lone severe segment therefore cannot disappear into a simple route average.

There are no segment lengths or travel exposures in the contract; aggregation is not
length-weighted and depends on segment sampling. Standardize segmentation before comparing
real routes. This is hazard aggregation, not Go's final route score. Even aggregating calibrated
segment probabilities does not produce a calibrated probability of a route-level event.

## Explainability and unavailable features

Heuristic explanations report the actual nonnegative weighted terms used for landslide/flood
indices. They sum to the respective segment index. They are rule contributions, not SHAP or
causal effects. The ML path emits no made-up feature attribution; its explanation identifies
the model version and which components remain rules.

Potential future predictors include rainfall_24h/72h/7d (mm), antecedent rainfall (mm), soil
moisture (fraction), aspect (degrees), curvature (1/metre), roughness (metres), NDVI (unitless),
land cover/soil/geology (categorical), distance to river/road (metres), and drainage/flow
accumulation. None are currently fabricated, imputed or required. Adding one requires real
data coverage, a source/unit/missing policy, a contract change and a new feature/model version.
