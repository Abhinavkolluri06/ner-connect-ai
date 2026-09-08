"""Regression tests without deserializing upstream pickle artifacts."""

import importlib.util
from pathlib import Path

import numpy as np
import pytest


def predictor():
    path = Path(__file__).resolve().parents[2] / "src/predict.py"
    spec = importlib.util.spec_from_file_location("secondary_predict", path)
    module = importlib.util.module_from_spec(spec)
    # Compile the inspected source without writing tracked upstream .pyc files.
    exec(compile(path.read_text(), str(path), "exec"), module.__dict__)
    instance = module.RouteReliabilityPredictor.__new__(module.RouteReliabilityPredictor)

    class Encoder:
        calls = 0

        def transform(self, values):
            self.calls += 1
            return np.zeros(len(values))

    class Scaler:
        calls = 0

        def transform(self, matrix):
            self.calls += 1
            return matrix

    class Model:
        calls = 0

        def predict_proba(self, matrix):
            self.calls += 1
            p = matrix[:, 0] / 100
            return np.column_stack([1 - p, p])

    instance.encoder_lulc, instance.encoder_road = Encoder(), Encoder()
    instance.scaler, instance.model = Scaler(), Model()
    return instance


def segment(slope):
    return dict(
        slope_deg=slope,
        elevation_m=500,
        rainfall_24h_mm=10,
        rainfall_72h_antecedent_mm=20,
        isro_landslide_susceptibility=2,
        lulc_type="Forest",
        road_class="State Highway",
        distance_to_drainage_km=2,
    )


def test_secondary_batch_matches_single_calls():
    single, batch = predictor(), predictor()
    segments = [segment(value) for value in (10, 20, 80)]
    expected = [single.predict_segment(**s) for s in segments]
    assert batch.predict_segments(segments) == expected
    assert (
        batch.model.calls
        == batch.scaler.calls
        == batch.encoder_lulc.calls
        == batch.encoder_road.calls
        == 1
    )
    # Preserve upstream formula; performance changes must not silently change policy.
    scores = [r["reliability_score"] for r in expected]
    expected_route = int(
        max(
            0,
            min(
                100, 100 * (1 - min(scores) / 100) ** 1.5 * (1 - np.mean(scores) / 100) ** 0.5 * 0.8
            ),
        )
    )
    assert batch.score_route(segments) == {
        "reliability_score": expected_route,
        "segment_scores": scores,
    }


def test_secondary_empty_and_oversized_rejected():
    p = predictor()
    for rows in ([], [segment(1)] * 1001):
        with pytest.raises(ValueError):
            p.score_route(rows)
    assert p.model.calls == 0


def test_secondary_api_uses_threadpool_and_bounds(monkeypatch):
    import inspect
    import sys
    import types

    from fastapi.testclient import TestClient

    fake = types.ModuleType("src.predict")
    fake.RouteReliabilityPredictor = predictor
    monkeypatch.setitem(sys.modules, "src.predict", fake)
    path = Path(__file__).resolve().parents[2] / "app.py"
    module = types.ModuleType("secondary_api_test")
    exec(compile(path.read_text(encoding="utf-8"), str(path), "exec"), module.__dict__)
    assert not inspect.iscoroutinefunction(module.predict_segment)
    assert not inspect.iscoroutinefunction(module.score_route)
    with TestClient(module.app) as client:
        payload = dict(
            origin="a",
            destination="b",
            vehicle_type="car",
            cargo_type="food",
            priority="normal",
            segments=[],
        )
        assert client.post("/api/v1/score-route", json=payload).status_code == 422
        payload["segments"] = [segment(10), segment(20)]
        response = client.post("/api/v1/score-route", json=payload)
        assert response.status_code == 200
        assert response.json()["segment_scores"] == [90, 80]
