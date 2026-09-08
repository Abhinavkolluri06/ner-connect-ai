"""Generate labelled synthetic inputs, never expected winners or training labels."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = {
    "data_kind": "synthetic", "origin": "Guwahati", "destination": "Shillong",
    "vehicle": "car", "cargo": "general", "priority": "normal", "max_hazard_index": 0.8,
    "routes": [
        {"route_id": "A", "distance_km": 70, "eta_minutes": 90, "rainfall_mm": 110,
         "slope_deg": 42, "elevation_m": 1200, "historical_landslides": 9, "road_condition_score": 30},
        {"route_id": "B", "distance_km": 100, "eta_minutes": 125, "rainfall_mm": 10,
         "slope_deg": 8, "elevation_m": 1200, "historical_landslides": 0, "road_condition_score": 92},
        {"route_id": "C", "distance_km": 85, "eta_minutes": 110, "rainfall_mm": 55,
         "slope_deg": 25, "elevation_m": 1200, "historical_landslides": 3, "road_condition_score": 70},
    ],
}


def build():
    cases = []
    descriptions = [
        "Emergency medicine delivery", "Fastest with hazard filtering", "Safest route",
        "Normal priority", "All routes dry and in good condition", "Heavy rain on B",
        "B closed", "B and C closed; A exceeds hazard limit", "All roads closed",
        "Truck prohibited on B", "Motorcycle on wet roads", "Car on the same wet roads",
        "Food delivery", "Agricultural produce delivery", "Construction material delivery",
        "Passenger transport", "Ambulance follows road closures", "Reported traffic delay on B",
        "Improved road A changes the inputs", "B deteriorates and C improves",
        "Strict hazard limit", "Relaxed hazard limit exposes fastest trade-off",
        "Only two supplied alternatives", "Compare five alternatives", "Compare 25 alternatives",
    ]
    for index, description in enumerate(descriptions, 1):
        c = copy.deepcopy(BASE)
        c.update(scenario_id=f"scenario-{index:02d}", description=description)
        a, b, third = c["routes"]
        if index == 1:
            c.update(vehicle="truck", cargo="medical_supplies", priority="emergency")
        elif index == 2:
            c["priority"] = "fastest"
        elif index == 3:
            c["priority"] = "safest"
        elif index == 5:
            for r in c["routes"]:
                r.update(rainfall_mm=0, slope_deg=3, historical_landslides=0, road_condition_score=95)
        elif index == 6:
            b["rainfall_mm"] = 140
        elif index in (7, 8, 9):
            b["closed"] = True
            if index >= 8:
                third["closed"] = True
            if index == 9:
                a["closed"] = True
        elif index == 10:
            c["vehicle"] = "truck"
            b["blocked_vehicles"] = ["truck"]
        elif index in (11, 12):
            c["vehicle"] = "motorcycle" if index == 11 else "car"
            for r in c["routes"]:
                r.update(rainfall_mm=36, slope_deg=5, historical_landslides=0, road_condition_score=90)
        elif index in (13, 14, 15, 16):
            c["cargo"] = {13: "food", 14: "agricultural_produce", 15: "construction_materials", 16: "passengers"}[index]
        elif index == 17:
            c.update(vehicle="ambulance", cargo="emergency_equipment", priority="emergency")
            b["closed"] = True
        elif index == 18:
            c["priority"] = "fastest"
            b["delay_minutes"] = 90
        elif index == 19:
            a.update(rainfall_mm=0, slope_deg=2, historical_landslides=0, road_condition_score=99)
        elif index == 20:
            b.update(rainfall_mm=95, slope_deg=40, historical_landslides=9, road_condition_score=25)
            third.update(rainfall_mm=0, slope_deg=3, historical_landslides=0, road_condition_score=98)
        elif index == 21:
            c["max_hazard_index"] = 0.1
        elif index == 22:
            c.update(max_hazard_index=1.0, priority="fastest")
        elif index == 23:
            c["routes"] = [b, third]
        elif index in (24, 25):
            count = 5 if index == 24 else 25
            c["routes"] = []
            for j in range(count):
                r = copy.deepcopy(b)
                r.update(route_id=f"candidate-{j+1:02d}", distance_km=80+j*3,
                    eta_minutes=100+j*2, rainfall_mm=(j*13) % 100, slope_deg=(j*7) % 40,
                    historical_landslides=j % 5, road_condition_score=95-(j % 8)*5)
                c["routes"].append(r)
        cases.append(c)
    return cases


if __name__ == "__main__":
    folder = ROOT / "examples" / "route-comparison"
    folder.mkdir(parents=True, exist_ok=True)
    cases = build()
    for name, data in (("25-scenarios.json", {"scenarios": cases}), ("single-trip.json", cases[0])):
        path = folder / name
        with path.open("x", encoding="utf-8") as file:
            json.dump(data, file, indent=2, allow_nan=False)
            file.write("\n")
        print(path)
