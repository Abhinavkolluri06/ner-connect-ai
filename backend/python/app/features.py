"""Single versioned feature order shared by training and serving."""

from app.schemas import Segment

FEATURE_VERSION = "1"
FEATURE_ORDER = (
    "rainfall_mm",
    "slope_deg",
    "elevation_m",
    "historical_landslides",
    "road_condition_score",
)


def segment_to_row(segment: Segment) -> list[float]:
    return [float(getattr(segment, name)) for name in FEATURE_ORDER]


def input_completeness(segments: list[Segment]) -> float:
    """Validated requests require all five predictors: 5/5 per segment.

    The metric says nothing about source quality or predictive uncertainty.
    Unknown/non-finite fields are rejected rather than filled with zeros.
    """
    present = sum(len(segment_to_row(segment)) for segment in segments)
    return present / (len(segments) * len(FEATURE_ORDER))
