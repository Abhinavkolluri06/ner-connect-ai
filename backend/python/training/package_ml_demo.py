"""Generate synthetic demo inputs and execute an independent saved-run audit."""

import json
import random
from pathlib import Path

import nbformat as nbf
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]


def examples():
    target = REPO / "examples" / "experimental-ml"
    target.mkdir(exist_ok=True)
    rng = random.Random(42)
    for index in range(1, 26):
        name = f"scenario-{index:02d}.json"
        path = target / name
        if path.exists():
            continue  # Preserve user-edited examples on rerun.
        source = REPO / "examples" / "route-comparison" / "scenarios" / name
        request = json.loads(source.read_text(encoding="utf-8"))
        request["description"] = (
            "SYNTHETIC ML software demonstration; not measured NER features. "
            + request.get("description", "")
        )
        request["data_kind"] = "synthetic"
        for route in request["routes"]:
            # Independently invented source-native-format numbers; NOT labels,
            # NOT downloaded rows, NOT used for fitting or accuracy evaluation.
            route["ml_features"] = {
                "TotalPrecip_tavg": round(rng.uniform(0, 0.001), 8),
                "SWE_tavg": 0.0,
                "SoilMoist_tavg": round(rng.uniform(0.18, 0.42), 6),
                "contact_density": round(rng.uniform(0, 2500), 4),
                "lithology": round(rng.uniform(0.002, 0.4), 7),
                "distance_to_mine": round(rng.uniform(0, 160000), 3),
                "slope": min(39.0, max(0.1, route["slope_deg"])),
            }
        with path.open("x", encoding="utf-8") as stream:
            json.dump(request, stream, indent=2, allow_nan=False)
            stream.write("\n")


def notebook():
    report = json.loads((ROOT / "runs/nasa-kentucky-v1/report.json").read_text())
    score = report["test"]
    notebook = nbf.v4.new_notebook()
    notebook.metadata.kernelspec = {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    }
    notebook.cells = [
        nbf.v4.new_markdown_cell(
            f"## tl;dr\n\nReal locally trained {report['model']}; experimental Kentucky susceptibility, **not NER forecasting**. Held-out ROC-AUC {score['roc_auc']:.3f}, average precision {score['average_precision']:.3f}. Only 4/22 events detected at the selection-set threshold. Share with caveats; not suitable for operational safety decisions."
        ),
        nbf.v4.new_markdown_cell(
            "## Context & Methods\n\nSource: [NASA EIS case study](https://git.smce.nasa.gov/eis-freshwater/landslides), commit `1cfada85265c38e39b8531a2a5d06ef288ec9285`. 2010–2014 common window; event/background point-date grain. 15 candidate configurations; fixed 0.25-degree geographic blocks; separate training, calibration, selection and test partitions. No test-driven retuning.\n\n### Key Assumptions\n\nBackground points are not verified negatives. Same-day rain makes this retrospective classification, not a forecast. No storm-group or temporal holdout, spatial buffer, or NER data. Native geology encodings are not universal categories. Source license is unspecified: raw data and artifacts remain local. This notebook checks existing results; it does not retrain."
        ),
        nbf.v4.new_code_cell(
            "from pathlib import Path\nimport sys, json, csv, hashlib\nimport numpy as np\nfrom sklearn.metrics import roc_auc_score, average_precision_score, confusion_matrix\nroot = next(p for p in [Path.cwd(), *Path.cwd().parents] if (p / 'backend/python').is_dir()) / 'backend/python'\nsys.path.insert(0, str(root))\nfrom training.nasa_experiment import prepare, split_data, HASHES\nfrom app.experimental import ExperimentalModel\nrun = root / 'runs/nasa-kentucky-v1'\nreport = json.loads((run / 'report.json').read_text())"
        ),
        nbf.v4.new_markdown_cell(
            "## Data\n\nVerify source hashes, counts and geographic separation; no network is needed."
        ),
        nbf.v4.new_code_cell(
            "x, y, groups, records, audit = prepare(root / 'data/nasa-kentucky')\nassert audit['sha256'] == HASHES\nassert audit['usable_records'] == report['data_quality']['usable_records']\nparts = split_data(x, y, groups)\nsaved = json.loads((run / 'split-membership.json').read_text())\nassert {k: [records[i]['id'] for i in v] for k, v in parts.items()} == saved\nfor a in parts:\n    for b in parts:\n        if a != b:\n            assert not set(groups[parts[a]]) & set(groups[parts[b]])\nprint(json.dumps({k: audit[k] for k in ['raw_counts', 'dropped', 'usable_records', 'positive_records', 'background_records', 'spatial_blocks']}, indent=2))"
        ),
        nbf.v4.new_markdown_cell(
            "## Results\n\nRecompute metrics directly from saved predictions and reproduce predictions from the saved classifier."
        ),
        nbf.v4.new_code_cell(
            "with (run / 'test-predictions.csv').open() as stream:\n    rows = list(csv.DictReader(stream))\nlabels = np.array([int(r['label']) for r in rows])\npredictions = np.array([float(r['score']) for r in rows])\nmodel = ExperimentalModel()\nnp.testing.assert_allclose(model.model.predict_proba(x[parts['test']])[:, 1], predictions, rtol=1e-7)\nassert [r['sample_id'] for r in rows] == saved['test']\nassert np.array_equal(labels, y[parts['test']])\nauc = roc_auc_score(labels, predictions)\nap = average_precision_score(labels, predictions)\nassert abs(auc-report['test']['roc_auc']) < 1e-12\nassert abs(ap-report['test']['average_precision']) < 1e-12\ncm = confusion_matrix(labels, predictions >= report['threshold']).tolist()\nassert cm == report['test']['confusion_matrix']\nprint(json.dumps({'ROC_AUC': auc, 'average_precision': ap, 'background_AP_baseline': float(labels.mean()), 'confusion_matrix_TN_FP_FN_TP': cm, 'threshold_chosen_on_selection': report['threshold']}, indent=2))"
        ),
        nbf.v4.new_markdown_cell(
            "## Takeaways\n\nThe software uses a trained classifier, not hard-coded route winners. The 25 synthetic files test software only and are never training data. Low event recall, few held-out events, assumed negatives and geographic transfer prevent a safety/NER accuracy claim. Flood, weather, access, delays and route scoring remain rules or supplied values. Next scientific step: labelled NER events plus matched non-event periods, before-event weather, local geology/soil inputs and storm/location/time-separated external validation."
        ),
    ]
    nbf.validate(notebook)
    client = NotebookClient(
        notebook, timeout=120, kernel_name="python3", resources={"metadata": {"path": str(REPO)}}
    )
    client.execute()
    target = REPO / "docs" / "ml-training-audit.ipynb"
    nbf.write(notebook, target)
    print("Executed audit:", target)


if __name__ == "__main__":
    examples()
    notebook()
