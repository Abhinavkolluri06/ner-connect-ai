"""File-driven experimental ML plus the existing Go routing policy."""

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from app.experimental import ExperimentalModel

REPO = Path(__file__).resolve().parents[3]


def load_request(path):
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"Duplicate JSON key: {key}")
            result[key] = value
        return result

    def invalid_constant(value):
        raise ValueError(f"Nonstandard JSON number: {value}")

    with path.open("rb") as stream:
        data = stream.read(4 * 1024 * 1024 + 1)
    if len(data) > 4 * 1024 * 1024:
        raise ValueError("JSON exceeds 4 MiB")
    return json.loads(
        data.decode("utf-8-sig"), object_pairs_hook=unique_pairs, parse_constant=invalid_constant
    )


def compare(request, model):
    if not isinstance(request, dict) or not isinstance(request.get("routes"), list):
        raise ValueError("Expected a single scenario object with routes")
    if not 2 <= len(request["routes"]) <= 25:
        raise ValueError("Provide 2..25 routes")
    # Only route dictionaries are modified; nested input values stay read-only.
    clean = dict(request)
    clean["routes"] = []
    identifiers, features, seen = [], [], set()
    for source_route in request["routes"]:
        route = source_route
        if not isinstance(route, dict):
            raise ValueError("Every route must be an object")
        identifier = route.get("route_id")
        if not isinstance(identifier, str) or identifier in seen:
            raise ValueError("Route IDs must be unique strings")
        if "ml_features" not in route:
            raise ValueError(
                "Missing ml_features. Existing five-feature files are heuristic-only; use an experimental-ml example."
            )
        seen.add(identifier)
        identifiers.append(identifier)
        route = dict(source_route)
        features.append(route.pop("ml_features"))
        clean["routes"].append(route)
    scores = dict(zip(identifiers, model.predict_many(features), strict=True))
    executable = REPO / "bin" / "route-compare.exe"
    completed = subprocess.run(
        [str(executable), "-json-stdin"],
        input=json.dumps({"request": clean, "scores": scores}, allow_nan=False),
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=30,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if completed.returncode:
        raise ValueError(completed.stderr.strip() or completed.stdout.strip())
    result = json.loads(completed.stdout)
    result["experimental_model"] = {
        "version": model.report["model_version"],
        "name": model.report["model"],
        "artifact_sha256": model.report["artifact_sha256"],
        "landslide_scores": scores,
        "source": model.report["source"],
        "ner_validated": False,
    }
    result["warnings"].extend(model.report["warnings"])
    result["warnings"].append(
        "ML features and policy features are independent inputs; verify their location/time consistency. No consistency is inferred."
    )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    path = args.file or Path(input("Enter experimental JSON scenario path: ").strip().strip('"'))
    payload = load_request(path)
    model = ExperimentalModel()
    result = compare(payload, model)
    output = args.out or path.with_name(
        path.stem + ".results-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f") + ".json"
    )
    with output.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print("EXPERIMENTAL ML HYBRID - NOT NER-VALIDATED")
    print(result["explanation"])
    for route in result["routes"]:
        print(
            f"{route['route_id']}: score={route['final_score']:.4f}, ML landslide={result['experimental_model']['landslide_scores'][route['route_id']]:.6f}"
        )
    for route in result["excluded_routes"]:
        print("EXCLUDED", route["route_id"], "; ".join(route["reasons"]))
    print("Flood, weather, ETA and ranking are not trained predictions.")
    print("Full results:", output)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        raise SystemExit(f"Error: {exc}") from exc
