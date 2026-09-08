import hashlib
import importlib.metadata
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import joblib

from app.features import FEATURE_ORDER, FEATURE_VERSION


def save_candidate(
    estimator,
    output_dir: Path,
    hazard: str,
    model_version: str,
    dataset_metadata: dict,
    validation_metadata: dict,
) -> tuple[Path, Path]:
    if hazard not in ("landslide", "flood") or not model_version.strip():
        raise ValueError("Invalid artifact identity")
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact = output_dir / f"{hazard}_model.joblib"
    metadata_path = artifact.with_suffix(".metadata.json")
    if artifact.exists() or metadata_path.exists():
        raise FileExistsError(
            "Refusing to overwrite an existing model; use a versioned output directory"
        )
    versions = {
        key: importlib.metadata.version(package)
        for key, package in (("sklearn", "scikit-learn"), ("numpy", "numpy"), ("joblib", "joblib"))
    }
    versions["python"] = platform.python_version()
    for name in ("xgboost", "lightgbm"):
        try:
            versions[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            pass
    # Validate serializability before writing any artifact.
    metadata = {
        "schema_version": "1",
        "hazard": hazard,
        "model_version": model_version,
        "feature_version": FEATURE_VERSION,
        "feature_order": list(FEATURE_ORDER),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "estimator_name": type(estimator).__name__,
        "library_versions": versions,
        "dataset": dataset_metadata,
        "validation": validation_metadata,
        "serving_approved": False,
        "review_notes": "",
    }
    json.dumps(metadata, allow_nan=False)
    with artifact.open("xb") as file:
        joblib.dump(estimator, file)
    with artifact.open("rb") as file:
        metadata["artifact_sha256"] = hashlib.file_digest(file, "sha256").hexdigest()
    with metadata_path.open("x", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2, allow_nan=False)
    return artifact, metadata_path
