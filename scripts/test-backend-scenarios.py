"""Run 15 synthetic scenarios through real Go and Python HTTP services.

External routing, weather, terrain and road feeds are replaced with local mock
servers. Outputs are test evidence, NOT real hazard data or ML accuracy metrics.
Only temporary child processes and a temporary history database are used.
"""

import argparse
import copy
import importlib.util
import json
import math
import os
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import ClassVar
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "smoke", ROOT / "scripts/smoke-python-go.py"
)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def routes(kind):
    result = []
    for i, (name, distance, eta) in enumerate(
        (("A", 70, 90), ("B", 100, 125), ("C", 85, 110))
    ):
        slope, history, road, rain = 3, 0, 95, 0
        if kind == "dangerous":
            slope, history, road, rain = (
                (42, 9, 30, 110),
                (8, 0, 92, 10),
                (25, 3, 70, 55),
            )[i]
        elif kind == "heavy_rain":
            rain = (150, 15, 60)[i]
        elif kind == "wet":
            rain = 36
        elif kind == "food":
            distance = (100, 70, 85)[i]
        lat, lon = 25.57 + i * 0.02, 91.88 + i * 0.02
        result.append(
            {
                "route_id": name,
                "distance_km": distance,
                "eta_minutes": eta,
                "reliability_score": road / 100,
                "segments": [
                    {
                        "latitude": lat,
                        "longitude": lon,
                        "rainfall_mm": rain,
                        "slope_deg": slope,
                        "elevation_m": 1200,
                        "historical_landslides": history,
                        "road_condition_score": road,
                    }
                ],
                "geojson": {
                    "type": "LineString",
                    "coordinates": [
                        [lon - 0.001, lat - 0.001],
                        [lon, lat],
                        [lon + 0.001, lat + 0.001],
                    ],
                },
                "data_quality": {
                    "routing_source": "SYNTHETIC TEST FIXTURE",
                    "weather_source": "SYNTHETIC TEST FIXTURE",
                    "terrain_source": "SYNTHETIC TEST FIXTURE",
                    "history_source": "SYNTHETIC TEST FIXTURE",
                    "road_source": "SYNTHETIC TEST FIXTURE",
                    "feature_coverage": 1,
                    "missing_features": [],
                    "warnings": [
                        "Fabricated software test values. NOT actual roads, weather or hazard observations."
                    ],
                },
                "vehicle_suitability": "mock_not_verified",
            }
        )
    return result


def scenarios():
    definitions = [
        (
            "01",
            "Normal dry-weather trip",
            "dry",
            "car",
            "general",
            "normal",
            200,
            "A",
            None,
        ),
        (
            "02",
            "Emergency avoids dangerous shortcut",
            "dangerous",
            "ambulance",
            "emergency_equipment",
            "emergency",
            200,
            "B",
            None,
        ),
        (
            "03",
            "Fastest priority on the same roads",
            "dangerous",
            "car",
            "general",
            "fastest",
            200,
            "A",
            None,
        ),
        (
            "04",
            "Safest priority on the same roads",
            "dangerous",
            "car",
            "general",
            "safest",
            200,
            "B",
            None,
        ),
        (
            "05",
            "Heavy rain on the short route",
            "heavy_rain",
            "car",
            "passengers",
            "safest",
            200,
            "B",
            None,
        ),
        (
            "06",
            "Car travelling in rain",
            "wet",
            "car",
            "general",
            "normal",
            200,
            "A",
            None,
        ),
        (
            "07",
            "Motorcycle on the same wet roads",
            "wet",
            "motorcycle",
            "general",
            "normal",
            200,
            "A",
            None,
        ),
        (
            "08",
            "Truck carrying medical supplies",
            "dangerous",
            "truck",
            "medical_supplies",
            "emergency",
            200,
            "B",
            None,
        ),
        (
            "09",
            "Perishable food delivery",
            "food",
            "truck",
            "food",
            "normal",
            200,
            "A",
            None,
        ),
        (
            "10",
            "Shortest route has an active closure",
            "dry",
            "car",
            "general",
            "normal",
            200,
            "C",
            "close_a",
        ),
        (
            "11",
            "All three routes are closed",
            "dry",
            "car",
            "general",
            "normal",
            422,
            None,
            "close_all",
        ),
        (
            "12",
            "Python intelligence service unavailable",
            "dry",
            "car",
            "general",
            "normal",
            200,
            "A",
            "python_down",
        ),
        (
            "13",
            "Weather service unavailable",
            "dry",
            "car",
            "general",
            "normal",
            200,
            "A",
            "weather_down",
        ),
        (
            "14",
            "Invalid vehicle type",
            "dry",
            "helicopter",
            "general",
            "normal",
            400,
            None,
            None,
        ),
        (
            "15",
            "Routing provider unavailable",
            "dry",
            "car",
            "general",
            "normal",
            503,
            None,
            "routing_down",
        ),
    ]
    output = []
    for (
        number,
        name,
        kind,
        vehicle,
        cargo,
        priority,
        status,
        winner,
        fault,
    ) in definitions:
        request = {
            "origin": "Guwahati",
            "destination": "Shillong",
            "vehicle": vehicle,
            "cargo": cargo,
            "priority": priority,
        }
        if vehicle == "truck":
            request["vehicle_dimensions"] = {"weight_t": 12, "height_m": 3.5}
        output.append(
            {
                "id": number,
                "name": name,
                "data_kind": "synthetic",
                "request": request,
                "routes": routes(kind),
                "fault": fault,
                "expected_status": status,
                "expected_winner": winner,
            }
        )
    return output


