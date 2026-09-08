"""Artificial software fixtures only: none are real hazard observations."""

import csv
import json

import pytest

np = pytest.importorskip("numpy")
pytest.importorskip("sklearn")

from app.features import FEATURE_ORDER  # noqa: E402
from training.benchmark import run_benchmark  # noqa: E402
from training.evaluate import classification_metrics  # noqa: E402
from training.prepare_data import Dataset, load_dataset  # noqa: E402
from training.spatial_validation import grouped_folds, partitions, spatial_blocks  # noqa: E402

pytestmark = pytest.mark.training


@pytest.fixture
def toy_dataset():
    rng = np.random.default_rng(7)
    labels = np.tile([0, 1], 72)
    raw = rng.uniform(0, 1, (144, 5))
    raw[:, 0] = raw[:, 0] * 50 + labels * 20
    raw[:, 1] *= 45
    raw[:, 2] *= 2000
    raw[:, 3] = np.floor(raw[:, 3] * 10)
    raw[:, 4] *= 100
    return Dataset(
        raw,
        labels,
        np.repeat(np.arange(24) * 0.3 + 20, 6),
        np.full(144, 91.0),
        tuple(f"test-{i}" for i in range(144)),
        tuple(f"test-event-{i}" for i in range(144)),
        {"kind": "test_fixture", "source": "Artificial software test; no scientific claims"},
    )


def test_spatial_partitions_are_disjoint_and_deterministic(toy_dataset):
    data = toy_dataset
    blocks = spatial_blocks(data.latitude, data.longitude)
    split = partitions(data.labels, blocks, data.event_ids)
    second = partitions(data.labels, blocks, data.event_ids)
    all_indices = []
    for name, indices in split.items():
        assert np.array_equal(indices, second[name])
        assert set(data.labels[indices]) == {0, 1}
        for other, other_indices in split.items():
            if name != other:
                assert not set(blocks[indices]) & set(blocks[other_indices])
        all_indices.extend(indices)
    assert sorted(all_indices) == list(range(len(data.labels)))


def test_spatial_validation_rejects_bad_groups(toy_dataset):
    with pytest.raises(ValueError):
        grouped_folds([0, 0, 0, 1], [0, 0, 1, 1])
    blocks = spatial_blocks(toy_dataset.latitude, toy_dataset.longitude)
    with pytest.raises(ValueError, match="crosses blocks"):
        partitions(toy_dataset.labels, blocks, ["same-event"] * len(blocks))
    with pytest.raises(ValueError):
        spatial_blocks([float("nan")], [90])


def test_metric_math():
    result = classification_metrics([0, 1, 0, 1], [0.1, 0.9, 0.2, 0.8])
    assert result["roc_auc"] == 1
    assert result["pr_auc"] == 1
    assert result["brier"] == pytest.approx(0.025)
    assert result["confusion_matrix"] == [[2, 0], [0, 2]]
    with pytest.raises(ValueError):
        classification_metrics([0, 1], [0, float("nan")])


def test_fixture_pipeline_serializes_unapproved_candidate(toy_dataset, tmp_path):
    output = tmp_path / "fixture-only"
    report = run_benchmark(
        toy_dataset,
        "landslide",
        output,
        "software-fixture-v1",
        require_all=False,
        model_names=("logistic_regression",),
        expected_dataset_kind="test_fixture",
    )
    assert report["dataset_kind"] == "test_fixture"
    assert report["serving_approved"] is False
    metadata = json.loads((output / "landslide_model.metadata.json").read_text())
    assert metadata["feature_order"] == list(FEATURE_ORDER)
    assert metadata["dataset"]["kind"] == "test_fixture"
    assert metadata["validation"]["calibration_method"] == "sigmoid"
    assert "held_out_metrics" in metadata["validation"]
    assert metadata["serving_approved"] is False
    assert (output / "landslide_model.joblib").is_file()
    # Test calibrated estimator round-trip without approving it for real serving.
    from app.models.artifacts import load_artifact

    metadata["serving_approved"] = True
    metadata["review_notes"] = "Software fixture round-trip only; not hazard validation."
    (output / "landslide_model.metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
    restored = load_artifact(
        output / "landslide_model.joblib", "landslide", expected_dataset_kind="test_fixture"
    )
    assert all(0 <= value <= 1 for value in restored.predict(toy_dataset.features[:2].tolist()))
    with pytest.raises(ValueError, match="real labeled"):
        run_benchmark(toy_dataset, "landslide", tmp_path / "forbidden", "v1")


def test_all_five_model_families_on_software_fixture(toy_dataset, tmp_path):
    pytest.importorskip("xgboost")
    pytest.importorskip("lightgbm")
    result = run_benchmark(
        toy_dataset,
        "landslide",
        tmp_path / "all-five-fixture",
        "test-only-v1",
        expected_dataset_kind="test_fixture",
    )
    assert {row["model"] for row in result["benchmarks"]} == {
        "logistic_regression",
        "random_forest",
        "extra_trees",
        "xgboost",
        "lightgbm",
    }
    assert result["dataset_kind"] == "test_fixture"
    assert result["skipped"] == {}
    assert result["validation"]["held_out_metrics"]["latency_ms_per_sample"] >= 0


@pytest.fixture
def table_paths(tmp_path, payload):
    manifest = {
        "kind": "test_fixture",
        "hazard": "landslide",
        **{
            name: "Software test fixture only"
            for name in (
                "source",
                "license",
                "coverage",
                "positive_sampling",
                "negative_sampling",
                "rainfall_window",
            )
        },
        "features": {
            name: {
                "definition": name,
                "source": "test fixture",
                "units": "test units",
                "missing_policy": "reject",
            }
            for name in FEATURE_ORDER
        },
    }
    records = [
        {
            **payload["segments"][0],
            "sample_id": f"test-{i}",
            "event_id": f"event-{i}",
            "event_date": "2020-01-02",
            "feature_date": "2020-01-01",
            "label": i,
            "latitude": 25.0 + i,
        }
        for i in (0, 1)
    ]
    table, meta = tmp_path / "fixture.csv", tmp_path / "manifest.json"
    with table.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)
    meta.write_text(json.dumps(manifest), encoding="utf-8")
    return table, meta


def test_ingestion_and_explicit_labels(table_paths):
    table, meta = table_paths
    loaded = load_dataset(table, meta, "landslide", expected_kind="test_fixture")
    assert loaded.features.shape == (2, 5)
    assert loaded.metadata["kind"] == "test_fixture"
    assert loaded.metadata["class_counts"] == {"0": 1, "1": 1}
    with pytest.raises(ValueError, match="real labeled"):
        load_dataset(table, meta, "landslide")


@pytest.mark.parametrize(
    "column,value",
    [
        ("label", "unknown"),
        ("rainfall_mm", ""),
        ("feature_date", "2021-01-01"),
        ("historical_landslides", "1.5"),
        ("latitude", "NaN"),
    ],
)
def test_invalid_csv_rows(table_paths, column, value):
    table, meta = table_paths
    with table.open(encoding="utf-8", newline="") as file:
        records = list(csv.DictReader(file))
    records[0][column] = value
    with table.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)
    with pytest.raises(ValueError):
        load_dataset(table, meta, "landslide", expected_kind="test_fixture")
