from typing import List

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from src.predict import RouteReliabilityPredictor

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
predictor = RouteReliabilityPredictor()


class SegmentFeatures(BaseModel):
    slope_deg: float
    elevation_m: float
    rainfall_24h_mm: float
    rainfall_72h_antecedent_mm: float
    isro_landslide_susceptibility: int
    lulc_type: str
    road_class: str
    distance_to_drainage_km: float


class RouteRequest(BaseModel):
    origin: str
    destination: str
    vehicle_type: str
    cargo_type: str
    priority: str
    segments: List[SegmentFeatures] = Field(min_length=1, max_length=1000)


@app.get("/")
async def root():
    return {"message": "NER-Connect AI API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/v1/predict-segment")
def predict_segment(f: SegmentFeatures):
    # FastAPI runs synchronous CPU work in its threadpool, not on the event loop.
    return predictor.predict_segment(**f.model_dump())


@app.post("/api/v1/score-route")
def score_route(req: RouteRequest):
    segs = [s.model_dump() for s in req.segments]
    result = predictor.score_route(segs)
    result["priority"] = req.priority
    result["recommendation"] = (
        "⚠️ Hazard detected" if result["reliability_score"] < 60 else "✅ Safe"
    )
    return result


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
