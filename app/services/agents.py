from __future__ import annotations

from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

from app.core.settings import get_settings
from app.schemas.agent import AgentRequest, AgentResponse, UsageStats
from app.services.exceptions import AgentExecutionError
from app.services.json_utils import parse_json_with_repair
from app.services.llm import ClaudeCompatibleClient, get_llm_client

T = TypeVar("T", bound=BaseModel)


class AgentExecutor:
    def __init__(self, client: ClaudeCompatibleClient) -> None:
        self.client = client

    async def run_structured_agent(
        self,
        *,
        agent_name: str,
        prompt: str,
        request: AgentRequest,
        output_model: type[T],
    ) -> AgentResponse[T]:
        payload = {
            "context": request.context.model_dump(mode="json"),
            "input": request.input,
            "metadata": request.metadata.model_dump(mode="json")
            if request.metadata
            else None,
            "instructions": {
                "response_format": "json_object",
                "agent": agent_name,
            },
        }

        raw_text, usage = await self.client.create_message(
            system_prompt=prompt,
            input_payload=payload,
        )

        try:
            parsed = parse_json_with_repair(raw_text)
            output = output_model.model_validate(parsed)
        except (ValidationError, ValueError) as exc:
            raise AgentExecutionError(
                code="invalid_model_output",
                message="Model output did not match the expected schema.",
                status_code=502,
                details={"agent": agent_name, "reason": str(exc)},
            ) from exc

        response = AgentResponse[output_model](
            agent=agent_name,
            output=output,
            model=self.client.settings.model,
            usage=UsageStats.model_validate(usage) if usage else None,
            raw_text=raw_text if get_settings().debug_raw_text else None,
        )
        return response


def get_agent_executor() -> AgentExecutor:
    return AgentExecutor(client=get_llm_client())


async def get_usage_snapshot() -> dict[str, Any]:
    return await get_llm_client().get_usage()
