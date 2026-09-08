from math import ceil, floor
from statistics import fmean

from app.features import input_completeness
from app.risk.parameters import PARAMETERS
from app.schemas import (
    Analysis,
    Explanation,
    Mode,
    RiskRequest,
    RiskResponse,
    RiskSummary,
    SegmentRisk,
)


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    index = (len(ordered) - 1) * fraction
    lo, hi = floor(index), ceil(index)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (index - lo)


def aggregate(
    request: RiskRequest,
    segments: list[SegmentRisk],
    mode: Mode,
    version: str,
    warnings: list[str],
) -> Analysis:
    if len(segments) != len(request.segments):
        raise ValueError("Segment prediction count mismatch")
    summaries = {}
    risks = {}
    for name in ("landslide_risk", "flood_risk", "weather_risk"):
        values = [getattr(segment, name) for segment in segments]
        maximum, p90 = max(values), percentile(values, 0.9)
        summaries[name] = RiskSummary(
            mean=fmean(values),
            maximum=maximum,
            p90=p90,
            high_risk_segment_count=sum(v >= PARAMETERS.high_risk_threshold for v in values),
        )
        risks[name] = PARAMETERS.hazard_max_weight * maximum + PARAMETERS.hazard_p90_weight * p90
    access = [segment.accessibility_score for segment in segments]
    result = RiskResponse(
        route_id=request.route_id,
        **risks,
        accessibility_score=(
            PARAMETERS.accessibility_min_weight * min(access)
            + (1 - PARAMETERS.accessibility_min_weight) * fmean(access)
        ),
        confidence=input_completeness(request.segments),
        model_mode=mode,
    )
    explanation = Explanation(
        result=result,
        segment_risks=segments,
        summaries=summaries,
        aggregation="Hazards: 0.6*max + 0.4*p90; accessibility: 0.6*min + 0.4*mean.",
        model_version=version,
        warnings=warnings,
    )
    return Analysis(response=result, explanation=explanation)
