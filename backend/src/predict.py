import numpy as np
import joblib
import json

class RouteReliabilityPredictor:
    def __init__(self):
        model_dir = 'models/saved_models/'
        self.model = joblib.load(model_dir + 'road_hazard_xgboost.pkl')
        self.scaler = joblib.load(model_dir + 'scaler.pkl')
        self.encoder_lulc = joblib.load(model_dir + 'encoder_lulc_type.pkl')
        self.encoder_road = joblib.load(model_dir + 'encoder_road_class.pkl')
        with open(model_dir + 'feature_columns.json', 'r') as f:
            self.features = json.load(f)
    
    def predict_segment(self, slope_deg, elevation_m, rainfall_24h_mm, rainfall_72h_antecedent_mm,
                        isro_landslide_susceptibility, lulc_type, road_class, distance_to_drainage_km):
        lulc = self.encoder_lulc.transform([lulc_type])[0]
        road = self.encoder_road.transform([road_class])[0]
        X = np.array([[slope_deg, elevation_m, rainfall_24h_mm, rainfall_72h_antecedent_mm,
                       isro_landslide_susceptibility, lulc, road, distance_to_drainage_km]])
        X_scaled = self.scaler.transform(X)
        prob = self.model.predict_proba(X_scaled)[0][1]
        return {
            'is_hazard': bool(prob > 0.5),
            'hazard_probability': float(prob),
            'reliability_score': int((1 - prob) * 100)
        }
    
    def score_route(self, segments):
        scores = [self.predict_segment(**seg)['reliability_score'] for seg in segments]
        R_max = 1 - min(scores) / 100
        R_avg = 1 - np.mean(scores) / 100
        road_factor = 0.8 if any(s < 50 for s in scores) else 1.0
        reliability = 100 * (R_max ** 1.5) * (R_avg ** 0.5) * road_factor
        return {
            'reliability_score': int(max(0, min(100, reliability))),
            'segment_scores': scores
        }