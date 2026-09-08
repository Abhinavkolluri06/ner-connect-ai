"""Reproducible research experiment, not an approved NER forecasting model.

Only CSV data is downloaded. No third-party notebook, pickle, or code is executed.
"""

import argparse
import csv
import hashlib
import io
import json
import math
import platform
import time
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "1cfada85265c38e39b8531a2a5d06ef288ec9285"
SOURCE = "https://git.smce.nasa.gov/eis-freshwater/landslides"
HASHES = {
    "landslides.csv": "053be90346807d7254f84e1b34a1a2d2f89d1a69e4f11899e2cfed42b34473c7",
    "random.csv": "de86200ea21ea8cb9a93cf3ad433a2d37cd84578f95e2131b65cadd021777317",
}
FEATURES = [
    "TotalPrecip_tavg",
    "SWE_tavg",
    "SoilMoist_tavg",
    "contact_density",
    "lithology",
    "distance_to_mine",
    "slope",
]
WARNINGS = [
    "Experimental Kentucky model; no NER validation or operational safety approval.",
    "Background samples are assumed non-events, not verified safe roads.",
    "Same-day precipitation is used: this is retrospective susceptibility classification, not advance warning.",
    "Sampling and inventory reporting bias prevent interpreting scores as real-world event probabilities.",
    "Source repository has no explicit dataset license: raw data stays local; verify reuse rights before redistribution.",
    "Use source-native seven-feature values only; do not substitute 24-hour rainfall for precipitation rate.",
]


def download(directory):
    directory.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for name in ("landslides.csv", "random.csv"):
        path = directory / name
        if not path.exists():
            url = f"{SOURCE}/-/raw/{COMMIT}/brendan/data/{name}"
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read(20_000_001)
            if len(data) > 20_000_000:
                raise ValueError("Source unexpectedly exceeds 20 MB")
            with path.open("xb") as stream:
                stream.write(data)
        hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        if hashes[name] != HASHES[name]:
            raise ValueError(f"{name}: source checksum mismatch; inspect rather than train")
    return hashes


def prepare(directory):
    records, dropped = [], Counter()
    raw_counts, hashes = {}, {}
    for name, label in (("landslides.csv", 1), ("random.csv", 0)):
        data = (directory / name).read_bytes()
        hashes[name] = hashlib.sha256(data).hexdigest()
        rows = list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))
        raw_counts[name] = len(rows)
        for i, row in enumerate(rows):
            try:
                x = [float(row[f]) for f in FEATURES]
                lat, lon = float(row["lat"]), float(row["lon"])
                date = datetime.fromisoformat(row["time"][:10])
                # Background table time indexes antecedent soil moisture; its
                # precipitation was extracted at time+1 day in NASA's notebook.
                if not label:
                    date += timedelta(days=1)
                if not all(math.isfinite(v) for v in [*x, lat, lon]):
                    raise ValueError("nonfinite")
                if any(v < 0 for v in x) or not 0 <= x[-1] <= 90:
                    raise ValueError("invalid range")
                if not -90 <= lat <= 90 or not -180 <= lon <= 180:
                    raise ValueError("coordinates")
            except (ValueError, KeyError, TypeError):
                dropped["missing_or_invalid"] += 1
                continue
            # Background data only covers 2010..2014. Do not confound label
            # with year by adding older/later positive-only observations.
            if not 2010 <= date.year <= 2014:
                dropped["outside_common_2010_2014_window"] += 1
                continue
            records.append(
                {
                    "x": x,
                    "y": label,
                    "lat": lat,
                    "lon": lon,
                    "date": date.date().isoformat(),
                    "id": f"{name}:{i}",
                }
            )
    # Collapse same native feature vectors and quarantine conflicting labels.
    labels = {}
    for row in records:
        labels.setdefault(tuple(row["x"]), set()).add(row["y"])
    cleaned, seen = [], set()
    for row in records:
        key = tuple(row["x"])
        location_date = (round(row["lat"], 5), round(row["lon"], 5), row["date"])
        if len(labels[key]) > 1:
            dropped["conflicting_feature_labels"] += 1
        elif key in seen or location_date in seen:
            dropped["duplicate_features_or_location_date"] += 1
        else:
            seen.update((key, location_date))
            cleaned.append(row)
    x = np.array([r["x"] for r in cleaned])
    y = np.array([r["y"] for r in cleaned])
    groups = np.array(
        [f"{math.floor(r['lat'] / 0.25)}:{math.floor(r['lon'] / 0.25)}" for r in cleaned]
    )
    if len(set(y)) != 2:
        raise ValueError("Both classes are required")
    audit = {
        "source": SOURCE,
        "source_commit": COMMIT,
        "sha256": hashes,
        "raw_counts": raw_counts,
        "dropped": dict(dropped),
        "usable_records": len(y),
        "positive_records": int(y.sum()),
        "background_records": int((y == 0).sum()),
        "spatial_blocks": len(set(groups)),
        "feature_ranges": {
            f: [float(x[:, i].min()), float(x[:, i].max())] for i, f in enumerate(FEATURES)
        },
        "date_window": [min(r["date"] for r in cleaned), max(r["date"] for r in cleaned)],
        "warnings": WARNINGS,
    }
    return x, y, groups, cleaned, audit


