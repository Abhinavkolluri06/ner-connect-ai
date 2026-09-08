# Trained ML demo: run guide and model card

The local XGBoost model is genuinely trained on published observations and background samples from NASA's Kentucky case study. It is **experimental, not NER-validated, not a future-disruption forecast and not a safe-travel guarantee**. No mock scenario was used as a training label. The existing public API and original JSON comparison remain heuristic; this separate, explicitly labelled file workflow uses ML for landslide susceptibility only.

## Run on this computer (no internet required)

Open PowerShell:

```powershell
cd C:\ner-connect-ai
.\scripts\compare-ml.ps1
```

When prompted, paste a full path, for example:

```text
C:\ner-connect-ai\examples\experimental-ml\scenario-01.json
```

Or run directly:

```powershell
.\scripts\compare-ml.ps1 -FilePath .\examples\experimental-ml\scenario-01.json
```

There are **25 separate files**, `scenario-01.json` through `scenario-25.json`. The terminal displays the best eligible route, ranked scores, exclusions and model scores. A timestamped JSON result is saved beside the input; existing output files are never overwritten. `-OutputPath` selects a new output file. One scenario per file is supported by this ML command.

The original files under `examples/route-comparison/scenarios` have no ML features and still run with `scripts/compare-routes.ps1`. The ML command rejects them rather than silently falling back. Neither command creates routes: the input must provide candidate routes connecting the same endpoints. It compares only those candidates.

## What is learned, and what is not

- Landslide score: locally trained, sigmoid-calibrated XGBoost classifier.
- Flood and weather indices, accessibility, vehicle/cargo/priority scoring: rules.
- ETA, distance, delay and closures: caller-supplied, not learned predictions.
- Closed/prohibited routes remain excluded. Both the original heuristic hazard guard and the experimental score guard apply; a low ML score cannot clear a rule-flagged route.
- Final ranking is a weighted policy, not an independently trained route optimizer. No GPS or live weather is called by this offline demo.

The score is an index influenced by the source's sampling scheme, not an operational event probability. The classification threshold in the training report is for evaluation, **not** the route policy's `max_hazard_index`.

## Input contract

Keep all existing route fields and add `ml_features` with exactly these seven numeric fields:

| Field | Meaning / caution |
| --- | --- |
| `TotalPrecip_tavg` | Source-native LIS precipitation rate; do not paste 24-hour rainfall millimetres here. |
| `SWE_tavg` | Source-native snow-water-equivalent value. |
| `SoilMoist_tavg` | Source-native deepest soil-layer moisture. |
| `contact_density` | Source geological-contact-density raster value. |
| `lithology` | Source numerical lithology encoding, not a generic rock-type ID. |
| `distance_to_mine` | Source distance-to-mine raster value. |
| `slope` | Source terrain slope in degrees. |

Exact extraction definitions are in the [pinned source preprocessing notebook](https://git.smce.nasa.gov/eis-freshwater/landslides/-/blob/1cfada85265c38e39b8531a2a5d06ef288ec9285/landslides2csv.ipynb). We inspected it but do not execute downloaded code. Do not derive these fields from the old five fields or invent geology for real decisions. Range checks reject values outside the source range, but being in range does not establish geographic suitability or valid joint feature combinations.

The 25 ML examples contain **invented numbers for software testing**, including independent ML/policy weather fields. They are not measurements of the named NER routes and are not physically validated. Their winners are computed, not stored in the input. They cannot demonstrate accuracy.

## Training evidence (8 September 2026 run)

Source: [NASA EIS Landslides](https://git.smce.nasa.gov/eis-freshwater/landslides), pinned commit `1cfada85265c38e39b8531a2a5d06ef288ec9285`. Observed Kentucky landslides plus sampled background points; background is assumed non-event, not verified road accessibility. Raw source: 323 event records and 19,447 background records. After common-window filtering and validation/deduplication: 19,574 records, including 138 positives, from 2010–2014.

Only the training partition fitted estimators: 9,780 rows / 68 positives. Separate partitions: calibration 3,259 / 26; selection 3,259 / 22; final test 3,276 / 22. All four partitions use disjoint 0.25-degree geographic blocks. Fifteen configurations across logistic regression, random forest, Extra Trees, XGBoost and LightGBM were compared. Selection average precision chose XGBoost depth 3, with 250 trees. The test set was opened only after model and threshold selection. The saved estimator was not refitted on the test set.

| Held-out metric | Result |
| --- | ---: |
| ROC-AUC (not accuracy) | 0.8440 |
| Average precision | 0.0900 |
| Positive prevalence / reference AP baseline | 0.00672 |
| Precision at selection-chosen threshold | 21.05% |
| Recall at selection-chosen threshold | 18.18% |
| True positives / false negatives | 4 / 18 |
| False positives / true negatives | 15 / 3,239 |

Block-bootstrap 95% intervals are broad: ROC-AUC 0.735–0.911; average precision 0.020–0.250. Few positive events make results uncertain. Repeating training longer cannot replace representative labelled NER data.

## Validation assessment: share with caveats

The runnable audit is `docs/ml-training-audit.ipynb`. It checks source hashes, split membership, geographic separation, saved-model prediction reproduction and independent metric recomputation. Software integration checks are separate from ML accuracy.

High-severity scientific limitations: no NER external validation; low recall; assumed negatives/reporting bias; same-day rain is not advance-warning information. No temporal/storm-group split or spatial buffer, so nearby blocks and shared storms may still correlate. Native geology and mining features may not transfer to NER. These block operational claims, not an honestly labelled research/software demonstration.

Before real deployment: gather labelled NER events and matched non-event periods, audited prior-event weather and local terrain/geology data, test on unseen storms/districts/time periods, measure operational false alerts and missed events, and validate route closures and travel times independently. Flood and ETA models need their own labelled data.

## Files and reproducibility

Local model and evidence are under `backend/python/runs/nasa-kentucky-v1/`: `model.joblib`, `report.json`, `data-quality.json`, `split-membership.json`, `test-predictions.csv`, and `demo-results.json`. Raw CSVs are under `backend/python/data/nasa-kentucky/`. The loader checks artifact SHA-256, feature order, Python and library versions before loading the fixed locally trained file. Checksums detect corruption, not a malicious replacement of both metadata and artifact; do not install untrusted pickle files.

These local data/artifact directories are Git-ignored. The source repository does not declare an explicit dataset license; verify reuse/redistribution rights before distributing raw data or model weights. No new GitHub push is performed by this workflow.

To recreate on a new machine, install a complete Go 1.25+ toolchain and Python 3.14; from the repository root:

```powershell
python -m venv backend/python/.venv
.\backend\python\.venv\Scripts\python.exe -m pip install -r backend/python/requirements-experiment.txt
Push-Location backend/go
go build -o ../../bin/route-compare.exe ./cmd/compare
Pop-Location
Push-Location backend/python
.\.venv\Scripts\python.exe -m training.nasa_experiment
.\.venv\Scripts\python.exe -m training.package_ml_demo
.\.venv\Scripts\python.exe -m training.verify_ml_demo
Pop-Location
```

Training downloads only pinned CSV files, verifies their hashes, and requires internet only if they are not cached. It refuses to overwrite an existing training-run directory. Use `--output runs/another-name` for a separate experiment; the demo intentionally continues to use the reviewed `nasa-kentucky-v1` path. Never replace the reviewed run merely to hunt for a higher test score.

On this computer the default Go installation was incomplete; a complete cached toolchain was used to build the included local binary. You do not need Go or network access to run that existing binary through `compare-ml.ps1`.