class MockProvider(BaseHTTPRequestHandler):
    scenario = None
    calls: ClassVar[list] = []

    def log_message(self, *_):
        pass

    def reply(self, status, data):
        body = json.dumps(data, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        size = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(size)) if size else None
        type(self).calls.append({"method": "POST", "path": self.path, "body": body})
        if self.path.startswith("/python-offline/"):
            return self.reply(503, {"error": "injected intelligence outage"})
        if self.path == "/routes":
            if self.scenario["fault"] == "routing_down":
                return self.reply(503, {"error": "injected routing outage"})
            return self.reply(200, self.scenario["routes"])
        self.reply(404, {})

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        type(self).calls.append({"method": "GET", "path": self.path})
        if parsed.path == "/health":
            return self.reply(200, {"status": "ok", "source": "mock"})
        if parsed.path == "/weather":
            if self.scenario["fault"] == "weather_down":
                return self.reply(503, {"error": "injected weather outage"})
            route = next(
                r
                for r in self.scenario["routes"]
                if r["route_id"] == query["route_id"][0]
            )
            rain = route["segments"][0]["rainfall_mm"]
            return self.reply(200, {"rainfall_mm": rain, "risk": min(1, rain / 120)})
        if parsed.path == "/v1/elevation":
            lat = float(query["latitude"][0].split(",")[0])
            route = min(
                self.scenario["routes"],
                key=lambda r: abs(r["segments"][0]["latitude"] - lat),
            )
            point = route["segments"][0]
            e = point["elevation_m"]
            delta = 100 * math.tan(math.radians(point["slope_deg"]))
            return self.reply(200, {"elevation": [e, e + delta, e - delta, e, e]})
        if parsed.path == "/feed":
            now = datetime.now(timezone.utc)
            active = (
                self.scenario["routes"]
                if self.scenario["fault"] == "close_all"
                else self.scenario["routes"][:1]
            )
            items = [
                {
                    "id": "mock-closure-" + r["route_id"],
                    "kind": "closure",
                    "latitude": r["segments"][0]["latitude"],
                    "longitude": r["segments"][0]["longitude"],
                    "radius_km": 0.05,
                    "observed_at": (now - timedelta(minutes=10)).isoformat(),
                    "expires_at": (now + timedelta(hours=1)).isoformat(),
                    "note": "Synthetic closure",
                }
                for r in active
            ]
            return self.reply(
                200,
                {
                    "source": "SYNTHETIC TEST FEED",
                    "license": "test fixture only",
                    "updated_at": now.isoformat(),
                    "valid_until": (now + timedelta(hours=1)).isoformat(),
                    "items": items,
                },
            )
        self.reply(404, {})