def metrics(y, p, threshold=0.5):
    predicted = p >= threshold
    return {
        "roc_auc": float(roc_auc_score(y, p)),
        "average_precision": float(average_precision_score(y, p)),
        "brier": float(brier_score_loss(y, p)),
        "precision": float(precision_score(y, predicted, zero_division=0)),
        "recall": float(recall_score(y, predicted, zero_division=0)),
        "f1": float(f1_score(y, predicted, zero_division=0)),
        "threshold": threshold,
        "prevalence": float(y.mean()),
        "confusion_matrix": confusion_matrix(y, predicted, labels=[0, 1]).tolist(),
    }


def split_data(x, y, groups):
    folds = [
        test
        for _, test in StratifiedGroupKFold(6, shuffle=True, random_state=42).split(x, y, groups)
    ]
    parts = dict(
        train=np.concatenate(folds[:3]), calibration=folds[3], selection=folds[4], test=folds[5]
    )
    for name, indices in parts.items():
        if len(set(y[indices])) != 2:
            raise ValueError(f"{name} has only one class; do not hunt for a lucky split")
        for other, other_indices in parts.items():
            if name != other:
                assert not set(groups[indices]) & set(groups[other_indices])
    return parts


def candidates():
    from lightgbm import LGBMClassifier
    from xgboost import XGBClassifier

    for c in (0.1, 1, 10):
        yield (
            f"logistic_C{c}",
            make_pipeline(
                StandardScaler(), LogisticRegression(C=c, class_weight="balanced", max_iter=2000)
            ),
        )
    for leaf in (2, 5, 12):
        for cls in (RandomForestClassifier, ExtraTreesClassifier):
            yield (
                f"{cls.__name__}_leaf{leaf}",
                cls(
                    n_estimators=250,
                    min_samples_leaf=leaf,
                    max_depth=12,
                    class_weight="balanced",
                    n_jobs=4,
                    random_state=42,
                ),
            )
    for depth in (2, 3, 5):
        yield (
            f"XGBoost_depth{depth}",
            XGBClassifier(
                n_estimators=250,
                max_depth=depth,
                learning_rate=0.035,
                subsample=0.8,
                colsample_bytree=0.9,
                reg_lambda=5,
                min_child_weight=5,
                n_jobs=4,
                random_state=42,
                eval_metric="logloss",
            ),
        )
        yield (
            f"LightGBM_depth{depth}",
            LGBMClassifier(
                n_estimators=250,
                max_depth=depth,
                num_leaves=2**depth,
                learning_rate=0.035,
                reg_lambda=5,
                min_child_samples=15,
                n_jobs=4,
                random_state=42,
                verbosity=-1,
            ),
        )


