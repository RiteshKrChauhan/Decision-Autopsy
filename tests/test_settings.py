from __future__ import annotations

from pathlib import Path

from app.core import settings as settings_module


def test_get_settings_uses_decision_autopsy_env(monkeypatch) -> None:
    settings_module.get_settings.cache_clear()
    monkeypatch.setenv("DECISION_AUTOPSY_API_KEY", "decision-key")
    monkeypatch.setenv("DECISION_AUTOPSY_MODEL", "decision-model")
    monkeypatch.delenv("ABBY_API_KEY", raising=False)
    monkeypatch.delenv("ABBY_MODEL", raising=False)

    settings = settings_module.get_settings()

    assert settings.api_key == "decision-key"
    assert settings.model == "decision-model"


def test_get_settings_falls_back_to_abby_env(monkeypatch) -> None:
    settings_module.get_settings.cache_clear()
    monkeypatch.delenv("DECISION_AUTOPSY_API_KEY", raising=False)
    monkeypatch.delenv("DECISION_AUTOPSY_MODEL", raising=False)
    monkeypatch.setenv("ABBY_API_KEY", "abby-key")
    monkeypatch.setenv("ABBY_MODEL", "abby-model")

    settings = settings_module.get_settings()

    assert settings.api_key == "abby-key"
    assert settings.model == "abby-model"


def test_load_local_env_reads_repo_env(monkeypatch, tmp_path) -> None:
    settings_module.get_settings.cache_clear()
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "DECISION_AUTOPSY_API_KEY=file-key",
                "DECISION_AUTOPSY_MODEL=file-model",
            ]
        ),
        encoding="utf-8",
    )

    monkeypatch.delenv("DECISION_AUTOPSY_API_KEY", raising=False)
    monkeypatch.delenv("DECISION_AUTOPSY_MODEL", raising=False)
    monkeypatch.setattr(settings_module, "_repo_root", lambda: Path(tmp_path))

    settings = settings_module.get_settings()

    assert settings.api_key == "file-key"
    assert settings.model == "file-model"
