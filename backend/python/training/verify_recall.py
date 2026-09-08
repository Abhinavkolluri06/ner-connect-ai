"""Independently recompute the recall report from persisted predictions."""

import csv
import hashlib
import json

import joblib
import numpy as np
from sklearn.metrics import average_precision_score, confusion_matrix, roc_auc_score

from training.nasa_experiment import ROOT, prepare, split_data


def main():
    run = ROOT / "runs/nasa-recall-v2"
    report = json.loads((run / "report.json").read_text())
    lock = json.loads((run / "selection-lock.json").read_text())
    assert report["selected"] == lock["selected"]
    assert (
        hashlib.sha256((run / "candidate.joblib").read_bytes()).hexdigest()
        == lock["artifact_sha256"]
    )
    old = ROOT / "runs/nasa-kentucky-v1/model.joblib"
    assert (
        hashlib.sha256(old.read_bytes()).hexdigest() == report["plan"]["original_artifact_sha256"]
    )
    with (run / "retrospective-predictions.csv").open() as stream:
        rows = list(csv.DictReader(stream))
    y = np.array([int(row["label"]) for row in rows])
    old_p = np.array([float(row["original_score"]) for row in rows])
    new_p = np.array([float(row["selected_score"]) for row in rows])
    outcomes = report["old_test_retrospective_NOT_fresh_validation"]
    for name, probabilities in (
        ("original", old_p),
        ("threshold_only", old_p),
        ("selected", new_p),
    ):
        result = outcomes[name]
        tn, fp, fn, tp = confusion_matrix(y, probabilities >= result["threshold"]).ravel()
        assert [[int(tn), int(fp)], [int(fn), int(tp)]] == result["confusion_matrix"]
        assert np.isclose(tp / (tp + fn), result["recall"])
        assert np.isclose(fp / (fp + tn), result["false_positive_rate"])
        assert np.isclose(tp / (tp + fp), result["precision"])
        assert np.isclose(roc_auc_score(y, probabilities), result["roc_auc"])
        assert np.isclose(average_precision_score(y, probabilities), result["average_precision"])
        print(name, f"detected={tp}, missed={fn}, false_alerts={fp}")
    x, labels, groups, records, audit = prepare(ROOT / "data/nasa-kentucky")
    assert audit["sha256"] == report["plan"]["source_sha256"]
    parts = split_data(x, labels, groups)
    assert [r["sample_id"] for r in rows] == [records[i]["id"] for i in parts["test"]]
    assert np.array_equal(labels[parts["test"]], y)
    model = joblib.load(run / "candidate.joblib")  # Fixed locally trained, hash-checked artifact.
    np.testing.assert_allclose(model.predict_proba(x[parts["test"]])[:, 1], new_p, rtol=1e-7)
    print(
        "Verified: source, split, artifact, saved predictions, all headline metrics; original model unchanged."
    )


if __name__ == "__main__":
    main()
