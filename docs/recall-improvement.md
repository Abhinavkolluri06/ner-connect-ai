# Recall experiment: more detections, many more false alarms

## Assessment: share with caveats, not ready for deployment

The 8 September 2026 experiment trained 24 additional XGBoost/LightGBM configurations, varying positive-class weights and tree depth. A sigmoid-calibrated **LightGBM, depth 2, positive weight 10** was selected using the existing validation split. It is saved separately: the original JSON route demo and its thresholds were **not changed**.

This is a recall/false-alarm trade-off, not proof of a large improvement in predictive quality. No new independent dataset or NER validation was obtained.

## Method and selection results

Same hash-verified Kentucky data and disjoint spatial partitions as the first experiment. Fit on the original training rows, calibrate and choose thresholds on calibration rows, select using the selection partition. Threshold search considers actual unique scores, including values below the original search's 0.01 floor. Training weights: 1, 10, square root of the training imbalance ratio, and the full imbalance ratio. Depths: 2, 3, 5; 250 trees each. No test data was used to fit models or select the winner.

The comparison objective was maximum validation recall subject to at most **10% background false-positive rate**, with average precision and lower false-positive rate as tie-breakers. This budget is illustrative, not an acceptable operational standard. The plan was saved before training; selection was locked before retrospective test evaluation.

On the **selection partition** (22 events, 3,237 background samples), the selected candidate detects **13/22 events (59.1% recall)** at about **9.4% background false-positive rate**. Lowering the original model's threshold detects **16/22 (72.7%)**, but its **18.7%** false-positive rate fails the selection budget. These are tuning results, not independent validation.

## Previously observed test set — retrospective comparison only

We had already inspected this test set before designing the experiment. These numbers must not be presented as a fresh, unbiased performance estimate.

| Policy | Events detected / 22 | Events missed | False alerts / 3,254 backgrounds | Recall | Alert precision |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original model and threshold | 4 | 18 | 15 | 18.2% | 21.1% |
| Original model, lower threshold only | 17 | 5 | 581 | 77.3% | 2.8% |
| Selected class-weighted LightGBM | 12 | 10 | 316 | 54.5% | 3.7% |

The LightGBM produces **328 alerts, only 12 matching labelled events**. Its retrospective ROC-AUC is 0.850 versus 0.844 originally; average precision is 0.093 versus 0.090. These small changes do not establish statistical superiority. Threshold-only tuning leaves ROC-AUC/AP unchanged. Higher recall is not higher overall accuracy.

## Reproduce and inspect

```powershell
cd C:\ner-connect-ai\backend\python
.\.venv\Scripts\python.exe -m training.verify_recall
```

The verification recomputes confusion matrices and metrics from saved predictions, reloads the hash-checked candidate to reproduce its predictions, verifies source/split membership, and confirms the original artifact is unchanged.

Run a separate repeat without overwriting either model:

```powershell
.\.venv\Scripts\python.exe -m training.improve_recall --output runs/recall-repeat
```

Saved evidence is in `backend/python/runs/nasa-recall-v2/`: `candidate.joblib`, `plan.json`, `selection-lock.json`, `report.json`, `retrospective-predictions.csv`, and `summary.md`. These files are Git-ignored. Use only locally trained, trusted pickle artifacts. The existing `compare-ml.ps1` still uses the original model; this experiment is not silently activated.

## Limitations and next step

High-severity issues: only 68 training events and 22 selection events; many comparisons can overfit selection; assumed background negatives and reporting bias; same-day rain is not a future forecast; no NER data, storm/time holdout, or spatial buffer. The calibration budget did not transfer to selection for most candidates, which illustrates geographic instability. Even the selected policy misses 10/22 events retrospectively while generating many false alarms.

Use this as an honest model-development experiment. For an operational improvement, collect independent, consistently labelled NER events and non-events, use inputs available before the event, and evaluate on untouched locations/storms/time periods with an operationally justified false-alert budget. Do not tune further against this retrospective comparison table.
