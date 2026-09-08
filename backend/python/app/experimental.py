"""Explicit research-only loader. Never accepts user-supplied pickle paths."""

import hashlib
import json
import math
import platform
from importlib.metadata import version
from pathlib import Path

import joblib

ROOT = Path(__file__).resolve().parents[1]
RUN = ROOT / "runs" / "nasa-kentucky-v1"
FEATURES = (
    "TotalPrecip_tavg",
    "SWE_tavg",
    "SoilMoist_tavg",
    "contact_density",
    "lithology",
    "distance_to_mine",
    "slope",
)


class ExperimentalModel:
    def __init__(self):
        report = RUN / "report.json"
        artifact = RUN / "model.joblib"
        if report.stat().st_size > 1_000_000 or artifact.stat().st_size > 256_000_000:
            raise ValueError("Experimental artifact exceeds limit")
        self.report = json.loads(report.read_text(encoding="utf-8"))
        if self.report.get("schema") != "nasa-kentucky-experimental-v1":
            raise ValueError("Unexpected artifact schema")
        if self.report.get("feature_order") != list(FEATURES):
            raise ValueError("Feature contract mismatch")
        if self.report["python"].split(".")[:2] != platform.python_version().split(".")[:2]:
            raise ValueError("Python version mismatch; retrain in this environment")
        for name, expected in self.report["libraries"].items():
            if version(name) != expected:
                raise ValueError(f"{name} version mismatch; retrain in this environment")
        if hashlib.sha256(artifact.read_bytes()).hexdigest() != self.report["artifact_sha256"]:
            raise ValueError("Experimental artifact checksum mismatch")
        # Only a fixed artifact trained locally by our script, not a download.
        self.model = joblib.load(artifact)
        if list(self.model.classes_) != [0, 1] or self.model.n_features_in_ != len(FEATURES):
            raise ValueError("Classifier contract mismatch")

    def _row(self, features):
        if not isinstance(features, dict) or set(features) != set(FEATURES):
            raise ValueError(f"ml_features must contain exactly: {', '.join(FEATURES)}")
        values = []
        for name in FEATURES:
            value = features[name]
            if type(value) not in (int, float):
                raise ValueError(f"{name} must be a finite number")
            lower, upper = self.report["data_quality"]["feature_ranges"][name]
            if not lower <= value <= upper:
                raise ValueError(
                    f"{name} is outside the source range [{lower}, {upper}]; refusing extrapolation"
                )
            if not math.isfinite(value):
                raise ValueError(f"{name} must be a finite number")
            values.append(value)
        return values

    def predict_many(self, features):
        if not isinstance(features, (list, tuple)) or not 1 <= len(features) <= 1000:
            raise ValueError("Provide 1..1000 feature objects")
        # Validate the entire batch before invoking the model once.
        rows = [self._row(value) for value in features]
        predictions = self.model.predict_proba(rows)
        if predictions.shape != (len(rows), 2):
            raise ValueError("Invalid model output shape")
        scores = [float(value) for value in predictions[:, 1]]
        if any(not math.isfinite(value) or not 0 <= value <= 1 for value in scores):
            raise ValueError("Invalid model output")
        return scores

    def predict(self, features):
        return self.predict_many([features])[0]