def http(url, payload=None):
    request = Request(
        url,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Content-Type": "application/json"},
    )
    start = time.perf_counter()
    try:
        response = urlopen(request, timeout=40)
    except HTTPError as exc:
        response = exc
    with response:
        return (
            response.status,
            json.load(response),
            round((time.perf_counter() - start) * 1000, 2),
        )


def verify(case, status, body):
    checks = {"http_status": status == case["expected_status"]}
    if status == 200:
        ranked = body.get("routes", [])
        checks["expected_recommendation"] = (
            body.get("recommended_route_id") == case["expected_winner"]
        )
        checks["normalized_finite_scores"] = all(
            math.isfinite(r[k]) and 0 <= r[k] <= 1
            for r in ranked
            for k in (
                "final_score",
                "safety_score",
                "reliability_score",
                "accessibility_score",
                "landslide_risk",
                "flood_risk",
                "weather_risk",
            )
        )
        checks["ranked_descending"] = [r["final_score"] for r in ranked] == sorted(
            (r["final_score"] for r in ranked), reverse=True
        )
        checks["heuristic_honestly_labelled"] = bool(ranked) and all(
            r["model_mode"] == "heuristic" for r in ranked
        )
        checks["saved_to_disk"] = body.get("persisted") is True
        checks["breakdown_matches_score"] = all(
            abs(sum(r["score_breakdown"].values()) - r["final_score"]) <= 0.000051
            for r in ranked
        )
        if case["fault"] in ("python_down", "weather_down"):
            checks["explicit_fallback"] = body[
                "intelligence_mode"
            ] == "fallback" and bool(body["warnings"])
        if case["fault"] == "close_a":
            checks["closed_route_excluded"] = len(ranked) == 2 and all(
                r["route_id"] != "A" for r in ranked
            )
    else:
        expected_code = {
            400: "INVALID_ROUTE_REQUEST",
            422: "NO_ELIGIBLE_ROUTE",
            503: "ROUTING_PROVIDER_UNAVAILABLE",
        }.get(case["expected_status"])
        checks["structured_error"] = body.get("error", {}).get(
            "code"
        ) == expected_code and bool(body.get("error", {}).get("request_id"))
    return checks


