# Backend performance pass — 8 September 2026

This pass targets measured hot paths in the Go backend, the Python experimental ML CLI, and the separately contributed `backend/app.py` API. It is not a claim that every function or remote provider is faster. Frontend files, model weights, risk thresholds, training labels and route scoring policy were not intentionally changed.

## Changes

- Experimental inference validates all feature objects and calls `predict_proba` once per route batch instead of once per route. Single-row `predict` remains supported. A batch is limited to 1,000 rows; route comparison remains limited to 25 candidates.
- Python-to-Go comparison uses one bounded stdin/stdout JSON message instead of writing input, score and output temporary files. Go still validates the entire request, score coverage, values and restrictions. No persistent listener is opened. The child process timeout remains 30 seconds. Legacy Go file/prompt flags remain available.
- Removed unnecessary deep copying of read-only nested inputs. Request dictionaries are not mutated, verified by integration tests.
- Go request validation uses fixed field descriptors rather than rebuilding a lookup map. Route input/policy buffers are preallocated. Hazard aggregation uses one backing buffer and computes accessibility summaries during traversal instead of storing a fourth array. Ranking avoids redundant map lookups.
- The separate upstream Python predictor batches category encoding, scaling and classification. Its two prediction handlers are synchronous FastAPI handlers, so CPU work runs in the threadpool instead of blocking the async event loop. Empty or more-than-1,000-segment requests are rejected before prediction. Its existing scoring formula is preserved.
- Existing live Go route concurrency, bounded requests, provider timeouts, caching and Python lifecycle model loading are retained. No new concurrency fan-out, unbounded cache, or training parallelism was added.

## Measurements and limitations

Local Windows / Intel i5-12450H; warm process with the saved original XGBoost model. `training.performance_probe` uses scenario 24 (five routes), 12 inference samples and eight whole-comparison samples after warm-up. It excludes Python interpreter/model-loading startup and is not a production throughput test.

| Measurement | Before median | After median |
| --- | ---: | ---: |
| Five-route inference | 6.88 ms | 2.70 ms |
| Full five-route comparison, including Go process launch | 67.52 ms | 59.50 ms |

In this sample, inference is approximately 2.5 times faster and comparison latency falls about 12%. These are local observations, not service-level guarantees; CPU load and process startup affect timing. Saved scores and complete result JSON matched exactly, excluding the timestamp.

A final rerun after rebuilding measured 1.39 ms inference and 53.71 ms comparison (medians). Across the two optimized runs, the observed inference medians were 1.39–2.70 ms and comparison medians 53.71–59.50 ms. Report the range rather than treating the fastest run as a guaranteed speedup. `final.json` also matched baseline scores/result exactly.

Go's 25-route microbenchmark uses `BenchmarkComparison25`. Memory decreased from approximately **56,891 to 40,269 bytes/op** (29% lower), and allocations from **399 to 367/op** (8% lower). Timings varied: baseline 73–76 microseconds/op versus later 67–86 microseconds/op. **A consistent Go latency improvement was not established**; the evidenced Go gain is lower allocation/memory overhead. Full HTTP/provider/network performance was not load-tested.

## Verification / reproduction

```powershell
cd C:\ner-connect-ai\backend\python
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m training.verify_ml_demo
.\.venv\Scripts\python.exe -m training.performance_probe --output runs/performance/my-run.json
```

The probe refuses to overwrite an existing result file. Local before/after evidence is in `backend/python/runs/performance/` (Git-ignored). The 25-scenario integration suite checks restrictions, no-eligible cases, immutable inputs and independence from route IDs. Unit tests verify single/batch equality and one model call per batch; protocol tests cover malformed, extra, oversized and missing-score inputs.

Final verification: 86 Python tests passed (two upstream deprecation warnings), Ruff passed, Go tests and vet passed, all 25 ML scenarios passed, and the user-facing PowerShell command completed successfully.

With a complete Go 1.25+ installation:

```powershell
cd C:\ner-connect-ai\backend\go
go test ./...
go vet ./...
go test ./internal/comparison -run '^$' -bench BenchmarkComparison25 -benchmem -count 3
go build -o ../../bin/route-compare.exe ./cmd/compare
```

Rebuild the Go executable when updating Python: `compare-ml.ps1` now requires a binary supporting `-json-stdin`. The local executable was rebuilt; binaries are not committed. See the ML demo guide for recreating locally trained artifacts on a new machine.

## Important separate upstream API issue

The newer upstream commits add `backend/app.py`, `backend/src/predict.py` and a separate model. Its training script generates synthetic labels; it is **not** the NASA/Kentucky experiment. We did not deserialize, retrain, certify or replace its downloaded pickle weights. Its batching tests use deterministic test doubles, not a real-artifact performance claim.

The existing `score_route` formula grows with segment hazard while being named `reliability_score`, and the API calls high scores “Safe.” That is a pre-existing semantic/safety problem requiring a dedicated correction and contract review. It is deliberately not silently inverted during a behavior-preserving performance change. **Do not use that endpoint's “Safe” label as safety evidence.** Use the documented experimental JSON demo for the current demonstration, with all its NER-validation caveats.

Upstream commits are preserved. No forced push, raw-dataset upload, new model-weight upload or frontend changes are part of this pass.
