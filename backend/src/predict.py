import json

import joblib
import numpy as np


class RouteReliabilityPredictor:
    def __init__(self):
        model_dir = "models/saved_models/"
        self.model = joblib.load(model_dir + "road_hazard_xgboost.pkl")
        self.scaler = joblib.load(model_dir + "scaler.pkl")
        self.encoder_lulc = joblib.load(model_dir + "encoder_lulc_type.pkl")
        self.encoder_road = joblib.load(model_dir + "encoder_road_class.pkl")
        with open(model_dir + "feature_columns.json", "r") as f:
            self.features = json.load(f)

    def predict_segment(
        self,
        slope_deg,
        elevation_m,
        rainfall_24h_mm,
        rainfall_72h_antecedent_mm,
        isro_landslide_susceptibility,
        lulc_type,
        road_class,
        distance_to_drainage_km,
    ):
        return self.predict_segments(
            [
                dict(
                    slope_deg=slope_deg,
                    elevation_m=elevation_m,
                    rainfall_24h_mm=rainfall_24h_mm,
                    rainfall_72h_antecedent_mm=rainfall_72h_antecedent_mm,
                    isro_landslide_susceptibility=isro_landslide_susceptibility,
                    lulc_type=lulc_type,
                    road_class=road_class,
                    distance_to_drainage_km=distance_to_drainage_km,
                )
            ]
        )[0]

    def predict_segments(self, segments):
        if not 1 <= len(segments) <= 1000:
            raise ValueError("Provide 1..1000 segments")
        required = {
            "slope_deg",
            "elevation_m",
            "rainfall_24h_mm",
            "rainfall_72h_antecedent_mm",
            "isro_landslide_susceptibility",
            "lulc_type",
            "road_class",
            "distance_to_drainage_km",
        }
        if any(set(segment) != required for segment in segments):
            raise ValueError("Segment feature contract mismatch")
        lulc = self.encoder_lulc.transform([s["lulc_type"] for s in segments])
        road = self.encoder_road.transform([s["road_class"] for s in segments])
        matrix = np.array(
            [
                [
                    s["slope_deg"],
                    s["elevation_m"],
                    s["rainfall_24h_mm"],
                    s["rainfall_72h_antecedent_mm"],
                    s["isro_landslide_susceptibility"],
                    lulc[i],
                    road[i],
                    s["distance_to_drainage_km"],
                ]
                for i, s in enumerate(segments)
            ]
        )
        probabilities = self.model.predict_proba(self.scaler.transform(matrix))[:, 1]
        return [
            {
                "is_hazard": bool(prob > 0.5),
                "hazard_probability": float(prob),
                "reliability_score": int((1 - prob) * 100),
            }
            for prob in probabilities
        ]

    def score_route(self, segments):
        scores = [result["reliability_score"] for result in self.predict_segments(segments)]
        R_max = 1 - min(scores) / 100
        R_avg = 1 - np.mean(scores) / 100
        road_factor = 0.8 if any(s < 50 for s in scores) else 1.0
        reliability = 100 * (R_max**1.5) * (R_avg**0.5) * road_factor
        return {"reliability_score": int(max(0, min(100, reliability))), "segment_scores": scores}
