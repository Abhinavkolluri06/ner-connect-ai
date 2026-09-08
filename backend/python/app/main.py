import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect

from app.config import Settings
from app.risk.engine import RiskEngine
from app.schemas import Explanation, RiskRequest, RiskResponse
from app.service import RiskService

logger = logging.getLogger("ner.intelligence")


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        fields = {"level": record.levelname.lower(), "event": record.getMessage()}
        for key in ("request_id", "model_mode", "duration_ms", "segment_count", "error_type"):
            if hasattr(record, key):
                fields[key] = getattr(record, key)
        return json.dumps(fields)


def error_response(status: int, code: str, message: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "request_id": request_id}},
    )


def create_app(settings: Settings | None = None, engine: RiskEngine | None = None) -> FastAPI:
    config = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.service = RiskService(config, engine)
        yield

    app = FastAPI(title="NER-Connect internal intelligence", version="1.0.0", lifespan=lifespan)

    @app.middleware("http")
    async def request_boundary(request: Request, call_next):
        request_id = str(uuid4())
        request.state.request_id = request_id
        started = time.perf_counter()
        logger.info("request received", extra={"request_id": request_id})
        response = None
        try:
            if request.method == "POST":
                body = bytearray()
                async with asyncio.timeout(10):
                    async for chunk in request.stream():
                        if len(body) + len(chunk) > config.max_request_bytes:
                            response = error_response(
                                413,
                                "REQUEST_TOO_LARGE",
                                "Request body exceeds the size limit.",
                                request_id,
                            )
                            break
                        body.extend(chunk)
                # Starlette caches this body for the downstream FastAPI parser.
                request._body = bytes(body)
            if response is None:
                response = await call_next(request)
        except TimeoutError:
            response = error_response(408, "REQUEST_TIMEOUT", "Request body timed out.", request_id)
        except ClientDisconnect:
            response = error_response(
                400, "REQUEST_DISCONNECTED", "Request body was incomplete.", request_id
            )
        except Exception as exc:
            logger.error(
                "inference failed",
                extra={"request_id": request_id, "error_type": type(exc).__name__},
            )
            response = error_response(
                500, "INFERENCE_FAILED", "Intelligence could not be computed.", request_id
            )
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "response complete",
            extra={
                "request_id": request_id,
                "duration_ms": round((time.perf_counter() - started) * 1000, 3),
            },
        )
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, _exc: RequestValidationError):
        # Do not serialize rejected NaN/Infinity or leak raw route features in errors.
        return error_response(
            422,
            "INVALID_RISK_REQUEST",
            "Request does not match the risk schema.",
            request.state.request_id,
        )

    @app.get("/health")
    def health(request: Request):
        service = request.app.state.service
        return {
            "status": "degraded" if service.fallback_reason else "ok",
            "service": "ner-connect-python",
            "model_mode": service.engine.mode,
            "model_version": service.engine.version,
            "landslide_model_ready": service.engine.landslide_model_ready,
            "flood_model_ready": service.engine.flood_model_ready,
            "fallback_reason": service.fallback_reason,
            "confidence_meaning": "Input completeness only; not prediction confidence.",
        }

    async def run_analysis(payload: RiskRequest, request: Request):
        logger.info("validation complete", extra={"request_id": request.state.request_id})
        logger.info("feature generation complete", extra={"segment_count": len(payload.segments)})
        result = await run_in_threadpool(request.app.state.service.analyze, payload)
        logger.info("inference complete", extra={"model_mode": result.response.model_mode})
        return result

    @app.post("/internal/v1/risk/analyze", response_model=RiskResponse)
    async def analyze(payload: RiskRequest, request: Request):
        return (await run_analysis(payload, request)).response

    @app.post("/internal/v1/risk/explain", response_model=Explanation)
    async def explain(payload: RiskRequest, request: Request):
        return (await run_analysis(payload, request)).explanation

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = Settings.from_env()
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    logger.setLevel(settings.log_level.upper())
    uvicorn.run(
        app, host=settings.python_host, port=settings.python_port, log_level=settings.log_level
    )
