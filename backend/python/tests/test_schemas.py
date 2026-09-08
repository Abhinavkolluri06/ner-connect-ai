import pytest
from pydantic import ValidationError

from app.features import FEATURE_ORDER, segment_to_row
from app.schemas import RiskRequest, RiskResponse


@pytest.mark.parametrize(
    "field,value",
    [
        ("latitude", -91),
        ("latitude", 91),
        ("longitude", -181),
        ("longitude", 181),
        ("rainfall_mm", -1),
        ("rainfall_mm", float("nan")),
        ("slope_deg", 91),
        ("elevation_m", float("inf")),
        ("historical_landslides", -1),
        ("historical_landslides", 1.5),
        ("road_condition_score", 101),
        ("rainfall_mm", "82"),
        ("rainfall_mm", True),
    ],
)
def test_invalid_segment(payload, field, value):
    payload["segments"][0][field] = value
    with pytest.raises(ValidationError):
        RiskRequest.model_validate(payload)


@pytest.mark.parametrize("change", [{"route_id": " "}, {"segments": []}, {"extra": 1}])
def test_invalid_route(payload, change):
    payload.update(change)
    with pytest.raises(ValidationError):
        RiskRequest.model_validate(payload)


def test_missing_feature(payload):
    del payload["segments"][0]["rainfall_mm"]
    with pytest.raises(ValidationError):
        RiskRequest.model_validate(payload)


def test_extreme_integer_is_rejected(payload):
    payload["segments"][0]["historical_landslides"] = 10**400
    with pytest.raises(ValidationError):
        RiskRequest.model_validate(payload)


def test_raw_shared_feature_order(payload):
    segment = RiskRequest.model_validate(payload).segments[0]
    assert len(FEATURE_ORDER) == 5
    assert segment_to_row(segment) == [82.0, 34.0, 1300.0, 7.0, 55.0]


def test_response_rejects_nonfinite_and_out_of_range():
    valid = dict(
        route_id="x",
        landslide_risk=0.1,
        flood_risk=0.1,
        weather_risk=0.1,
        accessibility_score=0.9,
        confidence=1.0,
        model_mode="heuristic",
    )
    for value in [-0.1, 1.1, float("nan"), float("inf")]:
        with pytest.raises(ValidationError):
            RiskResponse(**{**valid, "landslide_risk": value})
