from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.settings import Settings, get_settings
from app.services.exceptions import AgentExecutionError


class ClaudeCompatibleClient:
    def __init__(
        self,
        *,
        settings: Settings,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings
        self._http_client = http_client

    async def create_message(
        self,
        *,
        system_prompt: str,
        input_payload: dict[str, Any],
    ) -> tuple[str, dict[str, int] | None]:
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": _serialize_input_payload(input_payload),
            },
        ]
        payload = {
            "model": self.settings.model,
            "messages": messages,
            "temperature": 0,
        }
        headers = {"Authorization": f"Bearer {self.settings.api_key}"}

        response = await self._post_with_retry(
            "/chat/completions",
            json=payload,
            headers=headers,
        )

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AgentExecutionError(
                code="provider_http_error",
                message="Provider returned a non-success response.",
                status_code=502,
                details={"status_code": exc.response.status_code},
            ) from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise AgentExecutionError(
                code="provider_invalid_response",
                message="Provider returned non-JSON content.",
                status_code=502,
            ) from exc

        text = _extract_text(data)
        usage = _extract_usage(data)
        return text, usage

    async def get_usage(self) -> dict[str, Any]:
        headers = {"X-ABBY-API-Key": self.settings.api_key}

        response = await self._get_with_retry("/usage", headers=headers)

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AgentExecutionError(
                code="provider_http_error",
                message="Provider returned a non-success response.",
                status_code=502,
                details={"status_code": exc.response.status_code},
            ) from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise AgentExecutionError(
                code="provider_invalid_response",
                message="Provider returned non-JSON content.",
                status_code=502,
            ) from exc

        if not isinstance(data, dict):
            raise AgentExecutionError(
                code="provider_invalid_response",
                message="Provider usage response was not a JSON object.",
                status_code=502,
            )

        return data

    async def _post_with_retry(
        self,
        path: str,
        *,
        json: dict[str, Any],
        headers: dict[str, str],
    ) -> httpx.Response:
        last_exc: httpx.HTTPError | None = None
        for attempt in range(2):
            try:
                if self._http_client is not None:
                    return await self._http_client.post(path, json=json, headers=headers)

                async with httpx.AsyncClient(
                    base_url=self.settings.base_url,
                    timeout=_build_timeout(self.settings.timeout_seconds),
                ) as client:
                    return await client.post(path, json=json, headers=headers)
            except httpx.HTTPError as exc:
                last_exc = exc
                if not _is_retryable(exc) or attempt == 1:
                    break
                await asyncio.sleep(0.35 * (attempt + 1))

        assert last_exc is not None
        raise AgentExecutionError(
            code="provider_request_error",
            message="Provider request failed.",
            status_code=502,
            details={"reason": _describe_http_error(last_exc)},
        ) from last_exc

    async def _get_with_retry(
        self,
        path: str,
        *,
        headers: dict[str, str],
    ) -> httpx.Response:
        last_exc: httpx.HTTPError | None = None
        for attempt in range(2):
            try:
                if self._http_client is not None:
                    return await self._http_client.get(path, headers=headers)

                async with httpx.AsyncClient(
                    base_url=self.settings.base_url,
                    timeout=_build_timeout(self.settings.timeout_seconds),
                ) as client:
                    return await client.get(path, headers=headers)
            except httpx.HTTPError as exc:
                last_exc = exc
                if not _is_retryable(exc) or attempt == 1:
                    break
                await asyncio.sleep(0.35 * (attempt + 1))

        assert last_exc is not None
        raise AgentExecutionError(
            code="provider_request_error",
            message="Provider request failed.",
            status_code=502,
            details={"reason": _describe_http_error(last_exc)},
        ) from last_exc


def _extract_text(data: dict[str, Any]) -> str:
    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        if isinstance(message, dict) and isinstance(message.get("content"), str):
            return message["content"]

    if isinstance(data.get("output_text"), str):
        return data["output_text"]

    content = data.get("content")
    if isinstance(content, list):
        text_fragments: list[str] = []
        for item in content:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                text_fragments.append(item["text"])
        if text_fragments:
            return "\n".join(text_fragments)

    raise AgentExecutionError(
        code="provider_missing_text",
        message="Provider response did not include model text.",
        status_code=502,
    )


def _extract_usage(data: dict[str, Any]) -> dict[str, int] | None:
    usage = data.get("usage")
    if not isinstance(usage, dict):
        return None

    mapped = {
        "input_tokens": usage.get("input_tokens"),
        "output_tokens": usage.get("output_tokens"),
        "total_tokens": usage.get("total_tokens"),
    }
    if all(value is None for value in mapped.values()):
        return None
    return mapped


def _serialize_input_payload(input_payload: dict[str, Any]) -> str:
    import json

    return json.dumps(input_payload, ensure_ascii=True)


def _build_timeout(total_seconds: float) -> httpx.Timeout:
    return httpx.Timeout(
        timeout=total_seconds,
        connect=min(10.0, total_seconds),
        read=total_seconds,
        write=total_seconds,
        pool=min(10.0, total_seconds),
    )


def _is_retryable(exc: httpx.HTTPError) -> bool:
    return isinstance(
        exc,
        (
            httpx.TimeoutException,
            httpx.NetworkError,
            httpx.RemoteProtocolError,
        ),
    )


def _describe_http_error(exc: httpx.HTTPError) -> str:
    text = str(exc).strip()
    if text:
        return text
    return exc.__class__.__name__


def get_llm_client() -> ClaudeCompatibleClient:
    return ClaudeCompatibleClient(settings=get_settings())
