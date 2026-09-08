"""Coarse angular blocks with fixed holdouts; not a meter-based GIS projection."""

import numpy as np
from sklearn.model_selection import StratifiedGroupKFold


def spatial_blocks(latitude, longitude, block_degrees: float = 0.25) -> np.ndarray:
    lat, lon = np.asarray(latitude, dtype=float), np.asarray(longitude, dtype=float)
    if not 0 < block_degrees <= 10 or lat.shape != lon.shape or lat.ndim != 1:
        raise ValueError("Invalid spatial block dimensions or size")
    if not np.isfinite(lat).all() or not np.isfinite(lon).all():
        raise ValueError("Non-finite coordinates")
    if (np.abs(lat) > 90).any() or (np.abs(lon) > 180).any():
        raise ValueError("Invalid coordinates")
    return np.asarray(
        [
            f"{int(np.floor(a / block_degrees))}:{int(np.floor(b / block_degrees))}"
            for a, b in zip(lat, lon, strict=True)
        ]
    )


def grouped_folds(labels, groups, folds: int = 3, seed: int = 42):
    labels, groups = np.asarray(labels), np.asarray(groups)
    if len(labels) != len(groups) or len(set(groups)) < folds:
        raise ValueError("Insufficient spatial groups")
    splitter = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=seed)
    splits = list(splitter.split(np.zeros((len(labels), 1)), labels, groups))
    for train, valid in splits:
        if set(labels[train]) != {0, 1} or set(labels[valid]) != {0, 1}:
            raise ValueError("Spatial folds need both classes; review geographic sampling")
        if set(groups[train]) & set(groups[valid]):
            raise ValueError("Spatial leakage")
    return splits


def partitions(labels, groups, event_ids=(), seed: int = 42) -> dict[str, np.ndarray]:
    """Fixed six-fold grouping: 3 training, 1 calibration, 1 selection, 1 final test.

    Never repeatedly reshuffle until a flattering metric appears. Cross-boundary
    events require upstream block reassignment/buffering, not silent leakage.
    """
    groups = np.asarray(groups)
    if len(set(groups)) < 12:
        raise ValueError("At least 12 occupied blocks required for this validation plan")
    by_event = {}
    if len(event_ids):
        if len(event_ids) != len(groups):
            raise ValueError("Event IDs do not match observations")
        for event, group in zip(event_ids, groups, strict=True):
            if event:
                by_event.setdefault(event, set()).add(group)
        if any(len(blocks) > 1 for blocks in by_event.values()):
            raise ValueError("An event crosses blocks; merge/review spatial blocks before training")
    held = [valid for _, valid in grouped_folds(labels, groups, folds=6, seed=seed)]
    result = {
        "train": np.concatenate(held[:3]),
        "calibration": held[3],
        "selection": held[4],
        "test": held[5],
    }
    return result
