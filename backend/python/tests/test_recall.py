import numpy as np
import pytest

from training.improve_recall import choose_threshold, operating_metrics, selection_key


def test_threshold_respects_budget():
    y = np.array([0] * 20 + [1] * 4)
    p = np.array([0.01] * 18 + [0.2, 0.9, 0.1, 0.3, 0.8, 0.95])
    threshold = choose_threshold(y, p, 0.1)
    m = operating_metrics(y, p, threshold)
    assert m["recall"] == 1
    assert m["false_positive_rate"] == 0.1


def test_ties_cannot_split_identical_scores():
    threshold = choose_threshold([0, 0, 1], [0.5, 0.5, 0.5], 0.1)
    assert threshold > 0.5


def test_sub_one_percent_threshold_supported():
    threshold = choose_threshold([0, 0, 1, 1], [0.001, 0.002, 0.003, 0.004], 0)
    assert threshold == 0.003


@pytest.mark.parametrize(
    "labels,scores",
    [([0, 0], [0.1, 0.2]), ([0, 1], [0.1, np.nan]), ([0, 1], [2, 0.1]), ([0, 1], [0.1])],
)
def test_invalid_threshold_inputs(labels, scores):
    with pytest.raises(ValueError):
        choose_threshold(labels, scores)


def test_selection_excludes_excessive_false_alarms():
    assert selection_key({"selection": {"false_positive_rate": 0.11}}) is None