def run(output):
    from importlib.metadata import version

    directory = ROOT / "data" / "nasa-kentucky"
    download(directory)
    x, y, groups, records, audit = prepare(directory)
    parts = split_data(x, y, groups)
    output.mkdir(parents=True, exist_ok=False)
    audit["splits"] = {
        name: {"rows": len(idx), "positives": int(y[idx].sum()), "blocks": len(set(groups[idx]))}
        for name, idx in parts.items()
    }
    (output / "data-quality.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")
    print(json.dumps(audit["splits"]), flush=True)
    train, cal, select, test = (
        parts[name] for name in ("train", "calibration", "selection", "test")
    )
    results, winner, winner_key = [], None, None
    for name, estimator in candidates():
        start = time.monotonic()
        estimator.fit(x[train], y[train])
        calibrated = CalibratedClassifierCV(FrozenEstimator(estimator), method="sigmoid")
        calibrated.fit(x[cal], y[cal])
        score = metrics(y[select], calibrated.predict_proba(x[select])[:, 1])
        key = (score["average_precision"], -score["brier"])
        results.append(
            {"name": name, "selection": score, "seconds": round(time.monotonic() - start, 2)}
        )
        print(f"{name}: selection AP={key[0]:.4f}", flush=True)
        if winner_key is None or key > winner_key:
            winner, winner_key, winner_name = calibrated, key, name
    # Threshold chosen exclusively on selection, never on final test.
    selection_p = winner.predict_proba(x[select])[:, 1]
    thresholds = np.linspace(0.01, 0.8, 160)
    threshold = float(
        max(thresholds, key=lambda t: f1_score(y[select], selection_p >= t, zero_division=0))
    )
    probabilities = winner.predict_proba(x[test])[:, 1]
    final = metrics(y[test], probabilities, threshold)
    # Bootstrap blocks, not independent rows; descriptive uncertainty only.
    rng, draws = np.random.default_rng(42), []
    test_groups = groups[test]
    unique = np.unique(test_groups)
    for _ in range(300):
        indices = np.concatenate(
            [
                np.flatnonzero(test_groups == g)
                for g in rng.choice(unique, len(unique), replace=True)
            ]
        )
        if len(set(y[test][indices])) == 2:
            draws.append(
                [
                    roc_auc_score(y[test][indices], probabilities[indices]),
                    average_precision_score(y[test][indices], probabilities[indices]),
                ]
            )
    final["block_bootstrap_95_intervals"] = dict(
        zip(("roc_auc", "average_precision"), np.quantile(draws, [0.025, 0.975], axis=0).T.tolist())
    )
    artifact = output / "model.joblib"
    joblib.dump(winner, artifact, compress=3)
    report = {
        "schema": "nasa-kentucky-experimental-v1",
        "model_version": "kentucky-demo-v1",
        "model": winner_name,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "serving_approved": False,
        "feature_order": FEATURES,
        "source": SOURCE,
        "source_commit": COMMIT,
        "warnings": WARNINGS,
        "python": platform.python_version(),
        "libraries": {
            n: version(n) for n in ("numpy", "scikit-learn", "joblib", "xgboost", "lightgbm")
        },
        "artifact_sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
        "validation": "0.25-degree spatial-block holdout; 3 train folds, 1 calibration, 1 selection, 1 untouched test",
        "limitations": "No temporal/storm-group holdout or spatial buffer; nearby blocks may be correlated. No NER, road closure, flood, or delay validation.",
        "threshold": threshold,
        "test": final,
        "candidates": results,
        "data_quality": audit,
    }
    (output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    with (output / "test-predictions.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(["sample_id", "block", "label", "score"])
        writer.writerows(
            (records[i]["id"], groups[i], int(y[i]), float(p)) for i, p in zip(test, probabilities)
        )
    # Membership makes leakage checks and exact reruns inspectable.
    (output / "split-membership.json").write_text(
        json.dumps({k: [records[i]["id"] for i in idx] for k, idx in parts.items()}, indent=2),
        encoding="utf-8",
    )
    print(
        json.dumps({"winner": winner_name, "test": final, "output": str(output)}, indent=2),
        flush=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "runs" / "nasa-kentucky-v1")
    run(parser.parse_args().output)
