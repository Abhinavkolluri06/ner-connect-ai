import pytest

from app.risk.aggregation import percentile
from app.risk.engine import HeuristicRiskEngine
from app.schemas import RiskRequest


def test_deterministic_normalized_and_honest(payload):
    engine = HeuristicRiskEngine()
    request = RiskRequest.model_validate(payload)
    first = engine.analyze(request)
    assert first == engine.analyze(request)
    assert first.response.model_mode == "heuristic"
    assert first.response.confidence == 1  # Exactly all required input fields present.
    assert "completeness" in first.explanation.confidence_meaning
    assert all(
        0 <= v <= 1
        for k, v in first.response.model_dump().items()
        if k not in ("route_id", "model_mode")
    )
    segment = first.explanation.segment_risks[0]
    assert sum(d.contribution for d in segment.landslide_drivers) == pytest.approx(
        segment.landslide_risk
    )
    assert sum(d.contribution for d in segment.flood_drivers) == pytest.approx(segment.flood_risk)


def test_rain_increases_hazards_and_reduces_access(payload):
    engine = HeuristicRiskEngine()
    payload["segments"][0]["rainfall_mm"] = 0
    dry = engine.analyze(RiskRequest.model_validate(payload)).response
    payload["segments"][0]["rainfall_mm"] = 120
    wet = engine.analyze(RiskRequest.model_validate(payload)).response
    assert wet.landslide_risk > dry.landslide_risk
    assert wet.flood_risk > dry.flood_risk
    assert wet.weather_risk > dry.weather_risk
    assert wet.accessibility_score < dry.accessibility_score


def test_single_severe_segment_is_not_averaged_away(payload):
    low = {
        **payload["segments"][0],
        "rainfall_mm": 0,
        "slope_deg": 0,
        "historical_landslides": 0,
        "road_condition_score": 100,
    }
    high = {
        **low,
        "rainfall_mm": 120,
        "slope_deg": 45,
        "historical_landslides": 10,
        "road_condition_score": 0,
    }
    payload["segments"] = [low] * 99 + [high]
    result = HeuristicRiskEngine().analyze(RiskRequest.model_validate(payload))
    assert result.response.landslide_risk == pytest.approx(0.6)
    assert result.explanation.summaries["landslide_risk"].high_risk_segment_count == 1
    assert result.explanation.summaries["landslide_risk"].mean == pytest.approx(0.01)
    assert result.response.accessibility_score < 0.5


def test_percentile_interpolation():
    assert percentile([0, 1], 0.9) == pytest.approx(0.9)
    assert percentile([0.3], 0.9) == 0.3
