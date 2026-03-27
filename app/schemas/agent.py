from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.context import Context

T = TypeVar("T", bound=BaseModel)


class RequestMetadata(BaseModel):
    request_id: str | None = None
    client_version: str | None = None
    debug: bool = False


class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    context: Context
    input: dict[str, object] = Field(default_factory=dict)
    metadata: RequestMetadata | None = None


class UsageStats(BaseModel):
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None


class AgentResponse(BaseModel, Generic[T]):
    agent: str
    output: T
    model: str
    usage: UsageStats | None = None
    raw_text: str | None = None


class ListenerOutput(BaseModel):
    interpreted_decision: str
    situation_summary: str
    confidence_score: int = Field(ge=0, le=100)
    clarity_score: int = Field(ge=0, le=100)
    missing_information: list[str] = Field(default_factory=list)
    emotional_signals: list[str] = Field(default_factory=list)

    @field_validator("interpreted_decision", "situation_summary", mode="before")
    @classmethod
    def normalize_nullable_strings(cls, value: object) -> object:
        if value is None:
            return ""
        return value

    @field_validator("confidence_score", "clarity_score", mode="before")
    @classmethod
    def normalize_scores(cls, value: object) -> object:
        if isinstance(value, float) and 0 <= value <= 1:
            return round(value * 100)
        return value

    @field_validator("missing_information", mode="before")
    @classmethod
    def normalize_missing_information(cls, value: object) -> object:
        if value is None:
            return []
        return value

    @field_validator("emotional_signals", mode="before")
    @classmethod
    def normalize_emotional_signals(cls, value: object) -> object:
        if value is None:
            return []
        if not isinstance(value, list):
            return value

        normalized: list[str] = []
        for item in value:
            if isinstance(item, str):
                normalized.append(item)
            elif isinstance(item, dict):
                emotion = item.get("emotion")
                intensity = item.get("intensity")
                if isinstance(emotion, str) and isinstance(intensity, str):
                    normalized.append(f"{emotion}:{intensity}")
                elif isinstance(emotion, str):
                    normalized.append(emotion)
        return normalized


class FollowUpQuestion(BaseModel):
    question_id: str
    question: str
    priority: str
    category: str
    rationale: str
    answer_choices: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        alias_map = {
            "id": "question_id",
            "text": "question",
            "reason": "rationale",
            "context": "rationale",
            "choices": "answer_choices",
            "options": "answer_choices",
        }
        for source, target in alias_map.items():
            if target not in normalized and source in normalized:
                normalized[target] = normalized[source]
        return normalized


class QuestionerOutput(BaseModel):
    recommended_focus: str
    questions: list[FollowUpQuestion] = Field(default_factory=list)


class PatternReaderOutput(BaseModel):
    observation: str
    sub: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: object | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
    request_id: str | None = None
