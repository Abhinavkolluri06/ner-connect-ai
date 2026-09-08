# Backend testing

## Python

```powershell
cd backend/python
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
.venv/Scripts/python.exe -m pytest
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m ruff format --check .
```

Equivalent wrappers: `scripts/test-python.ps1` and `scripts/test-python.sh`.
Tests require no internet or external services. Optional model tests are skipped unless
`requirements-training.txt` is installed; the all-five fixture test additionally needs
`requirements-boosting.txt`. For full checks, install all requirement sets before pytest.

Coverage includes coordinate/type/finite/range checks; malformed/large bodies; deterministic
heuristics; monotonic rainfall behavior; single severe-segment aggregation; actual rule
contributions; health/analyze/explain endpoints; errors and request IDs; startup and per-request
ML fallback; frozen feature order; artifact versions/hashes/approval; missing/corrupt artifacts;
CSV labels/missingness/date leakage; spatial splits; metrics; all five candidate model families;
calibration and serialization using explicitly artificial test fixtures. No fixture metrics are
reported as hazard-model evidence. Two upstream TestClient dependency deprecation warnings
are currently visible (httpx migration and anyio alias); they are not hidden by test filters.

## Contracts and real-process integration

Regenerate shared fixtures/schemas with the Python virtual environment:

```powershell
backend/python/.venv/Scripts/python.exe scripts/export-risk-contracts.py
backend/python/.venv/Scripts/python.exe scripts/smoke-python-go.py
```

The smoke test compiles Go into a temporary directory, starts real local FastAPI and Go
processes on available ports, verifies health and risk outputs, calls the public Go demo,
asserts Python is used and route B is recommended, stops Python, then verifies Go fallback.
It also times 20 local single-segment HTTP calls. It cleans up only its own processes/files.
Use `--go /path/to/go` for a specific toolchain and `--output /path/to/result.json` to retain results.
The Go toolchain and compiler cache must be available; no service credentials are required.

`test_contract.py` checks shared fixtures against actual Pydantic schemas and returned output.
Go's own tests cover legacy responses and accepted/rejected `model_mode` variants.

## Go

From `backend/go`, run `gofmt -l .`, `go vet ./...`, and `go test -count=1 ./...`.
The Python integration change is limited to optional model-mode decoding in Go; orchestration,
final scoring, final ranking and the public response remain Go-owned.
