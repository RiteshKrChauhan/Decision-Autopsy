from __future__ import annotations

import re
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
            parsed = _normalize_agent_payload(agent_name, parsed)
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


def _normalize_agent_payload(agent_name: str, parsed: Any) -> Any:
    if agent_name != "questioner" or not isinstance(parsed, dict):
        return parsed

    questions = parsed.get("questions")
    if not isinstance(questions, list):
        return parsed

    normalized_questions: list[Any] = []
    for item in questions[:1]:
        if not isinstance(item, dict):
            normalized_questions.append(item)
            continue

        next_item = dict(item)
        if isinstance(next_item.get("question"), str):
            next_item["question"] = _normalize_compound_question(next_item["question"])
        next_item["answer_choices"] = _normalize_answer_choices(next_item)
        normalized_questions.append(next_item)

    next_parsed = dict(parsed)
    next_parsed["questions"] = normalized_questions
    return next_parsed


def _normalize_compound_question(question: str) -> str:
    cleaned = " ".join(question.split())
    lowered = cleaned.lower()

    marker_candidates = [
        "how many months",
        "how long",
        "what is your current age",
        "what is your current monthly income",
        "what is your current financial support situation",
        "do you have existing savings",
        "are you currently supporting",
        "what is the worst thing",
        "what is your biggest fear",
        "what matters more",
    ]

    for marker in marker_candidates:
        index = lowered.find(marker)
        if index > 0 and any(token in lowered[:index] for token in [", and ", "? ", ". "]):
            candidate = cleaned[index:]
            return _ensure_question(candidate)

    pieces = re.split(r"\?\s+|,\s+and\s+|\.\s+", cleaned)
    interrogative_pieces = [
        piece.strip(" ,")
        for piece in pieces
        if piece.strip() and re.match(r"^(what|how|why|when|where|who|which|do|does|did|are|is|have|has|can|could|would|will)\b", piece.strip(), flags=re.IGNORECASE)
    ]

    if len(interrogative_pieces) >= 2:
        return _ensure_question(interrogative_pieces[-1])

    return _ensure_question(cleaned)


def _ensure_question(text: str) -> str:
    cleaned = text.strip(" .")
    if not cleaned:
        return text
    cleaned = cleaned[0].upper() + cleaned[1:]
    if not cleaned.endswith("?"):
        cleaned = f"{cleaned}?"
    return cleaned


def _normalize_answer_choices(question_data: dict[str, Any]) -> list[str]:
    raw_choices = question_data.get("answer_choices")
    if isinstance(raw_choices, list):
        choices = [str(item).strip() for item in raw_choices if str(item).strip()]
        if choices:
            return choices[:4]

    question = str(question_data.get("question") or "").lower()
    category = str(question_data.get("category") or "").lower()

    if "monthly income" in question or "take-home income" in question or "salary" in question:
        return ["Below INR 30,000/month", "INR 30,000-75,000/month", "Above INR 75,000/month"]

    if "how much do you have saved" in question or ("savings" in question and "how much" in question):
        return ["Under INR 1 lakh", "INR 1-5 lakh", "Above INR 5 lakh"]

    if "employment status" in question or "are you working" in question or "fresh graduate" in question:
        return ["Working", "Studying", "Unemployed"]

    if "how long have you been" in question:
        return ["Less than 1 year", "1-3 years", "More than 3 years"]

    if "survive yourself without" in question or "sustain yourself without" in question or "runway" in question:
        return ["Less than 3 months", "3-6 months", "More than 6 months"]

    if "savings" in question or "family support" in question or "take loans" in question:
        return ["Family support available", "Some savings", "Would need a loan"]

    if "partner" in question and "timeline" in question:
        return ["Same timeline", "Different timeline", "Not discussed clearly"]

    if "live with" in question or "renting" in question or "own place" in question:
        return ["With parents", "Renting now", "Own place"]

    if category == "practical_constraints" and ("timeline" in question or "when" in question):
        return ["Within 3 months", "3-12 months", "More than 1 year"]

    if category == "emotional_risk" and ("fear" in question or "worst thing" in question):
        return ["Fear of failure", "Fear of regret", "Fear of instability"]

    if category == "financial_reality" and ("debt" in question or "loan" in question or "emi" in question):
        return ["No major EMIs", "Manageable EMIs", "Heavy debt pressure"]

    return []
