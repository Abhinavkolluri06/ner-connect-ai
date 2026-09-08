"""Read curated feature tables; never synthesize hazard labels or download data."""

import csv
import hashlib
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np

from app.features import FEATURE_ORDER, segment_to_row
from app.schemas import Segment


@dataclass(frozen=True)
class Dataset:
    features: np.ndarray
    labels: np.ndarray
    latitude: np.ndarray
    longitude: np.ndarray
    sample_ids: tuple[str, ...]
    event_ids: tuple[str, ...]
    metadata: dict


def validate_manifest(manifest: dict, hazard: str, expected_kind: str = "real") -> None:
    if manifest.get("kind") != expected_kind or manifest.get("hazard") != hazard:
        raise ValueError("Training requires a real labeled dataset manifest for this hazard")
    for key in (
        "source",
        "license",
        "coverage",
        "positive_sampling",
        "negative_sampling",
        "rainfall_window",
    ):
        if not isinstance(manifest.get(key), str) or not manifest[key].strip():
            raise ValueError(f"Dataset manifest requires {key}")
    definitions = manifest.get("features", {})
    for feature in FEATURE_ORDER:
        definition = definitions.get(feature, {})
        for key in ("definition", "units", "source"):
            if not isinstance(definition.get(key), str) or not definition[key].strip():
                raise ValueError(f"Missing feature metadata: {feature}.{key}")
        if definition.get("missing_policy") != "reject":
            raise ValueError(f"Current feature schema rejects missing {feature}")


def load_dataset(
    csv_path: Path, manifest_path: Path, hazard: str, *, expected_kind: str = "real"
) -> Dataset:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    validate_manifest(manifest, hazard, expected_kind)
    features, labels, latitudes, longitudes, ids, events = [], [], [], [], [], []
    seen_ids, seen_observations = set(), set()
    with csv_path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        required = set(FEATURE_ORDER) | {
            "latitude",
            "longitude",
            "sample_id",
            "event_id",
            "event_date",
            "feature_date",
            "label",
        }
        if not required.issubset(reader.fieldnames or []):
            raise ValueError("Dataset is missing required columns")
        for row_number, row in enumerate(reader, 2):
            try:
                if row["label"] not in ("0", "1"):
                    raise ValueError("Label must be explicitly 0 or 1")
                if not row["sample_id"].strip() or row["sample_id"] in seen_ids:
                    raise ValueError("Sample IDs must be nonempty and unique")
                event_date, feature_date = (
                    date.fromisoformat(row["event_date"]),
                    date.fromisoformat(row["feature_date"]),
                )
                if feature_date > event_date:
                    raise ValueError(
                        "Feature date is after event/observation date (target leakage)"
                    )
                if row["label"] == "1" and not row["event_id"].strip():
                    raise ValueError("Positive observations require an inventory event ID")
                values = {
                    name: float(row[name])
                    for name in Segment.model_fields
                    if name != "historical_landslides"
                }
                values["historical_landslides"] = int(row["historical_landslides"])
                segment = Segment.model_validate(values)
                identity = (segment.latitude, segment.longitude, event_date)
                if identity in seen_observations:
                    raise ValueError("Duplicate location/date observations")
                seen_observations.add(identity)
                seen_ids.add(row["sample_id"])
                features.append(segment_to_row(segment))
                labels.append(int(row["label"]))
                latitudes.append(segment.latitude)
                longitudes.append(segment.longitude)
                ids.append(row["sample_id"])
                events.append(row["event_id"])
            except (ValueError, TypeError) as exc:
                raise ValueError(f"Invalid training row {row_number}: {exc}") from exc
    if not features or set(labels) != {0, 1}:
        raise ValueError("Dataset requires observations of both classes")
    with csv_path.open("rb") as file:
        fingerprint = hashlib.file_digest(file, "sha256").hexdigest()
    metadata = {
        **manifest,
        "fingerprint": fingerprint,
        "row_count": len(labels),
        "class_counts": {"0": labels.count(0), "1": labels.count(1)},
    }
    return Dataset(
        np.asarray(features),
        np.asarray(labels),
        np.asarray(latitudes),
        np.asarray(longitudes),
        tuple(ids),
        tuple(events),
        metadata,
    )
