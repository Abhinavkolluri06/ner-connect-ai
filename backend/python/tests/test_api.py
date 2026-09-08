import json

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.risk.engine import HeuristicRiskEngine


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["model_mode"] == "heuristic"
    assert not response.json()["landslide_model_ready"]
    assert not response.json()["flood_model_ready"]


def test_risk_and_explanation(client, payload):
    response = client.post("/internal/v1/risk/analyze", json=payload)
    assert response.status_code == 200
    assert response.headers["X-Request-ID"]
    assert response.json()["route_id"] == payload["route_id"]
    assert response.json()["model_mode"] == "heuristic"
    explanation = client.post("/internal/v1/risk/explain", json=payload).json()
    assert explanation["result"] == response.json()
    assert explanation["segment_risks"][0]["landslide_drivers"]
    assert "heuristic" in explanation["model_version"]


@pytest.mark.parametrize(
    "body",
    ["", "{", "null", "[]", '{"segments":[]}', '{"route_id":"r","segments":[{"rainfall_mm":NaN}]}'],
)
def test_malformed_request(client, body):
    response = client.post(
        "/internal/v1/risk/analyze", content=body, headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_RISK_REQUEST"


def test_nonfinite_returns_safe_error(client, payload):
    payload["segments"][0]["elevation_m"] = float("inf")
    response = client.post(
        "/internal/v1/risk/analyze",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert "Infinity" not in response.text


def test_request_body_and_segment_bounds(payload):
    with TestClient(create_app(Settings(max_request_bytes=1024))) as client:
        assert client.post("/internal/v1/risk/analyze", content=b" " * 1025).status_code == 413
    payload["segments"] *= 1001
    with TestClient(create_app(Settings())) as client:
        assert client.post("/internal/v1/risk/analyze", json=payload).status_code == 422


class BrokenEngine(HeuristicRiskEngine):
    def analyze(self, request):
        raise RuntimeError("secret internal details")


def test_internal_error_is_safe(payload):
    with TestClient(create_app(Settings(), BrokenEngine())) as client:
        response = client.post("/internal/v1/risk/analyze", json=payload)
    assert response.status_code == 500
    assert "secret" not in response.text
    assert response.json()["error"]["code"] == "INFERENCE_FAILED"


def test_route_id_mismatch_is_rejected(payload):
    class WrongRouteEngine(HeuristicRiskEngine):
        def analyze(self, request):
            analysis = super().analyze(request)
            return analysis.model_copy(
                update={"response": analysis.response.model_copy(update={"route_id": "wrong"})}
            )

    with TestClient(create_app(Settings(), WrongRouteEngine())) as client:
        assert client.post("/internal/v1/risk/analyze", json=payload).status_code == 500


def test_size_error_has_request_id():
    with TestClient(create_app(Settings(max_request_bytes=1024))) as client:
        response = client.post("/internal/v1/risk/analyze", content=b" " * 1025)
        assert response.status_code == 413
        assert response.headers["X-Request-ID"] == response.json()["error"]["request_id"]
