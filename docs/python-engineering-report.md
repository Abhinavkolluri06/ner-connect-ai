# Python intelligence engineering report

Repository: `C:\ner-connect-ai`

Date: 2026-09-07
Status: heuristic service and training infrastructure implemented and verified; real-data model training pending.

1. **Repository discovered:** clean Git checkout at commit `90364be`, containing the Go backend and an empty Python placeholder. Shared schemas and detailed documentation were absent in this checkout. The existing Go module is `github.com/ner-connect-ai/backend-go`; it was preserved.

2. **Architecture:** FastAPI transport → validated Pydantic segments → shared feature transformation → heuristic/ML engine → segment aggregation → Go-compatible hazard response. Go retains route orchestration, business priorities, final scoring and ranking.

3. **Files created:** 53 repository files including this report. Main groups are `backend/python/app/` (schemas, configuration, service, features, risk engines, aggregation, artifact loading), `backend/python/training/` (CSV ingestion, spatial validation, evaluation, benchmark/calibration, serialization, landslide/flood CLIs, manifest template), eight test files, four requirements files, environment/tool configuration, artifact guidance, six docs, four scripts and four shared schema/example files. Virtual environment and caches are local and ignored.

4. **Files modified:** root README and exactly three Go files: `internal/models/models.go`, `internal/intelligence/intelligence.go`, `internal/intelligence/intelligence_test.go`. The Go edit accepts optional `model_mode` and rejects invalid supplied values; responses omitting it remain compatible. No scoring or ranking changes.

5. **Endpoints:** `GET /health`, `POST /internal/v1/risk/analyze`, and `POST /internal/v1/risk/explain`. The additional explanation endpoint is internal.

6. **Heuristics:** deterministic landslide, flood and weather indices and rule-based accessibility. Parameters and normalization scales are centralized in `app/risk/parameters.py`. No heuristic is claimed to be a trained model.

7. **Features:** latitude, longitude, rainfall_mm, slope_deg, elevation_m, historical_landslides and road_condition_score. The shared five-predictor training/serving order excludes coordinates. Missing/non-finite values are rejected. No unavailable feature is fabricated.

8. **Training pipeline:** curated CSV with explicit binary labels and provenance, input/date/duplicate validation, geographic partitioning, bounded grouped tuning, five model families, disjoint calibration, model selection, final holdout evaluation and candidate serialization. No startup training or automated dataset downloads.

9. **Datasets actually used:** no real hazard dataset. Small clearly marked artificial software fixtures test mechanics only. Normal training/serving defaults reject `test_fixture` data.

10. **Models actually trained:** Logistic Regression, Random Forest, Extra Trees, XGBoost and LightGBM were fitted only inside artificial fixture tests. Zero real landslide/flood models were trained or promoted. Fixture artifacts are temporary test outputs.

11. **Validation strategy:** 0.25-degree spatial blocks; at least 12 occupied blocks; fixed seeded six-fold grouping assigning three folds to training, one calibration, one selection, one final test. Three-fold grouped CV within training. Both classes required; cross-block event identity rejected. No buffered or temporal external validation implemented yet.

12. **Benchmark results:** no real-data benchmark results exist. The pipeline measures ROC-AUC, average precision (PR-AUC), precision, recall, F1, confusion matrix, Brier, training time, inference latency and model size. Fixture metrics are not presented as hazard performance.

13. **Selected model:** none for deployment. Implemented selection policy is validation PR-AUC descending, Brier ascending, then artifact size, followed by an explicit scientific review.

14. **Calibration:** sigmoid calibration on held-out geographic calibration blocks is implemented and tested. Uncalibrated/calibrated selection Brier scores are recorded. No real-data calibration result is available.

15. **Explainability:** actual heuristic term contributions, per-segment indices, mean/max/p90/high-risk count, model version and limitations. No SHAP values are claimed or returned. ML weather/accessibility remain heuristic; flood remains heuristic without a reviewed flood artifact.

16. **Tests:** schema constraints, malformed/oversized requests, request IDs, deterministic/monotone rules, severe-segment aggregation, endpoints, safe errors, startup/inference fallback, feature order, metadata/serialization, missing/corrupt models, CSV/date/label checks, spatial separation, metric math, all-five model mechanics and shared contract checks.

