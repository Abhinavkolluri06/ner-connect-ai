"""The existing Go fields are authoritative; mode is a compatible extension."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

UnitScore = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
Mode = Literal["heuristic", "ml"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False, frozen=True)


class Segment(StrictModel):
    latitude: Annotated[float, Field(ge=-90, le=90)]
    longitude: Annotated[float, Field(ge=-180, le=180)]
    rainfall_mm: Annotated[float, Field(ge=0)]
    slope_deg: Annotated[float, Field(ge=0, le=90)]
    elevation_m: float
    historical_landslides: Annotated[int, Field(ge=0, le=9_223_372_036_854_775_807)]
    road_condition_score: Annotated[float, Field(ge=0, le=100)]


class RiskRequest(StrictModel):
    route_id: Annotated[str, Field(min_length=1, max_length=128, pattern=r"\S")]
    segments: Annotated[list[Segment], Field(min_length=1, max_length=1000)]


class RiskResponse(StrictModel):
    route_id: str
    landslide_risk: UnitScore
    flood_risk: UnitScore
    weather_risk: UnitScore
    accessibility_score: UnitScore
    # Compatibility with Go's required numeric confidence: fraction of required
    # features available. NOT a probability of correctness or calibrated certainty.
    confidence: UnitScore
    model_mode: Mode


class Driver(StrictModel):
    factor: str
    contribution: UnitScore


class SegmentRisk(StrictModel):
    landslide_risk: UnitScore
    flood_risk: UnitScore
    weather_risk: UnitScore
    accessibility_score: UnitScore
    landslide_drivers: list[Driver] = Field(default_factory=list)
    flood_drivers: list[Driver] = Field(default_factory=list)


class RiskSummary(StrictModel):
    mean: UnitScore
    maximum: UnitScore
    p90: UnitScore
    high_risk_segment_count: int


class Explanation(StrictModel):
    result: RiskResponse
    segment_risks: list[SegmentRisk]
    summaries: dict[str, RiskSummary]
    aggregation: str
    confidence_meaning: str = "Input completeness only; not prediction confidence."
    model_version: str
    warnings: list[str]


class Analysis(StrictModel):
    response: RiskResponse
    explanation: Explanation
