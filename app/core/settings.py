from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _split_origins(raw_value: str | None) -> list[str]:
    if not raw_value:
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    api_key: str = os.getenv("DECISION_AUTOPSY_API_KEY", "")
    base_url: str = os.getenv(
        "DECISION_AUTOPSY_BASE_URL", "https://api.abby.abb.com/api/v1/developers"
    )
    model: str = os.getenv("DECISION_AUTOPSY_MODEL", "claude-4.5-sonnet")
    timeout_seconds: float = float(
        os.getenv("DECISION_AUTOPSY_TIMEOUT_SECONDS", "60")
    )
    debug_raw_text: bool = os.getenv(
        "DECISION_AUTOPSY_DEBUG_RAW_TEXT", "false"
    ).lower() in {"1", "true", "yes", "on"}
    frontend_origins: list[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "frontend_origins",
            _split_origins(os.getenv("DECISION_AUTOPSY_FRONTEND_ORIGINS")),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
