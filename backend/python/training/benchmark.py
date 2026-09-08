"""Same spatial splits for all candidates; untouched test blocks for winner only."""

import argparse
import io
import json
import time
from pathlib import Path

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RandomizedSearchCV
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from training.artifacts import save_candidate
from training.evaluate import measure
from training.prepare_data import Dataset, load_dataset
from training.spatial_validation import grouped_folds, partitions, spatial_blocks


def candidates(seed: int = 42):
    result = {
        "logistic_regression": (
            make_pipeline(
                StandardScaler(),
                LogisticRegression(class_weight="balanced", max_iter=1500, random_state=seed),
            ),
            {"logisticregression__C": [0.1, 1.0, 10.0]},
        ),
        "random_forest": (
            RandomForestClassifier(
                n_estimators=100, class_weight="balanced", n_jobs=1, random_state=seed
            ),
            {"max_depth": [4, 8, None]},
        ),
        "extra_trees": (
            ExtraTreesClassifier(
                n_estimators=100, class_weight="balanced", n_jobs=1, random_state=seed
            ),
            {"max_depth": [4, 8, None]},
        ),
    }
    skipped = {}
    try:
        from xgboost import XGBClassifier

        result["xgboost"] = (
            XGBClassifier(
                n_estimators=100,
                tree_method="hist",
                eval_metric="logloss",
                n_jobs=1,
                random_state=seed,
            ),
            {"max_depth": [2, 4, 6]},
        )
    except ImportError:
        skipped["xgboost"] = "Optional dependency is not installed."
    try:
        from lightgbm import LGBMClassifier

        result["lightgbm"] = (
            LGBMClassifier(
                n_estimators=100, class_weight="balanced", n_jobs=1, random_state=seed, verbosity=-1
            ),
            {"num_leaves": [7, 15, 31]},
        )
    except ImportError:
        skipped["lightgbm"] = "Optional dependency is not installed."
    return result, skipped


def run_benchmark(
    dataset: Dataset,
    hazard: str,
    output_dir: Path,
    version: str,
    *,
    block_degrees: float = 0.25,
    seed: int = 42,
    require_all: bool = True,
    model_names: tuple[str, ...] | None = None,
    expected_dataset_kind: str = "real",
) -> dict:
    if dataset.metadata.get("kind") != expected_dataset_kind:
        raise ValueError("Production benchmark requires real labeled data")
    if output_dir.exists():
        raise FileExistsError("Choose a new output directory for reproducibility")
    groups = spatial_blocks(dataset.latitude, dataset.longitude, block_degrees)
    split = partitions(dataset.labels, groups, dataset.event_ids, seed)
    train, cal, valid, test = (split[k] for k in ("train", "calibration", "selection", "test"))
    x, y = dataset.features, dataset.labels
    available, skipped = candidates(seed)
    if require_all and skipped:
        raise RuntimeError("Install requirements-boosting.txt to benchmark all five models")
    if model_names:
        if not set(model_names).issubset(available):
            raise ValueError("An explicitly requested model is unavailable")
        available = {k: v for k, v in available.items() if k in model_names}
    folds = grouped_folds(y[train], groups[train], folds=3, seed=seed)
    report, fitted = [], {}
    for name, (estimator, parameters) in available.items():
        if name == "xgboost":
            estimator.set_params(scale_pos_weight=float(sum(y[train] == 0) / sum(y[train] == 1)))
        started = time.perf_counter()
        search = RandomizedSearchCV(
            estimator,
            parameters,
            n_iter=3,
            scoring="average_precision",
            cv=folds,
            n_jobs=1,
            random_state=seed,
            error_score="raise",
        )
        search.fit(x[train], y[train])
        uncalibrated = measure(search.best_estimator_, x[valid], y[valid])
        calibrated = CalibratedClassifierCV(
            FrozenEstimator(search.best_estimator_), method="sigmoid"
        )
        calibrated.fit(x[cal], y[cal])
        metrics = measure(calibrated, x[valid], y[valid])
        buffer = io.BytesIO()
        joblib.dump(calibrated, buffer)
        report.append(
            {
                "model": name,
                **metrics,
                "uncalibrated_brier": uncalibrated["brier"],
                "train_seconds": time.perf_counter() - started,
                "model_size_bytes": buffer.tell(),
                "best_parameters": search.best_params_,
                "spatial_cv_pr_auc": float(search.best_score_),
            }
        )
        fitted[name] = calibrated
    # Selection policy is declared before looking at the final test set.
    winner = sorted(
        report,
        key=lambda item: (-item["pr_auc"], item["brier"], item["model_size_bytes"], item["model"]),
    )[0]
    held_out = measure(fitted[winner["model"]], x[test], y[test])
    validation = {
        "method": "spatial-block-holdout",
        "seed": seed,
        "block_size_degrees": block_degrees,
        "partitions": {
            name: {"count": len(indices), "blocks": sorted(set(groups[indices].tolist()))}
            for name, indices in split.items()
        },
        "selection_policy": "selection PR-AUC descending, Brier ascending, artifact size ascending",
        "calibration_method": "sigmoid",
        "held_out_metrics": held_out,
        "pr_auc_definition": "average precision (not trapezoidal integration)",
        "geographic_buffer": "none; evaluate buffered/regional/temporal holdouts before deployment",
    }
    save_candidate(
        fitted[winner["model"]], output_dir, hazard, version, dataset.metadata, validation
    )
    result = {
        "hazard": hazard,
        "dataset_kind": dataset.metadata["kind"],
        "benchmarks": report,
        "skipped": skipped,
        "selected_model": winner["model"],
        "validation": validation,
        "serving_approved": False,
    }
    (output_dir / "benchmark.json").write_text(
        json.dumps(result, indent=2, allow_nan=False), encoding="utf-8"
    )
    return result


def cli(hazard: str) -> None:
    parser = argparse.ArgumentParser(
        description=f"Train {hazard} on curated real labels; no datasets are downloaded."
    )
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--block-degrees", type=float, default=0.25)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--allow-missing-boosters", action="store_true")
    args = parser.parse_args()
    dataset = load_dataset(args.data, args.manifest, hazard)
    result = run_benchmark(
        dataset,
        hazard,
        args.output,
        args.version,
        block_degrees=args.block_degrees,
        seed=args.seed,
        require_all=not args.allow_missing_boosters,
    )
    print(json.dumps(result, indent=2, allow_nan=False))
