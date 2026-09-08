import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    python_host: str = "127.0.0.1"
    python_port: int = Field(default=8001, ge=1, le=65535)
    model_mode: Literal["heuristic", "ml"] = "heuristic"
    allow_model_fallback: bool = True
    landslide_model_path: Path | None = None
    flood_model_path: Path | None = None
    model_version: str | None = None
    log_level: Literal["debug", "info", "warning", "error"] = "info"
    max_request_bytes: int = Field(default=1_048_576, ge=1024, le=10_485_760)

    @classmethod
    def from_env(cls) -> "Settings":
        values = {}
        for name in cls.model_fields:
            value = os.getenv(name.upper())
            if value:
                values[name] = value
        return cls.model_validate(values)
