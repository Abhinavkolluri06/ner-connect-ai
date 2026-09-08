"""Versioned expert assumptions, not fitted coefficients or hazard probabilities."""

from dataclasses import dataclass


@dataclass(frozen=True)
class HeuristicParameters:
    version: str = "heuristic-v1"
    rainfall_scale_mm: float = 120.0
    slope_scale_deg: float = 45.0
    elevation_scale_m: float = 2500.0
    history_scale: float = 10.0
    road_scale: float = 100.0
    landslide_weights: tuple[float, ...] = (0.30, 0.35, 0.25, 0.10)
    flood_weights: tuple[float, ...] = (0.65, 0.20, 0.15)
    accessibility_weights: tuple[float, ...] = (0.60, 0.15, 0.10, 0.15)
    hazard_max_weight: float = 0.60
    hazard_p90_weight: float = 0.40
    accessibility_min_weight: float = 0.60
    high_risk_threshold: float = 0.70


PARAMETERS = HeuristicParameters()


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))
