import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.risk.engine import HeuristicRiskEngine


def test_missing_ml_falls_back_at_startup(payload):
    with TestClient(create_app(Settings(model_mode="ml"))) as client:
        health = client.get("/health").json()
        assert health["status"] == "degraded"
        assert health["model_mode"] == "heuristic"
        assert health["fallback_reason"]
        result = client.post("/internal/v1/risk/analyze", json=payload)
        assert result.status_code == 200
        assert result.json()["model_mode"] == "heuristic"


def test_fail_closed_model_loading():
    with pytest.raises(RuntimeError, match="fallback is disabled"):
        with TestClient(create_app(Settings(model_mode="ml", allow_model_fallback=False))):
            pass


@pytest.mark.parametrize("failure", ["exception", "nan", "wrong_route"])
def test_ml_inference_failures_use_fallback(payload, failure):
    class InvalidModel(HeuristicRiskEngine):
        mode = "ml"

        def analyze(self, request):
            if failure == "exception":
                raise RuntimeError("internal path details")
            result = super().analyze(request)
            invalid = (
                {"landslide_risk": float("nan")} if failure == "nan" else {"route_id": "wrong"}
            )
            return result.model_copy(
                update={"response": result.response.model_copy(update=invalid)}
            )

    with TestClient(create_app(Settings(), InvalidModel())) as client:
        response = client.post("/internal/v1/risk/explain", json=payload)
        assert response.status_code == 200
        assert response.json()["result"]["model_mode"] == "heuristic"
        assert any("inference failed" in warning for warning in response.json()["warnings"])


def test_invalid_configuration(monkeypatch):
    monkeypatch.setenv("MODEL_MODE", "magic")
    with pytest.raises(ValueError):
        Settings.from_env()


def test_environment_values(monkeypatch):
    monkeypatch.setenv("PYTHON_PORT", "8002")
    monkeypatch.setenv("ALLOW_MODEL_FALLBACK", "false")
    settings = Settings.from_env()
    assert settings.python_port == 8002
    assert settings.allow_model_fallback is False
