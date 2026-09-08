# Trusted local artifacts

No trained hazard artifacts are supplied. The service defaults to heuristics.

Training writes `<hazard>_model.joblib` and `<hazard>_model.metadata.json` to an explicitly
chosen output directory. Models are candidates (`serving_approved: false`) until reviewed
against real labeled data, geographic coverage, feature timing, held-out metrics and calibration.
The reviewer records approval and substantive `review_notes` in the metadata. There is no
automatic promotion based on a single metric. Do not relabel synthetic test fixtures as real.

Set the appropriate model path only for trusted, reviewed, locally generated artifacts.
Joblib/pickle may execute code: a checksum protects integrity, not trust. Never deserialize
files received from unknown sources. Metadata lists feature order/version, dataset provenance,
library versions, evaluation results and checksum. Incompatible artifacts cause configured
heuristic fallback, or fail startup when `ALLOW_MODEL_FALLBACK=false`.
