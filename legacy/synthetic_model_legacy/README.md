# Quarantined Legacy Synthetic Model Artifacts

## Notice

The files in this directory (`app.py`, `src/`, `models/`) represent a legacy synthetic experiment and prototype service.

### Why Quarantined:
1. **Synthetic Labels**: The training script (`src/train_model.py`) generated labels from arbitrary heuristic rules with Gaussian/exponential random variables. Models trained on synthetic data cannot evaluate or predict real-world hazards, nor validate themselves.
2. **Conflicting Runtime**: `app.py` was an unauthenticated secondary FastAPI server exposing `/api/v1/score-route` and claiming routes to be "✅ Safe" or "⚠️ Hazard detected", violating scientific safety principles.
3. **Single Authoritative Python Service**: The authoritative Python intelligence service is strictly `backend/python/app`.

**DO NOT** import, bundle, deploy, or deserialize these pickle artifacts into the production stack or live decision-support workflows.
