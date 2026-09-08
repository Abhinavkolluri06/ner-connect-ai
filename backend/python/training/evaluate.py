import time

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def classification_metrics(labels, probabilities, threshold: float = 0.5) -> dict:
    labels, probabilities = np.asarray(labels), np.asarray(probabilities, dtype=float)
    if labels.ndim != 1 or labels.shape != probabilities.shape or set(labels) != {0, 1}:
        raise ValueError("Metrics require matching vectors with both label classes")
    if (
        not np.isfinite(probabilities).all()
        or (probabilities < 0).any()
        or (probabilities > 1).any()
    ):
        raise ValueError("Invalid probabilities")
    if not 0 <= threshold <= 1:
        raise ValueError("Invalid decision threshold")
    prediction = probabilities >= threshold
    return {
        "roc_auc": float(roc_auc_score(labels, probabilities)),
        "pr_auc": float(average_precision_score(labels, probabilities)),
        "precision": float(precision_score(labels, prediction, zero_division=0)),
        "recall": float(recall_score(labels, prediction, zero_division=0)),
        "f1": float(f1_score(labels, prediction, zero_division=0)),
        "brier": float(brier_score_loss(labels, probabilities)),
        "confusion_matrix": confusion_matrix(labels, prediction, labels=[0, 1]).tolist(),
        "threshold": threshold,
    }


def measure(estimator, features, labels, threshold: float = 0.5) -> dict:
    start = time.perf_counter()
    probabilities = estimator.predict_proba(features)[:, 1]
    latency_ms = (time.perf_counter() - start) * 1000 / len(features)
    return {
        **classification_metrics(labels, probabilities, threshold),
        "latency_ms_per_sample": latency_ms,
    }
