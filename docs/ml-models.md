# ML status and model loading

**No real hazard model is trained, selected or validated in this checkout.** There is no
scientific benchmark table, best-model claim or measured real-data calibration result.
All live outputs currently use `HeuristicRiskEngine`. Artificial test fixtures exercise
training, serialization and inference mechanics only; their metrics are not hazard evidence.

## Implemented capabilities

`RiskEngine` has heuristic and ML implementations. `MLRiskEngine` batches all segment rows
through a loaded binary classifier's `predict_proba`, validates shape, finiteness, probability
bounds and row sums, then aggregates. `classes_` must be `[0,1]`, with exactly five input features.

ML mode requires a reviewed landslide model. A flood model is optional: health separately
reports readiness for each hazard. `model_mode=ml` means landslide is ML; it does not mean
every returned component is trained. Flood stays heuristic without its own artifact, and
weather/accessibility remain transparent rules. Confidence remains input completeness.

Artifact format: `<hazard>_model.joblib` plus `<hazard>_model.metadata.json`. Metadata stores:

- schema/feature versions, ordered feature list, hazard, model version and UTC training time;
- estimator name, exact library versions, dataset fingerprint and provenance;
- spatial partitions, calibration method, selection policy and held-out metrics;
- SHA-256, `serving_approved` and `review_notes`.

The loader checks these before deserialization. Python major/minor and listed scientific
library versions must match. Artifact size is capped at 256 MiB and metadata at 1 MiB.
Load only trusted local artifacts: joblib/pickle can execute code and a hash is not evidence
that a file is safe. This follows the caution in
[scikit-learn's persistence documentation](https://scikit-learn.org/stable/model_persistence.html).

Training creates unapproved candidates. Approval is a recorded scientific review of real
label provenance, sampling, feature availability, regional holdouts, calibration and acceptable
operating limits—not automatic acceptance of a high score. Set `serving_approved=true` and
substantive review notes only after that review. Normal serving rejects `test_fixture` datasets.
Missing, corrupt, wrong-version or unapproved artifacts trigger configured heuristic fallback.

## Benchmark and selection workflow

The optional pipeline registers Logistic Regression, Random Forest, Extra Trees, XGBoost,
and LightGBM. It uses the same geography-aware partitions and bounded tuning for each;
see [training.md](training.md). No model wins by reputation. The initial deterministic selection
policy is validation average precision descending, Brier ascending, then serialized size.
Latency and training time are measured and available for the subsequent deployment review.

Calibration is sigmoid calibration on separate geographic blocks using a frozen trained
estimator. Both uncalibrated and calibrated selection-set Brier scores are recorded, so a
worsening calibration is visible. Training can produce a candidate even when calibration
does not improve; it does not auto-approve it. Final held-out performance is measured only
for the selected model. See [scikit-learn calibration guidance](https://scikit-learn.org/stable/modules/calibration.html).

SHAP is not implemented or advertised. No explanation field contains invented SHAP values.
For a real approved tree model, SHAP can be added later with feature-order checks and a
defined background dataset. Regional calibration and out-of-distribution behavior remain
unvalidated until representative real data is supplied.
