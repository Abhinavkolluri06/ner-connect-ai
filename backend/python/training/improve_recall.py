"""Bounded recall experiment; never changes the original serving model.

The old test set is already observed. Any evaluation there is retrospective,
not a new independent estimate. Selection uses only the saved selection split.
"""

import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import roc_curve

from app.experimental import ExperimentalModel
from training.nasa_experiment import HASHES, ROOT, metrics, prepare, split_data

FPR_BUDGET = 0.10


def operating_metrics(y, probabilities, threshold):
    result = metrics(y, probabilities, threshold)
    tn, fp = result["confusion_matrix"][0]
    fn, tp = result["confusion_matrix"][1]
    result.update(
        false_positive_rate=fp / (tn + fp), alerts=tp + fp, missed_events=fn, detected_events=tp
    )
    return result


def choose_threshold(y, probabilities, budget=FPR_BUDGET):
    """Maximize recall within the calibration FPR budget, then minimize FPR.

    Evaluates actual unique scores rather than a coarse fixed .01..8 grid.
    A finite threshold above all probabilities represents 'alert none'.
    """
    y, probabilities = np.asarray(y), np.asarray(probabilities)
    if len(y) == 0 or set(y) != {0, 1} or y.shape != probabilities.shape:
        raise ValueError("Equal-size score/label vectors with both classes required")
    if not np.all(np.isfinite(probabilities)) or np.any((probabilities < 0) | (probabilities > 1)):
        raise ValueError("Probabilities must be finite and within 0..1")
    if not 0 <= budget <= 1:
        raise ValueError("FPR budget must be 0..1")
    fpr, recall, thresholds = roc_curve(y, probabilities, drop_intermediate=False)
    thresholds[0] = np.nextafter(float(probabilities.max()), np.inf)
    eligible = np.flatnonzero(fpr <= budget)
    best = max(eligible, key=lambda i: (recall[i], -fpr[i], thresholds[i]))
    return float(thresholds[best])


def candidates(imbalance):
    from lightgbm import LGBMClassifier
    from xgboost import XGBClassifier

    for weight in (1.0, 10.0, float(np.sqrt(imbalance)), float(imbalance)):
        for depth in (2, 3, 5):
            common = dict(
                n_estimators=250,
                max_depth=depth,
                learning_rate=0.035,
                reg_lambda=5,
                n_jobs=4,
                random_state=42,
                scale_pos_weight=weight,
            )
            yield (
                f"XGBoost_d{depth}_w{weight:.4f}",
                XGBClassifier(
                    **common,
                    subsample=0.8,
                    colsample_bytree=0.9,
                    min_child_weight=5,
                    eval_metric="logloss",
                ),
            )
            yield (
                f"LightGBM_d{depth}_w{weight:.4f}",
                LGBMClassifier(**common, num_leaves=2**depth, min_child_samples=15, verbosity=-1),
            )


def selection_key(row):
    m = row["selection"]
    if m["false_positive_rate"] > FPR_BUDGET:
        return None
    return m["recall"], m["average_precision"], -m["false_positive_rate"]


