"""Local warm-process latency probe; not a production load-test claim."""

import argparse
import json
import statistics
import time
from pathlib import Path

from app.experimental import ExperimentalModel
from training.compare_ml import compare, load_request


def measure(operation, repeats):
    operation()
    samples = []
    for _ in range(repeats):
        start = time.perf_counter()
        operation()
        samples.append((time.perf_counter() - start) * 1000)
    return {"median_ms": statistics.median(samples), "samples_ms": samples}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    model = ExperimentalModel()
    request = load_request(root / "examples/experimental-ml/scenario-24.json")
    features = [route["ml_features"] for route in request["routes"]]

    def predict():
        if hasattr(model, "predict_many"):
            return model.predict_many(features)
        return [model.predict(row) for row in features]

    result = {
        "scope": "warm local model; single process; no network",
        "routes": len(features),
        "inference": measure(predict, 12),
        "comparison": measure(lambda: compare(request, model), 8),
        "scores": predict(),
        "result": compare(request, model),
    }
    result["result"].pop("generated_at", None)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, indent=2)
    print(json.dumps({k: result[k] for k in ("routes", "inference", "comparison")}, indent=2))


if __name__ == "__main__":
    main()
