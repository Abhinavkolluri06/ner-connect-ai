# Reproducible offline training

Training never runs during FastAPI startup. No raw datasets, event labels or validated
models have been supplied, and no large geospatial data is automatically downloaded.
The implementation provides a curated CSV ingestion adapter plus spatial training/benchmark
utilities. Raw raster extraction and source-specific GIS joins remain data preparation work.

## Install and run

Use Python 3.12+ for the pinned scientific stack; verified on 3.14.7.

```powershell
cd backend/python
.venv/Scripts/python.exe -m pip install -r requirements-training.txt
.venv/Scripts/python.exe -m pip install -r requirements-boosting.txt
.venv/Scripts/python.exe -m training.train_landslide --data data/landslide.csv --manifest data/landslide.manifest.json --output runs/landslide-v1 --version landslide-v1
```

For flood, use `training.train_flood` and actual flood labels/manifest. `--allow-missing-boosters`
permits an explicitly reported partial benchmark when XGBoost/LightGBM are not installed;
the default requires all five model families. `--seed` defaults to 42 and `--block-degrees` to 0.25.
Output directories must be new; previous experiment artifacts are not overwritten.

## Dataset contract

CSV required columns:

```text
sample_id,event_id,event_date,feature_date,latitude,longitude,rainfall_mm,slope_deg,elevation_m,historical_landslides,road_condition_score,label
```

| Column | Definition / units | Source / missing policy |
|---|---|---|
| sample_id | unique observation identifier | curator; required, no duplicates |
| event_id | source inventory event identifier | inventory; required for positive rows, blank allowed for controls |
| event_date | event date or control observation date, ISO YYYY-MM-DD | inventory/sampling protocol; required |
| feature_date | latest observation date entering predictors | extraction provenance; required and <= event_date |
| label | 1 documented event, 0 vetted non-event control | real inventory/negative sampling; no missing or inferred labels |
| seven segment fields | definitions/units in risk-features.md | curated observations; all required and finite |

No interpolation, scaling fit, label synthesis or missing-to-zero conversion occurs at ingestion.
Duplicate location/date observations and non-binary labels are rejected. Feature source timing
must exclude future inventory events, post-event terrain changes and other target leakage.

The JSON manifest must contain `kind=real`, `hazard=landslide` or `flood`, `source`, `license`,
`coverage`, `positive_sampling`, `negative_sampling`, `rainfall_window`, and `features`.
Every one of the five predictors needs `definition`, `units`, `source`, `missing_policy=reject`.
The pipeline adds the CSV SHA-256, row count and class distribution. See the template under
`backend/python/training/dataset-manifest.template.json`; placeholders must be replaced with
real provenance. A declaration of real data is not proof: scientific review is still required.

Use verified historical occurrences as positives. Controls must come from comparable observed
road/terrain regions and observation periods, with a documented event exclusion/buffer strategy
and inventory detection limitations. Do not label arbitrary ocean/city locations as negatives.
Record prevalence/sampling changes: model probabilities under case-control sampling need not
equal deployment event prevalence.

## Geographic validation and leakage controls

Blocks use floor(latitude/0.25), floor(longitude/0.25). These are angular blocks, not equal-area
polygons or exact 25 km squares. At least 12 occupied blocks are required. A seeded six-fold
StratifiedGroupKFold assigns 3 folds to train, 1 to calibration, 1 to selection and 1 to final test.
Each partition must include both classes. Blocks cannot overlap across partitions. An inventory
event spanning multiple blocks causes rejection and requires a reviewed upstream block strategy.

Three-fold grouped CV within training performs at most three parameter configurations per model.
Preprocessing belongs inside the estimator pipeline; logistic scaling sees training folds only.
Class weights are used for logistic/forest/Extra Trees/LightGBM, and training class ratio for
XGBoost. There is no SMOTE or arbitrary oversampling. The classification threshold is fixed at
0.5 for this baseline and recorded; operational threshold tuning is a future reviewed decision.

The fitted estimator is frozen and calibrated on separate calibration blocks. Model choice uses
the selection partition, then only the winner is evaluated on the untouched test partition.
The split is not repeatedly shuffled to improve performance. The metadata records partition
counts/block IDs. Grouped splitting follows
[scikit-learn's grouped CV API](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.StratifiedGroupKFold.html).

There is no spatial buffer or temporal holdout in this initial pipeline. Near-boundary dependence,
event inventory biases, regional transfer and uneven sampling still require buffered/regional/
temporal external evaluations before real use. The split is a defensible starting point, not
proof of generalization across Northeast India.

## Measured outputs and artifacts

The pipeline records ROC-AUC, PR-AUC (average precision, not trapezoidal integration), precision,
recall, F1, confusion matrix, Brier, per-sample prediction latency, training seconds and artifact
size. `benchmark.json` includes each candidate, skipped dependencies, selected model and final
held-out metrics. The serialized candidate includes model/version/features/data/split/library
metadata and starts with `serving_approved=false`. Scientific performance results are absent
until an actual real-data run is completed. Synthetic software tests are marked `test_fixture`
throughout and cannot be served by the normal loader.

## Potential source ingestion

- Historical ISRO/NRSC landslide inventory: obtain authorized event data, licensing and dates;
  curate inventory completeness and road-relevant negatives before joining predictors.
- [NASA IMERG](https://gpm.nasa.gov/data/imerg): select the documented precipitation product,
  accumulation window and observation cutoff; record version/latency and units.
- [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM):
  obtain terrain tiles for the area, reproject for slope derivation, record vertical datum/resolution.
- [ESA WorldCover](https://esa-worldcover.org/en): potential categorical surface features for a
  future feature version, not inputs silently injected into the current five-feature model.

SoilGrids, HydroSHEDS, OSM and ERA5-Land are possible future adapters. None are downloaded or
claimed as actual training inputs. A GIS preprocessing step must preserve CRS, feature units,
source versions, spatial resolution, event-time cutoffs and missingness before exporting CSV.
