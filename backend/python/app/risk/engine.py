from typing import Protocol

from app.risk.aggregation import aggregate
from app.risk.heuristics import segment_risk
from app.risk.parameters import PARAMETERS
from app.schemas import Analysis, Mode, RiskRequest

HEURISTIC_WARNINGS = [
    "Heuristic susceptibility indices are unvalidated, not event probabilities.",
    "Rainfall window/source must be consistent; neither is encoded by the Go contract.",
    "River distance, drainage, soil moisture and event timing are unavailable.",
    "Accessibility uses terrain/road proxies; vehicle-specific labels are unavailable.",
]


class RiskEngine(Protocol):
    mode: Mode
    version: str
    landslide_model_ready: bool
    flood_model_ready: bool

    def analyze(self, request: RiskRequest) -> Analysis: ...


class HeuristicRiskEngine:
    mode: Mode = "heuristic"
    version = PARAMETERS.version
    landslide_model_ready = False
    flood_model_ready = False

    def analyze(self, request: RiskRequest) -> Analysis:
        segments = [segment_risk(segment) for segment in request.segments]
        return aggregate(request, segments, self.mode, self.version, list(HEURISTIC_WARNINGS))
