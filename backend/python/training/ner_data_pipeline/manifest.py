"""Structured dataset manifest specification for Northeast India regional training pipelines."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal


@dataclass
class FeatureSpec:
    name: str
    definition: str
    units: str
    source: str
    spatial_resolution_m: float
    temporal_resolution: str
    missing_value_policy: Literal["reject", "impute_regional_mean", "flag_missing"]
    transformations: list[str] = field(default_factory=list)


@dataclass
class DatasetManifest:
    dataset_name: str
    version: str
    hazard_type: Literal["landslide", "flash_flood", "road_closure"]
    source: str
    license: str
    geographic_coverage: dict[str, float]  # min_lat, max_lat, min_lon, max_lon
    temporal_coverage: dict[str, str]  # start_date, end_date (ISO 8601)
    positive_event_definition: str
    deduplication_method: str
    control_sampling_strategy: str
    spatial_join_method: Literal["exact_buffer", "nearest_neighbor", "polygon_intersection"]
    route_buffer_width_m: float
    dataset_fingerprint_sha256: str
    split_membership: dict[str, list[str]]  # "train", "calibration", "selection", "test"
    features: dict[str, FeatureSpec]
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    validation_status: Literal["scaffold", "unreviewed", "peer_reviewed", "serving_approved"] = (
        "scaffold"
    )

    def validate_integrity(self) -> bool:
        """Validate required metadata and bounds consistency."""
        cov = self.geographic_coverage
        if not (
            cov.get("min_lat", 0) < cov.get("max_lat", 0)
            and cov.get("min_lon", 0) < cov.get("max_lon", 0)
        ):
            raise ValueError("Invalid geographic coverage bounding box")
        if self.route_buffer_width_m <= 0:
            raise ValueError("Route buffer width must be positive")
        if not self.dataset_fingerprint_sha256 or len(self.dataset_fingerprint_sha256) != 64:
            raise ValueError("Dataset fingerprint must be a 64-character SHA-256 hash")
        return True