def run(output):
    original = ExperimentalModel()
    original_hash = original.report["artifact_sha256"]
    x, y, groups, records, audit = prepare(ROOT / "data/nasa-kentucky")
    if audit["sha256"] != HASHES:
        raise ValueError("Source data hash mismatch")
    parts = split_data(x, y, groups)
    saved = json.loads((ROOT / "runs/nasa-kentucky-v1/split-membership.json").read_text())
    if {k: [records[i]["id"] for i in v] for k, v in parts.items()} != saved:
        raise ValueError("Split drift; abort rather than leak records")
    train, cal, select, old_test = (parts[k] for k in ("train", "calibration", "selection", "test"))
    imbalance = float((y[train] == 0).sum() / y[train].sum())
    output.mkdir(parents=True, exist_ok=False)
    plan = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_sha256": HASHES,
        "original_artifact_sha256": original_hash,
        "fit": "Original training rows only; calibration rows fit sigmoid and threshold",
        "threshold_objective": "Maximize calibration recall with FPR<=0.10; ties: lower FPR, higher threshold",
        "selection_objective": "Among selection FPR<=0.10: maximize recall, then AP, then minimize FPR",
        "candidate_grid": {
            "families": ["XGBoost", "LightGBM"],
            "depth": [2, 3, 5],
            "positive_weights": [1, 10, float(np.sqrt(imbalance)), imbalance],
            "trees": 250,
        },
        "test_policy": "Old test is already observed. Evaluate original and selected policy once after saving selection-lock.json; descriptive only. No test-based promotion or retuning.",
        "automatic_deployment": False,
    }
    (output / "plan.json").write_text(json.dumps(plan, indent=2), encoding="utf-8")
    rows, best, best_key, best_row = [], None, None, None

    def assess(name, model, threshold=None):
        calibration_p = model.predict_proba(x[cal])[:, 1]
        if threshold is None:
            threshold = choose_threshold(y[cal], calibration_p)
        row = {
            "name": name,
            "threshold": threshold,
            "calibration": operating_metrics(y[cal], calibration_p, threshold),
            "selection": operating_metrics(
                y[select], model.predict_proba(x[select])[:, 1], threshold
            ),
        }
        rows.append(row)
        m = row["selection"]
        print(
            f"{name}: selection recall={m['recall']:.3f}, FPR={m['false_positive_rate']:.3f}, AP={m['average_precision']:.3f}",
            flush=True,
        )
        return row

    original_policy = assess(
        "original_model_original_threshold", original.model, original.report["threshold"]
    )
    for name, estimator in [
        ("original_model_recall_threshold", original.model),
        *list(candidates(imbalance)),
    ]:
        if name != "original_model_recall_threshold":
            estimator.fit(x[train], y[train])
            calibrated = CalibratedClassifierCV(FrozenEstimator(estimator), method="sigmoid")
            calibrated.fit(x[cal], y[cal])
        else:
            calibrated = estimator
        row = assess(name, calibrated)
        key = selection_key(row)
        if key is not None and (best_key is None or key > best_key):
            best, best_key, best_row = calibrated, key, row
    (output / "selection-candidates.json").write_text(
        json.dumps(rows, indent=2, allow_nan=False), encoding="utf-8"
    )
    if best is None:
        raise ValueError("No candidate meets the selection FPR budget; results require review")
    artifact = output / "candidate.joblib"
    joblib.dump(best, artifact, compress=3)
    lock = {
        "selected": best_row,
        "artifact_sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
        "locked_before_old_test_evaluation": datetime.now(timezone.utc).isoformat(),
    }
    (output / "selection-lock.json").write_text(json.dumps(lock, indent=2), encoding="utf-8")
    old_p = original.model.predict_proba(x[old_test])[:, 1]
    new_p = best.predict_proba(x[old_test])[:, 1]
    threshold_only = next(r for r in rows if r["name"] == "original_model_recall_threshold")
    retrospective = {
        "original": operating_metrics(y[old_test], old_p, original_policy["threshold"]),
        "threshold_only": operating_metrics(y[old_test], old_p, threshold_only["threshold"]),
        "selected": operating_metrics(y[old_test], new_p, best_row["threshold"]),
    }
    report = {
        "plan": plan,
        "selected": best_row,
        "candidates": rows,
        "old_test_retrospective_NOT_fresh_validation": retrospective,
        "candidate_artifact_sha256": lock["artifact_sha256"],
        "source_model_metadata": original.report,
        "warnings": original.report["warnings"]
        + [
            "A gain in recall can be caused by threshold changes, not better discrimination.",
            "Selection metrics are tuned on 22 positives; selection optimism remains.",
            "10% background FPR may be operationally unacceptable; budget is illustrative.",
            "No new independent or NER validation. Default route model and hazard rules unchanged.",
        ],
    }
    (output / "report.json").write_text(
        json.dumps(report, indent=2, allow_nan=False), encoding="utf-8"
    )
    with (output / "retrospective-predictions.csv").open(
        "w", newline="", encoding="utf-8"
    ) as stream:
        writer = csv.writer(stream)
        writer.writerow(["sample_id", "label", "original_score", "selected_score"])
        writer.writerows(
            (records[i]["id"], int(y[i]), float(a), float(b))
            for i, a, b in zip(old_test, old_p, new_p)
        )
    if (
        hashlib.sha256((ROOT / "runs/nasa-kentucky-v1/model.joblib").read_bytes()).hexdigest()
        != original_hash
    ):
        raise RuntimeError("Original model unexpectedly changed")
    lines = [
        "# Recall improvement experiment",
        "",
        "## Assessment: share with caveats",
        "",
        "Research comparison only; no fresh independent or NER validation. Original demo remains unchanged.",
        "",
        f"Selected on validation: `{best_row['name']}`. Threshold: `{best_row['threshold']:.9g}`.",
        "",
        "## Previously observed test set (retrospective, not fresh validation)",
        "",
        "| Policy | Detected / 22 | Missed | False alarms / 3254 | Recall | Precision | ROC-AUC |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for name, m in retrospective.items():
        lines.append(
            f"| {name} | {m['detected_events']} | {m['missed_events']} | {m['confusion_matrix'][0][1]} | {m['recall']:.1%} | {m['precision']:.1%} | {m['roc_auc']:.3f} |"
        )
    lines += [
        "",
        "Thresholds were chosen using calibration data; model selection used only the original selection split. The complete plan was saved before fitting, and the winner was locked before retrospective evaluation. Twenty-four models were trained plus a threshold-only baseline.",
        "",
        "## What this does and does not show",
        "",
        "Higher recall is not higher accuracy. Compare the threshold-only baseline to distinguish policy effects from retraining. More false alerts can overwhelm users. Backgrounds are assumed non-events, not verified safe roads. Neither validation nor retrospective performance demonstrates NER transfer or forecasting.",
        "",
        "The validation procedure deliberately prevents automatic deployment. Inspect `report.json`, `selection-lock.json`, `plan.json` and `retrospective-predictions.csv` in the run directory. The original artifact checksum is unchanged. No frontend changes or GitHub push.",
        "",
        "Next scientific step: independently labelled NER events/non-events and unseen location/storm/time validation. Do not tune this experiment further against its retrospective test table.",
        "",
        "## Reproduce",
        "",
        "From `C:\\ner-connect-ai\\backend\\python`:",
        "",
        "```powershell",
        ".\\.venv\\Scripts\\python.exe -m training.improve_recall --output runs/recall-another-run",
        "```",
        "",
        "Uses cached, hash-verified source data; no network needed. Refuses to overwrite an existing run.",
    ]
    (output / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {"selected": best_row["name"], "retrospective": retrospective, "output": str(output)},
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "runs/nasa-recall-v2")
    run(parser.parse_args().output)
