# Compare routes from a JSON file

This workflow is fully offline. It uses the existing Go heuristic and ranking
engine, not a trained ML model. No Python service, API key, database or web server
is needed. It does not replace your input with demo routes or live weather.

## Run on this Windows computer

Open PowerShell:

```powershell
cd C:\ner-connect-ai
.\scripts\compare-routes.ps1```powershell
cd C:\ner-connect-ai
.\scripts\compare-routes.ps1
```

At the prompt paste this path (no quotes required):

```text
C:\ner-connect-ai\examples\route-comparison\25-scenarios.json
```

Or run a single trip directly:

```powershell
.\scripts\compare-routes.ps1 -FilePath "C:\ner-connect-ai\examples\route-comparison\single-trip.json"
```

The console prints all eligible routes, scores, distances, ETAs, the winner and
excluded routes with reasons. Full JSON results are saved beside the input with a
timestamp in the filename. Your input is not changed. `-OutputPath` selects a new
output filename; existing outputs are never overwritten.

The local binary is supplied on this machine, but ignored by Git. On another
machine install Go 1.25+; the script builds the executable if it is missing.
After changing backend code run with `-Rebuild`. If needed, supply
`-GoExecutable "C:\path\to\go.exe"`. Do not use a stale binary after source edits.

Cross-platform source command:

```sh
cd backend/go
go run ./cmd/compare -file ../../examples/route-comparison/25-scenarios.json
```

## What the files contain

- `single-trip.json`: one comparison containing three candidate routes.
- `25-scenarios.json`: 25 independent comparisons, including rain, closures,
  vehicle restrictions, cargo, delays and changed road conditions. The final
  scenario compares 25 routes against each other.
- All example conditions and paths are SYNTHETIC. They are not observed NER data.
- No expected winners or precomputed scores appear in the input files.

For your own file, copy `single-trip.json`, change the values and run its path.
All alternatives in one scenario must connect the SAME origin and destination.
Do not compare unrelated trips against each other. A batch has the shape
`{"scenarios": [first_comparison, second_comparison]}` (1–100 scenarios).

## Input meaning

Each comparison requires `vehicle`, `cargo`, `priority`, and `routes` (2–25).
Optional metadata: `scenario_id`, `description`, `origin`, `destination`, and
`data_kind` (`synthetic` or `user_supplied`). If omitted, data kind is user supplied.

Each route requires `route_id`, `distance_km`, `eta_minutes`, `rainfall_mm`,
`slope_deg`, `elevation_m`, `historical_landslides`, and `road_condition_score`.
Zero is allowed for rain/history/slope; missing or null values are rejected rather
than silently treated as zero. Road quality uses 0–100, with higher being better.
Use the SAME 24-hour rainfall window and consistent history definition for every
candidate. These flat features summarize a route; they are not a segment survey.

Optional route fields:

- `closed: true`: always excludes the route.
- `blocked_vehicles: ["truck"]`: excludes it for that vehicle.
- `delay_minutes: 45`: adds a supplied delay to ETA; delay is not predicted.

Vehicles: car, truck, motorcycle, ambulance. Cargo: general, food,
medical_supplies, passengers, emergency_equipment, construction_materials,
agricultural_produce. Produce uses the food policy; construction uses general.
Priorities: normal, fastest, safest, emergency.

## How the winner is calculated

1. Validate the supplied fields and unique route IDs.
2. Calculate rule-based landslide, flood, rainfall and accessibility indices.
3. Exclude closed/prohibited routes and those whose highest hazard index exceeds
   `max_hazard_index` (default 0.8). This applies even to fastest priority.
4. Rank the remaining routes using the existing priority/cargo/vehicle policies.
5. Return the highest score with an explanation and component contributions.

The hazard limit is a configurable DEMO POLICY, not a scientifically validated
safety cutoff. Setting it to 1 permits all numerical hazard levels (closures and
vehicle bans still apply). Scenario 22 deliberately demonstrates the risk of
that choice. If all routes fail, status is `no_eligible_routes`, not a fake winner.

Scores are 0–1 in JSON and displayed as 0–100 in the terminal. They are not
probabilities of safe arrival. ETA/distance normalization is relative to eligible
candidates, so scores from different scenarios are not directly comparable.
Ties at displayed precision retain input order and emit a warning.

This CLI does not save to the server's analysis-history database. Its audit output
is the JSON result file. There is no live vehicle tracking or photo upload in this
file-comparison workflow; those remain separate implementation work.

## Optional HTTP usage

When the existing Go server is running, send the contents of `single-trip.json`
to `POST /api/v1/routes/compare`. This endpoint uses the same engine as the CLI,
without routing/weather/Python calls. Supply the server's bearer token if enabled.
It returns 200 for a recommendation, 422 when all candidates are excluded, and
400 for invalid input. Do not send a filesystem path to the API: the client reads
the file and sends its JSON contents.

```powershell
$body = Get-Content .\examples\route-comparison\single-trip.json -Raw
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/v1/routes/compare -ContentType 'application/json' -Body $body
```
