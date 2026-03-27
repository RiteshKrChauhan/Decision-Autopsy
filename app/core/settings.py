from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_local_env() -> None:
    env_path = _repo_root() / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if not key:
            continue

        if value.startswith(("\"", "'")) and value.endswith(("\"", "'")) and len(value) >= 2:
            value = value[1:-1]

        os.environ.setdefault(key, value)


def _apply_legacy_fallbacks() -> None:
    if not os.getenv("DECISION_AUTOPSY_API_KEY") and os.getenv("ABBY_API_KEY"):
        os.environ["DECISION_AUTOPSY_API_KEY"] = os.environ["ABBY_API_KEY"]

    if not os.getenv("DECISION_AUTOPSY_MODEL") and os.getenv("ABBY_MODEL"):
        os.environ["DECISION_AUTOPSY_MODEL"] = os.environ["ABBY_MODEL"]

    if not os.getenv("DECISION_AUTOPSY_BASE_URL") and os.getenv("ABBY_BASE_URL"):
        os.environ["DECISION_AUTOPSY_BASE_URL"] = os.environ["ABBY_BASE_URL"]


def _split_origins(raw_value: str | None) -> list[str]:
    if not raw_value:
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


@dataclass(frozen=True)
class Settings:
    api_key: str = field(default_factory=lambda: _env("DECISION_AUTOPSY_API_KEY", ""))
    base_url: str = field(
        default_factory=lambda: _env(
            "DECISION_AUTOPSY_BASE_URL",
            "https://api.abby.abb.com/api/v1/developers",
        )
    )
    model: str = field(default_factory=lambda: _env("DECISION_AUTOPSY_MODEL", "claude-4.5-sonnet"))
    timeout_seconds: float = field(
        default_factory=lambda: float(_env("DECISION_AUTOPSY_TIMEOUT_SECONDS", "60"))
    )
    debug_raw_text: bool = field(
        default_factory=lambda: _env("DECISION_AUTOPSY_DEBUG_RAW_TEXT", "false").lower()
        in {"1", "true", "yes", "on"}
    )
    frontend_origins: list[str] = field(
        default_factory=lambda: _split_origins(_env("DECISION_AUTOPSY_FRONTEND_ORIGINS"))
    )


@lru_cache
def get_settings() -> Settings:
    _load_local_env()
    _apply_legacy_fallbacks()
    return Settings()
