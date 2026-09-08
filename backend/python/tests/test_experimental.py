import copy
import math

import pytest

from app.experimental import FEATURES, ExperimentalModel
from training.compare_ml import compare, load_request


class ConstantClassifier:
    def predict_proba(self, rows):
        import numpy as np

        return np.array([[0.8, 0.2] for _ in rows])


@pytest.fixture
def model():
    instance = ExperimentalModel.__new__(ExperimentalModel)
    instance.report = {"data_quality": {"feature_ranges": {f: [0, 1] for f in FEATURES}}}
    instance.model = ConstantClassifier()
    return instance


def test_feature_contract(model):
    features = dict.fromkeys(FEATURES, 0.3)
    assert model.predict(features) == 0.2
    for value in (None, True, "0.3", math.nan, math.inf, -1, 2):
        changed = dict(features, slope=value)
        with pytest.raises(ValueError):
            model.predict(changed)
    with pytest.raises(ValueError):
        model.predict({"rainfall_mm": 10})
    with pytest.raises(ValueError):
        model.predict(dict(features, unexpected=1))


def test_batch_predict_once_and_validate_first(model):
    features = dict.fromkeys(FEATURES, 0.3)

    class CountingClassifier(ConstantClassifier):
        calls = 0

        def predict_proba(self, rows):
            self.calls += 1
            return super().predict_proba(rows)

    classifier = CountingClassifier()
    model.model = classifier
    assert model.predict_many([features] * 25) == [0.2] * 25
    assert classifier.calls == 1
    with pytest.raises(ValueError):
        model.predict_many([features, {"invalid": 1}])
    assert classifier.calls == 1
    for invalid in ([], [features] * 1001, None):
        with pytest.raises(ValueError):
            model.predict_many(invalid)


def test_no_silent_heuristic_fallback(model):
    request = {"routes": [{"route_id": "a"}, {"route_id": "b"}]}
    before = copy.deepcopy(request)
    with pytest.raises(ValueError, match="Missing ml_features"):
        compare(request, model)
    assert request == before


def test_duplicate_route_rejected_before_go(model):
    request = {"routes": [{"route_id": "a", "ml_features": dict.fromkeys(FEATURES, 0.3)}] * 2}
    with pytest.raises(ValueError, match="unique"):
        compare(request, model)


@pytest.mark.parametrize(
    "text", ['{"routes": [], "routes": []}', '{"x": NaN}', '{"x": Infinity}', "{} {}"]
)
def test_bad_json(tmp_path, text):
    path = tmp_path / "input.json"
    path.write_text(text)
    with pytest.raises(ValueError):
        load_request(path)


def test_checksum_checked_before_deserialization(tmp_path, monkeypatch):
    import json
    import platform

    import app.experimental as experimental

    (tmp_path / "model.joblib").write_bytes(b"not a pickle")
    (tmp_path / "report.json").write_text(
        json.dumps(
            {
                "schema": "nasa-kentucky-experimental-v1",
                "feature_order": list(FEATURES),
                "python": platform.python_version(),
                "libraries": {},
                "artifact_sha256": "0" * 64,
            }
        )
    )
    monkeypatch.setattr(experimental, "RUN", tmp_path)

    def forbidden_load(*args, **kwargs):
        pytest.fail("Unverified artifact was deserialized")

    monkeypatch.setattr(experimental.joblib, "load", forbidden_load)
    with pytest.raises(ValueError, match="checksum"):
        ExperimentalModel()
