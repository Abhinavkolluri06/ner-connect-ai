"""Run real local services, prove their HTTP contract, then stop Python to test Go fallback.

Uses temporary compiled output and owns/cleans only the processes it starts.
Run with the Python service virtual environment. No internet or hazard data needed.
"""

import argparse
import json
import math
import os
import socket
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def fetch(url, payload=None):
    req = Request(
        url,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urlopen(req, timeout=45) as response:
        assert response.status == 200
        return json.load(response)


def wait_ready(process, url):
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Service exited before readiness; inspect process logs")
        try:
            return fetch(url)
        except (URLError, TimeoutError):
            time.sleep(0.1)
    raise TimeoutError("Service failed to start within 20 seconds")


def stop(process):
    if process and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", default="go", help="Go executable (optional absolute path)")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--live-providers", action="store_true", help="Also test actual public OSRM and Open-Meteo APIs; requires internet")
    args = parser.parse_args()
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    with tempfile.TemporaryDirectory(prefix="ner-python-go-") as scratch:
        scratch = Path(scratch)
        binary = scratch / ("go-server.exe" if os.name == "nt" else "go-server")
        subprocess.run(
            [args.go, "build", "-o", str(binary), "./cmd/server"],
            cwd=ROOT / "backend" / "go",
            check=True,
            timeout=120,
            creationflags=flags,
        )
        python_process = go_process = None
        with (
            (scratch / "python.log").open("w+") as python_log,
            (scratch / "go.log").open("w+") as go_log,
        ):
            try:
                python_port, go_port = free_port(), free_port()
                while go_port == python_port:
                    go_port = free_port()
                python_url, go_url = (
                    f"http://127.0.0.1:{python_port}",
                    f"http://127.0.0.1:{go_port}",
                )
                python_env = {
                    **os.environ,
                    "PYTHON_HOST": "127.0.0.1",
                    "PYTHON_PORT": str(python_port),
                    "MODEL_MODE": "heuristic",
                }
                python_process = subprocess.Popen(
                    [sys.executable, "-m", "app.main"],
                    cwd=ROOT / "backend" / "python",
                    env=python_env,
                    stdout=python_log,
                    stderr=subprocess.STDOUT,
                    creationflags=flags,
                )
                health = wait_ready(python_process, python_url + "/health")
                payload = json.loads(
                    (ROOT / "shared" / "schemas" / "risk-request.example.json").read_text()
                )
                risk = fetch(python_url + "/internal/v1/risk/analyze", payload)
                assert risk["route_id"] == payload["route_id"] and risk["model_mode"] == "heuristic"
                for key in (
                    "landslide_risk",
                    "flood_risk",
                    "weather_risk",
                    "accessibility_score",
                    "confidence",
                ):
                    assert math.isfinite(risk[key]) and 0 <= risk[key] <= 1
                durations = []
                for _ in range(20):
                    start = time.perf_counter()
                    fetch(python_url + "/internal/v1/risk/analyze", payload)
                    durations.append((time.perf_counter() - start) * 1000)
                go_env = {
                    **os.environ,
                    "GO_PORT": str(go_port),
                    "GO_HOST": "127.0.0.1",
                    "NER_ENV": "development",
                    "API_TOKEN": "",
                    "DATABASE_URL": "",
                    "DATA_PATH": str(scratch / "history.db"),
                    "ROAD_HAZARD_DATA_PATH": "",
                    "ROAD_HAZARD_DATA_URL": "",
                    "NER_DEMO_MODE": "true",
                    "PYTHON_SERVICE_URL": python_url,
                    "PYTHON_TIMEOUT_SECONDS": "1",
                }
                go_process = subprocess.Popen(
                    [str(binary)],
                    env=go_env,
                    stdout=go_log,
                    stderr=subprocess.STDOUT,
                    creationflags=flags,
                )
                wait_ready(go_process, go_url + "/health/live")
                route_request = {
                    "origin": "Guwahati",
                    "destination": "Shillong",
                    "vehicle": "truck",
                    "cargo": "medical_supplies",
                    "priority": "emergency",
                }
                connected = fetch(go_url + "/api/v1/routes/analyze", route_request)
                assert connected["intelligence_mode"] == "live", connected
                assert len(connected["routes"]) == 3
                assert connected["recommended_route_id"] == "route-b"
                assert connected["persisted"]
                saved_id = connected["request_id"]
                assert fetch(go_url + "/api/v1/analyses/" + saved_id)["request_id"] == saved_id
                assert len(fetch(go_url + "/api/v1/locations")["locations"]) == 20
                access = fetch(go_url + "/api/v1/locations/shillong/accessibility", {
                    "origin":"Guwahati", "vehicle":"car", "cargo":"general", "priority":"normal"
                })
                assert access["scale"] == "0-100" and 0 <= access["accessibility_score"] <= 100
                stop(python_process)
                fallback = fetch(go_url + "/api/v1/routes/analyze", route_request)
                assert fallback["intelligence_mode"] == "fallback"
                assert fallback["warnings"] and len(fallback["routes"]) == 3
                stop(go_process)
                go_process = subprocess.Popen([str(binary)], env=go_env, stdout=go_log,
                    stderr=subprocess.STDOUT, creationflags=flags)
                wait_ready(go_process, go_url + "/health/ready")
                assert fetch(go_url + "/api/v1/analyses/" + saved_id)["response"] == connected
                real_routes = None
                if args.live_providers:
                    stop(go_process)
                    live_env = {**go_env, "NER_DEMO_MODE":"false", "ROUTING_PROVIDER":"osrm",
                        "WEATHER_PROVIDER":"openmeteo", "ROUTING_SERVICE_URL":"https://router.project-osrm.org",
                        "WEATHER_SERVICE_URL":"https://api.open-meteo.com", "TERRAIN_URL":"https://api.open-meteo.com"}
                    go_process = subprocess.Popen([str(binary)], env=live_env, stdout=go_log,
                        stderr=subprocess.STDOUT, creationflags=flags)
                    wait_ready(go_process, go_url + "/health/ready")
                    real_routes = fetch(go_url + "/api/v1/routes/analyze", {**route_request,"vehicle":"car"})
                    assert real_routes["persisted"] and real_routes["routes"]
                    for route in real_routes["routes"]:
                        assert len(route["geojson"]["coordinates"]) > 2
                        assert route["data_quality"]["weather_source"].startswith("Open-Meteo")
                        assert route["data_quality"]["terrain_source"].startswith("Open-Meteo")
                        assert route["model_mode"] == "heuristic"
                result = {
                    "python_health": health,
                    "python_risk_response": risk,
                    "go_python_connected": connected,
                    "go_python_unavailable": fallback,
                    "latency": {
                        "samples": len(durations),
                        "scope": "local HTTP, single segment, heuristic",
                        "median_ms": statistics.median(durations),
                        "p95_ms": sorted(durations)[18],
                    },
                    "status": "passed",
                    "history_restart": "passed",
                    "accessibility": "passed",
                    "live_providers": real_routes,
                }
                print(json.dumps({
                    "status": result["status"], "history_restart": result["history_restart"],
                    "accessibility": result["accessibility"], "python_mode": health["model_mode"],
                    "demo_recommended_route": connected["recommended_route_id"],
                    "fallback_recommended_route": fallback["recommended_route_id"],
                    "live_route_count": len(real_routes["routes"]) if real_routes else None,
                    "live_geometry_points": [len(r["geojson"]["coordinates"]) for r in real_routes["routes"]] if real_routes else [],
                    "latency": result["latency"],
                    "full_result_path": str(args.output) if args.output else None,
                }, indent=2))
                if args.output:
                    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
            except Exception:
                for label, file in (("Python", python_log), ("Go", go_log)):
                    file.seek(0)
                    print(f"{label} process log:\n{file.read()[-8000:]}", file=sys.stderr)
                raise
            finally:
                stop(python_process)
                stop(go_process)


if __name__ == "__main__":
    main()