def report(results, health, output):
    passed = sum(r["passed"] for r in results)
    lines = [
        "# Backend test results — 15 mock scenarios",
        "",
        f"Executed: {datetime.now(timezone.utc).isoformat()}",
        "",
        f"**{passed}/15 scenarios passed their predefined checks.**",
        "",
        "These are actual HTTP results from the Go server and Python service, using fabricated route/weather/terrain/closure inputs. This is functional testing, not prediction accuracy, real travel advice, or proof of production readiness. The frontend was not used or changed.",
        "",
        "## Results",
        "",
        "| # | Scenario | Expected | HTTP | Actual winner | Score / 100 | Result |",
        "|---|---|---|---:|---|---:|---|",
    ]
    for r in results:
        winner = r["response"].get("recommended_route_id", "—")
        score = r["response"].get("routes", [{}])[0].get("final_score")
        expected = r["expected_winner"] or f"Reject with {r['expected_status']}"
        score_text = f"{score * 100:.2f}" if score is not None else "—"
        lines.append(
            f"| {r['id']} | {r['name']} | {expected} | {r['actual_status']} | {winner} | {score_text} | {'PASS' if r['passed'] else 'FAIL'} |"
        )

    def winner_at(index):
        return results[index]["response"]["routes"][0]

    car, bike = winner_at(5), winner_at(6)
    lines += [
        "",
        "## Example: why the emergency request chooses B",
        "",
        "The emergency case uses these fabricated inputs and produces these actual scores. Hazard indices are not calibrated probabilities.",
        "",
        "| Route | Distance km | ETA min | Rain mm | Road quality /100 | Landslide index /100 | Final score /100 |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    emergency = {r["route_id"]: r for r in results[1]["response"]["routes"]}
    for candidate in routes("dangerous"):
        point = candidate["segments"][0]
        actual = emergency[candidate["route_id"]]
        lines.append(
            f"| {candidate['route_id']} | {candidate['distance_km']} | {candidate['eta_minutes']} | {point['rainfall_mm']} | {point['road_condition_score']} | {actual['landslide_risk'] * 100:.2f} | {actual['final_score'] * 100:.2f} |"
        )
    lines += [
        "",
        "## What the backend is doing",
        "",
        "1. Validates origin, destination, vehicle, cargo and priority.",
        "2. Gets three mock road candidates and enriches them with mock terrain and weather.",
        "3. Excludes roads with active closures before scoring.",
        "4. Calls the actual Python heuristic engine, or uses the Go heuristic fallback when a dependency or required feature is unavailable.",
        "5. Applies priority, cargo and vehicle rules; ranks routes; writes history to the local disk database.",
        "",
        "- On identical hazardous roads, emergency/safest requests choose B, while fastest chooses A. This demonstrates a policy trade-off: fastest is NOT a hard safety guarantee.",
        f"- On the same wet roads, car accessibility is {car['accessibility_score'] * 100:.2f}/100 and motorcycle accessibility is {bike['accessibility_score'] * 100:.2f}/100. The motorcycle rain penalty changes the score.",
        "- Closing A removes it, and C becomes the recommendation. Closing all roads returns 422 instead of recommending a blocked route.",
        "- Intelligence/weather outages return explicitly labelled fallback estimates; routing failure returns 503.",
        "- Valid results were retrieved from route history and one saved record was verified after restarting the Go server.",
        "",
        "## Limits and findings",
        "",
        f"- Python model mode: `{health['model_mode']}`. No trained landslide/flood model was used; these tests cannot establish ML accuracy.",
        "- A high final score is a relative weighted ranking, not a probability of safe arrival. No maximum hazard veto exists for fastest priority.",
        "- Truck dimensions are sent in requests but the custom mock router does not enforce map clearances. Actual truck clearance needs the ORS profile and verified restrictions.",
        "- The terrain adapter reports its Open-Meteo/Copernicus source label even when pointed at a mock URL. All terrain in THIS test is synthetic; the hard-coded source label needs improvement for configurable providers.",
        "- Weather failure uses missing-feature warnings and a heuristic fallback; it does not produce a real forecast.",
        "- PostgreSQL, Docker deployment, multi-user accounts, production load, real road closures and hazard-model calibration were not verified by these 15 scenarios.",
        "",
        "## Files",
        "",
        "- `mock-data.json`: the 15 requests and all fabricated route features.",
        "- `actual-results.json`: raw API responses, checks, timings and mock-provider call traces.",
        "- `backend-test-results.md`: this readable report.",
        "",
        "## Failed checks",
        "",
    ]
    failures = [
        f"- Scenario {r['id']}: {name}"
        for r in results
        for name, ok in r["checks"].items()
        if not ok
    ]
    lines += failures or ["None."]
    (output / "backend-test-results.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", default="go")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    cases = scenarios()
    (args.output / "mock-data.json").write_text(
        json.dumps(
            {
                "data_kind": "synthetic",
                "purpose": "software functional testing only",
                "scenarios": cases,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    server = ThreadingHTTPServer(("127.0.0.1", 0), MockProvider)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    mock_url = f"http://127.0.0.1:{server.server_port}"
    results = []
    python_process = go_process = None
    try:
        with tempfile.TemporaryDirectory(prefix="ner-15-scenarios-") as temp:
            temp = Path(temp)
            binary = temp / ("server.exe" if os.name == "nt" else "server")
            subprocess.run(
                [args.go, "build", "-o", str(binary), "./cmd/server"],
                cwd=ROOT / "backend/go",
                check=True,
                timeout=180,
                creationflags=flags,
            )
            with (
                (temp / "python.log").open("w+") as pylog,
                (temp / "go.log").open("w+") as golog,
            ):
                try:
                    python_port = smoke.free_port()
                    python_url = f"http://127.0.0.1:{python_port}"
                    python_env = {
                        **os.environ,
                        "MODEL_MODE": "heuristic",
                        "PYTHON_HOST": "127.0.0.1",
                        "PYTHON_PORT": str(python_port),
                    }
                    python_process = subprocess.Popen(
                        [sys.executable, "-m", "app.main"],
                        cwd=ROOT / "backend/python",
                        env=python_env,
                        stdout=pylog,
                        stderr=subprocess.STDOUT,
                        creationflags=flags,
                    )
                    health = smoke.wait_ready(python_process, python_url + "/health")
                    saved = None
                    for case in cases:
                        MockProvider.scenario = copy.deepcopy(case)
                        MockProvider.calls = []
                        port = smoke.free_port()
                        go_url = f"http://127.0.0.1:{port}"
                        env = {
                            **os.environ,
                            "GO_HOST": "127.0.0.1",
                            "GO_PORT": str(port),
                            "NER_ENV": "development",
                            "NER_DEMO_MODE": "false",
                            "API_TOKEN": "",
                            "DATABASE_URL": "",
                            "DATA_PATH": str(temp / "history.db"),
                            "ROUTING_PROVIDER": "custom",
                            "ROUTING_SERVICE_URL": mock_url,
                            "WEATHER_PROVIDER": "custom",
                            "WEATHER_SERVICE_URL": mock_url,
                            "TERRAIN_URL": mock_url,
                            "GEOCODING_URL": mock_url,
                            "MAP_API_KEY": "",
                            "WEATHER_API_KEY": "",
                            "ROAD_HAZARD_DATA_PATH": "",
                            "ROAD_HAZARD_DATA_URL": mock_url + "/feed"
                            if case["fault"] in ("close_a", "close_all")
                            else "",
                            "PYTHON_SERVICE_URL": mock_url + "/python-offline"
                            if case["fault"] == "python_down"
                            else python_url,
                            "PYTHON_TIMEOUT_SECONDS": "1",
                        }
                        go_process = subprocess.Popen(
                            [str(binary)],
                            cwd=ROOT,
                            env=env,
                            stdout=golog,
                            stderr=subprocess.STDOUT,
                            creationflags=flags,
                        )
                        smoke.wait_ready(go_process, go_url + "/health/ready")
                        status, body, elapsed = http(
                            go_url + "/api/v1/routes/analyze", case["request"]
                        )
                        checks = verify(case, status, body)
                        if status == 200:
                            history_status, record, _ = http(
                                go_url + "/api/v1/analyses/" + body["request_id"]
                            )
                            checks["history_round_trip"] = (
                                history_status == 200 and record["response"] == body
                            )
                            if saved is None:
                                saved = body
                            elif case["id"] == "02":
                                old_status, old_record, _ = http(
                                    go_url + "/api/v1/analyses/" + saved["request_id"]
                                )
                                checks["history_survives_restart"] = (
                                    old_status == 200
                                    and old_record["response"] == saved
                                )
                        if case["id"] == "07" and status == 200:
                            checks["motorcycle_rain_penalty"] = (
                                body["routes"][0]["accessibility_score"]
                                < results[5]["response"]["routes"][0][
                                    "accessibility_score"
                                ]
                            )
                        item = {
                            "id": case["id"],
                            "name": case["name"],
                            "expected_status": case["expected_status"],
                            "expected_winner": case["expected_winner"],
                            "actual_status": status,
                            "elapsed_ms": elapsed,
                            "passed": all(checks.values()),
                            "checks": checks,
                            "response": body,
                            "provider_calls": copy.deepcopy(MockProvider.calls),
                        }
                        results.append(item)
                        print(
                            f"{case['id']} {'PASS' if item['passed'] else 'FAIL'} HTTP {status} winner={body.get('recommended_route_id', '-')} {case['name']}",
                            flush=True,
                        )
                        smoke.stop(go_process)
                    artifact = {
                        "data_kind": "synthetic",
                        "executed_at": datetime.now(timezone.utc).isoformat(),
                        "python_health": health,
                        "passed": sum(r["passed"] for r in results),
                        "total": len(results),
                        "results": results,
                    }
                    (args.output / "actual-results.json").write_text(
                        json.dumps(artifact, indent=2, allow_nan=False) + "\n",
                        encoding="utf-8",
                    )
                    report(results, health, args.output)
                except Exception:
                    for label, file in (("Python", pylog), ("Go", golog)):
                        file.seek(0)
                        print(f"{label} logs:\n{file.read()[-6000:]}", file=sys.stderr)
                    raise
                finally:
                    smoke.stop(go_process)
                    smoke.stop(python_process)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    print(f"Results: {args.output}")
    return 0 if all(r["passed"] for r in results) and len(results) == 15 else 1


if __name__ == "__main__":
    raise SystemExit(main())