17. **Exact verification:**

   | Command | Result |
   |---|---|
   | `.venv/Scripts/python.exe -m pytest` | **66 passed, 2 warnings in 12.69 seconds** |
   | `.venv/Scripts/python.exe -m ruff check .` | passed |
   | `.venv/Scripts/python.exe -m ruff format --check .` | 31 Python files already formatted |
   | `.venv/Scripts/python.exe -m pip check` | no broken requirements |
   | `.venv/Scripts/python.exe -m training.train_landslide --help` | passed |
   | `.venv/Scripts/python.exe -m training.train_flood --help` | passed |
   | `gofmt -l` on the three changed Go files | clean |
   | `go vet ./...` | passed |
   | `go test -count=1 ./...` | all seven tested Go packages passed |
   | `git diff --check` | passed |
   | `scripts/smoke-python-go.py` using the service venv | passed with real FastAPI and Go processes |

   The two test warnings are upstream TestClient deprecations concerning httpx and an anyio alias. They are visible, not suppressed.

   Tested runtime: Python 3.14.7; Go 1.25.1. Runtime dependencies are pinned; the optional scientific stack requires Python 3.12+. Go verification used the complete official toolchain previously downloaded into the original workspace because the machine's default installation was incomplete.

   The smoke script compiled Go to a temporary directory, verified Python health and normalized risk responses, exercised the public Go route request with connected Python, stopped Python and verified Go fallback. Both cases returned three alternatives and recommended route B. Temporary processes were stopped.

   Actual Python sample response:
   - landslide_risk: 0.6894444444444444
   - flood_risk: 0.5768333333333334
   - weather_risk: 0.6833333333333333
   - accessibility_score: 0.44491666666666674
   - confidence: 1.0 (input completeness only)
   - model_mode: heuristic

   Local HTTP single-segment heuristic measurement, 20 requests: median **5.03 ms**, p95 **30.66 ms**. This includes local HTTP overhead and is not a production throughput guarantee.

18. **Startup:**

   ```powershell
   cd C:\ner-connect-ai\backend\python
   .venv/Scripts/python.exe -m app.main
   ```

   The virtual environment is already installed on this machine. Fresh setup: `python -m venv .venv`, then install `requirements.txt`. Use `requirements-dev.txt` for testing and the optional training/boosting files for full training tests. The server binds to 127.0.0.1:8001.

19. **Environment:** PYTHON_HOST, PYTHON_PORT, MODEL_MODE, ALLOW_MODEL_FALLBACK, LANDSLIDE_MODEL_PATH, FLOOD_MODEL_PATH, MODEL_VERSION, LOG_LEVEL and MAX_REQUEST_BYTES. Export them in the shell; .env is not automatically loaded. Settings are documented in backend/python/.env.example and docs/python-intelligence.md.

20. **Known limitations:** no real labels/validated hazard model, raster extraction or live GIS enrichment; coarse unbuffered angular validation blocks; unspecified rainfall window/inventory neighbourhood in the current Go contract; no real predictive uncertainty, vehicle-specific accessibility, SHAP, or regional calibration. Model worker threads are not forcibly cancelled during inference. Keep the internal service on loopback/a private network.

21. **What remains heuristic:** all currently served hazard/accessibility results. Even with future ML artifacts, weather and accessibility stay rule-based; flood stays heuristic unless separately configured.

22. **What is actually ML:** the implemented optional trained-model serving path, calibrated classifier loading, and tested offline benchmark utilities. There is no approved deployed ML hazard model.

23. **Go integration:** set PYTHON_SERVICE_URL to the Python base URL. Strict request/response field names are preserved, with the backward-compatible model_mode addition. Go's public intelligence_mode=live indicates connectivity, not ML. Its existing weather-risk override remains unchanged. Numeric confidence is explicitly input completeness (5/5 available required predictors), never “100% prediction confidence.”

24. **Next steps:** obtain licensed, time-aligned real event/terrain/weather observations and vetted controls; standardize feature units/windows/segmentation; run real spatial benchmarks; review calibration and regional/buffered/temporal generalization; approve only suitable trusted artifacts. Frontend display should distinguish live Python heuristics from validated ML.

At the time of this original report, the files had not yet been committed or pushed. See Git history for subsequent publication.
