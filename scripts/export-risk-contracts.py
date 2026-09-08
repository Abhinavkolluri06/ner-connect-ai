"""Regenerate shared contracts from authoritative Python models and actual output."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend" / "python"))

from app.risk.engine import HeuristicRiskEngine  # noqa: E402
from app.schemas import RiskRequest, RiskResponse  # noqa: E402


def main():
    target = ROOT / "shared" / "schemas"
    target.mkdir(parents=True, exist_ok=True)
    for name, model in (("risk-request", RiskRequest), ("risk-response", RiskResponse)):
        schema = {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            **model.model_json_schema(),
        }
        (target / f"{name}.schema.json").write_text(
            json.dumps(schema, indent=2) + "\n", encoding="utf-8"
        )
    request = RiskRequest.model_validate(
        {
            "route_id": "route-a",
            "segments": [
                {
                    "latitude": 25.57,
                    "longitude": 91.88,
                    "rainfall_mm": 82,
                    "slope_deg": 34,
                    "elevation_m": 1300,
                    "historical_landslides": 7,
                    "road_condition_score": 55,
                }
            ],
        }
    )
    response = HeuristicRiskEngine().analyze(request).response
    for name, model in (("risk-request", request), ("risk-response", response)):
        (target / f"{name}.example.json").write_text(
            model.model_dump_json(indent=2) + "\n", encoding="utf-8"
        )


if __name__ == "__main__":
    main()
