"""Offline end-to-end verification of all 25 ML scenario files."""

import copy
import json
from pathlib import Path

from app.experimental import ExperimentalModel
from training.compare_ml import compare


def main():
    root = Path(__file__).resolve().parents[3]
    model = ExperimentalModel()
    inputs = sorted((root / "examples/experimental-ml").glob("scenario-??.json"))
    assert len(inputs) == 25
    results = []
    for path in inputs:
        request = json.loads(path.read_text(encoding="utf-8"))
        before = copy.deepcopy(request)
        result = compare(request, model)
        assert request == before
        assert result["model_mode"] == "experimental_ml_hybrid"
        assert result["experimental_model"]["ner_validated"] is False
        excluded = {r["route_id"] for r in result["excluded_routes"]}
        for route in request["routes"]:
            if route.get("closed") or request["vehicle"] in route.get("blocked_vehicles", []):
                assert route["route_id"] in excluded
        if result["status"] == "ok":
            assert result["recommended_route_id"] == result["routes"][0]["route_id"]
            assert result["recommended_route_id"] not in excluded
        else:
            assert not result.get("recommended_route_id")
        results.append(result)
        print(path.name, result["status"], result.get("recommended_route_id", "NONE"), flush=True)
    # Prove the learned score depends on features, not the route ID.
    request = json.loads(inputs[0].read_text(encoding="utf-8"))
    original = compare(request, model)
    for route in request["routes"]:
        route["route_id"] = "renamed-" + route["route_id"]
    renamed = compare(request, model)
    for key, value in original["experimental_model"]["landslide_scores"].items():
        assert renamed["experimental_model"]["landslide_scores"]["renamed-" + key] == value
    all_scores = [
        s for result in results for s in result["experimental_model"]["landslide_scores"].values()
    ]
    assert max(all_scores) > min(all_scores)
    target = root / "backend/python/runs/nasa-kentucky-v1/demo-results.json"
    target.write_text(
        json.dumps(
            {
                "verified_scenarios": 25,
                "test_kind": "synthetic software integration, NOT accuracy validation",
                "results": results,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(
        "Verified 25 scenarios, restrictions, input immutability, ID invariance and nonconstant predictions."
    )
    print("Saved:", target)


if __name__ == "__main__":
    main()
