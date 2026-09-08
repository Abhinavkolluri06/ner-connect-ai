import json
from pathlib import Path

from jsonschema import Draft202012Validator

from app.schemas import RiskRequest, RiskResponse

SCHEMAS = Path(__file__).resolve().parents[3] / "shared" / "schemas"


def test_shared_go_request_and_response(client):
    request = json.loads((SCHEMAS / "risk-request.example.json").read_text())
    response = client.post("/internal/v1/risk/analyze", json=request)
    assert response.status_code == 200
    for name, payload, model in (
        ("risk-request", request, RiskRequest),
        ("risk-response", response.json(), RiskResponse),
    ):
        schema = json.loads((SCHEMAS / f"{name}.schema.json").read_text())
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema).validate(payload)
        assert {k: v for k, v in schema.items() if k != "$schema"} == model.model_json_schema()
    assert response.json() == json.loads((SCHEMAS / "risk-response.example.json").read_text())
    assert set(response.json()) == {
        "route_id",
        "landslide_risk",
        "flood_risk",
        "weather_risk",
        "accessibility_score",
        "confidence",
        "model_mode",
    }
