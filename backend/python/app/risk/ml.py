from app.config import Settings
from app.features import segment_to_row
from app.models.artifacts import ArtifactError, LoadedModel, load_artifact
from app.risk.aggregation import aggregate
from app.risk.heuristics import segment_risk
from app.risk.parameters import PARAMETERS, clamp
from app.schemas import Analysis, Mode, RiskRequest


class MLRiskEngine:
    """Only hazard classifiers are ML; weather and accessibility remain rules."""

    mode: Mode = "ml"
    landslide_model_ready = True

    def __init__(self, landslide: LoadedModel, flood: LoadedModel | None = None):
        self.landslide = landslide
        self.flood = flood
        self.flood_model_ready = flood is not None
        self.version = landslide.metadata["model_version"]

    @classmethod
    def from_settings(cls, settings: Settings) -> "MLRiskEngine":
        if settings.landslide_model_path is None:
            raise ArtifactError("ML mode requires a landslide artifact")
        landslide = load_artifact(
            settings.landslide_model_path, "landslide", settings.model_version
        )
        flood = (
            load_artifact(settings.flood_model_path, "flood", settings.model_version)
            if settings.flood_model_path
            else None
        )
        return cls(landslide, flood)

    def analyze(self, request: RiskRequest) -> Analysis:
        rows = [segment_to_row(segment) for segment in request.segments]
        landslides = self.landslide.predict(rows)
        floods = self.flood.predict(rows) if self.flood else None
        segments = []
        for index, segment in enumerate(request.segments):
            baseline = segment_risk(segment)
            land = landslides[index]
            flood = floods[index] if floods is not None else baseline.flood_risk
            a = PARAMETERS.accessibility_weights
            access = clamp(
                a[0] * clamp(segment.road_condition_score / PARAMETERS.road_scale)
                + a[1] * (1 - clamp(segment.slope_deg / PARAMETERS.slope_scale_deg))
                + a[2] * (1 - baseline.weather_risk)
                + a[3] * (1 - max(land, flood))
            )
            segments.append(
                type(baseline)(
                    landslide_risk=land,
                    flood_risk=flood,
                    weather_risk=baseline.weather_risk,
                    accessibility_score=access,
                    landslide_drivers=[],
                    flood_drivers=[] if self.flood else baseline.flood_drivers,
                )
            )
        warnings = [
            "ML estimates susceptibility under the training sampling design, not real-time events.",
            "Weather and accessibility remain heuristic; no SHAP values computed.",
            "Route hazard aggregation is an index, not a calibrated route event probability.",
        ]
        if self.flood is None:
            warnings.append("Flood remains heuristic; no flood artifact is configured.")
        return aggregate(request, segments, self.mode, self.version, warnings)
