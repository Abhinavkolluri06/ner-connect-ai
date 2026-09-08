"""Trusted temporary toy estimators test mechanics, never hazard performance."""

import json

import pytest

np = pytest.importorskip("numpy")
pytest.importorskip("sklearn")
from sklearn.linear_model import LogisticRegression  # noqa: E402

from app.models.artifacts import ArtifactError, load_artifact  # noqa: E402
from app.risk.ml import MLRiskEngine  # noqa: E402
from app.schemas import RiskRequest  # noqa: E402
from training.artifacts import save_candidate  # noqa: E402

pytestmark = pytest.mark.training


@pytest.fixture
def fixture_artifact(tmp_path):
    x = np.asarray([[1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [2, 3, 4, 5, 6], [6, 5, 4, 3, 2]])
    estimator = LogisticRegression().fit(x, [0, 1, 0, 1])
    artifact, meta = save_candidate(
        estimator,
        tmp_path,
        "landslide",
        "fixture-v1",
        {"kind": "test_fixture", "source": "software fixture"},
        {
            "method": "spatial-block-holdout",
            "calibration_method": "sigmoid",
            "held_out_metrics": {"fixture_only": 0},
        },
    )
    metadata = json.loads(meta.read_text())
    metadata.update(
        serving_approved=True,
        review_notes="Software-test-only metadata; not a validated hazard model",
    )
    meta.write_text(json.dumps(metadata), encoding="utf-8")
    return artifact, meta


def test_loading_and_feature_consistent_ml_inference(fixture_artifact, payload):
    artifact, _ = fixture_artifact
    model = load_artifact(artifact, "landslide", expected_dataset_kind="test_fixture")
    engine = MLRiskEngine(model)
    request = RiskRequest.model_validate(payload)
    first = engine.analyze(request)
    assert first == engine.analyze(request)
    assert first.response.model_mode == "ml"
    assert 0 <= first.response.landslide_risk <= 1
    assert not engine.flood_model_ready
    assert first.explanation.segment_risks[0].landslide_drivers == []
    with pytest.raises(ArtifactError, match="real dataset"):
        load_artifact(artifact, "landslide")


@pytest.mark.parametrize(
    "key,value",
    [
        ("feature_order", []),
        ("feature_version", "bad"),
        ("model_version", ""),
        ("artifact_sha256", "wrong"),
        ("serving_approved", False),
        ("review_notes", ""),
        ("library_versions", {}),
        ("schema_version", "2"),
    ],
)
def test_bad_metadata_rejected(fixture_artifact, key, value):
    artifact, meta = fixture_artifact
    content = json.loads(meta.read_text())
    content[key] = value
    meta.write_text(json.dumps(content), encoding="utf-8")
    with pytest.raises(ArtifactError):
        load_artifact(artifact, "landslide", expected_dataset_kind="test_fixture")


def test_missing_corrupt_and_wrong_version(fixture_artifact, tmp_path):
    artifact, meta = fixture_artifact
    with pytest.raises(FileNotFoundError):
        load_artifact(tmp_path / "absent.joblib", "landslide")
    with pytest.raises(ArtifactError, match="version mismatch"):
        load_artifact(artifact, "landslide", "wrong", expected_dataset_kind="test_fixture")
    artifact.write_bytes(b"corrupt")
    with pytest.raises(ArtifactError, match="checksum"):
        load_artifact(artifact, "landslide", expected_dataset_kind="test_fixture")
    meta.write_text("{", encoding="utf-8")
    with pytest.raises(ValueError):
        load_artifact(artifact, "landslide", expected_dataset_kind="test_fixture")
