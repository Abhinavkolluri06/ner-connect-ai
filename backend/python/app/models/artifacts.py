import hashlib
import importlib.metadata
import json
import logging
import math
import platform
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from app.features import FEATURE_ORDER, FEATURE_VERSION

MAX_ARTIFACT_BYTES = 256 * 1024 * 1024
MAX_METADATA_BYTES = 1024 * 1024
logger = logging.getLogger("ner.intelligence")


class ArtifactError(ValueError):
    """Model is unavailable, incompatible, unreviewed or corrupt."""


@dataclass(frozen=True)
class LoadedModel:
    estimator: Any
    metadata: dict

    def predict(self, rows: list[list[float]]) -> list[float]:
        import numpy as np

        probabilities = np.asarray(self.estimator.predict_proba(rows), dtype=float)
        if probabilities.shape != (len(rows), 2):
            raise ArtifactError("Invalid probability output shape")
        if (
            not np.isfinite(probabilities).all()
            or (probabilities < 0).any()
            or (probabilities > 1).any()
            or not np.allclose(probabilities.sum(axis=1), 1.0)
        ):
            raise ArtifactError("Invalid probability output")
        return probabilities[:, 1].tolist()


def load_artifact(
    path: Path,
    hazard: str,
    expected_version: str | None = None,
    *,
    expected_dataset_kind: str = "real",
) -> LoadedModel:
    """Load a trusted local model after checking its accompanying metadata.

    A checksum detects corruption, NOT malicious pickle code. Never point this
    function at downloaded/untrusted files. expected_dataset_kind exists for
    offline test fixtures; serving always uses the default 'real'.
    """
    import joblib

    path = path.resolve(strict=True)
    metadata_path = path.with_suffix(".metadata.json")
    if path.suffix != ".joblib" or path.stat().st_size > MAX_ARTIFACT_BYTES:
        raise ArtifactError("Invalid artifact type or size")
    if metadata_path.stat().st_size > MAX_METADATA_BYTES:
        raise ArtifactError("Metadata exceeds size limit")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if not isinstance(metadata, dict):
        raise ArtifactError("Metadata must be an object")
    required_values = {
        "schema_version": "1",
        "hazard": hazard,
        "feature_version": FEATURE_VERSION,
        "feature_order": list(FEATURE_ORDER),
        "serving_approved": True,
    }
    for name, expected in required_values.items():
        if metadata.get(name) != expected:
            raise ArtifactError(f"Incompatible model metadata: {name}")
    if metadata.get("serving_approved") is not True:
        raise ArtifactError("Model has not been approved for serving")
    for name in ("model_version", "estimator_name", "review_notes", "trained_at"):
        if not isinstance(metadata.get(name), str) or not metadata[name].strip():
            raise ArtifactError(f"Missing metadata: {name}")
    trained_at = datetime.fromisoformat(metadata["trained_at"].replace("Z", "+00:00"))
    if trained_at.tzinfo is None:
        raise ArtifactError("Training timestamp must include timezone")
    if expected_version is not None and metadata["model_version"] != expected_version:
        raise ArtifactError("Configured model version mismatch")
    dataset = metadata.get("dataset", {})
    if dataset.get("kind") != expected_dataset_kind:
        raise ArtifactError("Model requires real dataset provenance")
    if expected_dataset_kind == "real":
        fingerprint = dataset.get("fingerprint", "")
        if (
            not isinstance(fingerprint, str)
            or len(fingerprint) != 64
            or any(character not in "0123456789abcdef" for character in fingerprint)
        ):
            raise ArtifactError("Dataset fingerprint required")
        for name in (
            "source",
            "license",
            "coverage",
            "positive_sampling",
            "negative_sampling",
            "rainfall_window",
        ):
            if not isinstance(dataset.get(name), str) or not dataset[name].strip():
                raise ArtifactError(f"Dataset provenance required: {name}")
    validation = metadata.get("validation", {})
    if validation.get("method") != "spatial-block-holdout":
        raise ArtifactError("Spatial validation metadata required")
    if validation.get("calibration_method") not in ("sigmoid", "isotonic"):
        raise ArtifactError("Calibration metadata required")
    metrics = validation.get("held_out_metrics")
    if not isinstance(metrics, dict) or not metrics:
        raise ArtifactError("Held-out evaluation metadata required")
    for name, value in metrics.items():
        if isinstance(value, (int, float)) and (not math.isfinite(value) or value < 0):
            raise ArtifactError(f"Invalid evaluation metric: {name}")
    versions = metadata.get("library_versions", {})
    if str(versions.get("python", "")).split(".")[:2] != platform.python_version().split(".")[:2]:
        raise ArtifactError("Python version mismatch")
    for key, package in (("sklearn", "scikit-learn"), ("numpy", "numpy"), ("joblib", "joblib")):
        if versions.get(key) != importlib.metadata.version(package):
            raise ArtifactError(f"Library version mismatch: {key}")
    for key in ("xgboost", "lightgbm"):
        if key in versions and versions[key] != importlib.metadata.version(key):
            raise ArtifactError(f"Library version mismatch: {key}")
    with path.open("rb") as file:
        if hashlib.file_digest(file, "sha256").hexdigest() != metadata.get("artifact_sha256"):
            raise ArtifactError("Artifact checksum mismatch")
        file.seek(0)
        estimator = joblib.load(file)
    if list(getattr(estimator, "classes_", [])) != [0, 1]:
        raise ArtifactError("Expected binary class order [0, 1]")
    if getattr(estimator, "n_features_in_", None) != len(FEATURE_ORDER):
        raise ArtifactError("Estimator feature dimension mismatch")
    logger.info("model loaded", extra={"model_mode": "ml"})
    return LoadedModel(estimator=estimator, metadata=metadata)
