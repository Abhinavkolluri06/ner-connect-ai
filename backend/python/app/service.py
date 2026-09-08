import logging

from app.config import Settings
from app.risk.engine import HeuristicRiskEngine, RiskEngine
from app.schemas import Analysis, RiskRequest, RiskResponse

logger = logging.getLogger("ner.intelligence")


class RiskService:
    def __init__(self, settings: Settings, engine: RiskEngine | None = None):
        self.settings = settings
        self.fallback_reason: str | None = None
        if engine is not None:
            self.engine = engine
        elif settings.model_mode == "heuristic":
            self.engine = HeuristicRiskEngine()
        else:
            from app.risk.ml import MLRiskEngine

            try:
                self.engine = MLRiskEngine.from_settings(settings)
            except Exception as exc:
                if not settings.allow_model_fallback:
                    raise RuntimeError("ML initialization failed; fallback is disabled") from exc
                logger.warning("fallback used", extra={"error_type": type(exc).__name__})
                self.engine = HeuristicRiskEngine()
                self.fallback_reason = "ML initialization failed; heuristic fallback active."
        logger.info("risk engine selected", extra={"model_mode": self.engine.mode})

    def analyze(self, request: RiskRequest) -> Analysis:
        try:
            analysis = self.engine.analyze(request)
            # Validate inside the fallback boundary, including custom engines.
            RiskResponse.model_validate(analysis.response.model_dump())
            if analysis.response.route_id != request.route_id:
                raise ValueError("Engine returned a different route ID")
        except Exception as exc:
            if self.engine.mode != "ml" or not self.settings.allow_model_fallback:
                raise
            logger.warning("fallback used", extra={"error_type": type(exc).__name__})
            analysis = HeuristicRiskEngine().analyze(request)
            analysis.explanation.warnings.append(
                "ML inference failed for this request; heuristic fallback used."
            )
        if self.fallback_reason:
            analysis.explanation.warnings.append(self.fallback_reason)
        return analysis
