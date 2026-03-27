from __future__ import annotations

from typing import Generic, Literal, TypeVar

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

class SurgeonEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    when: str
    what: str
    note: str

class SurgeonFuture(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Literal["f1", "f2", "f3", "f4"]
    color: Literal["#2dd68a", "#e6a830", "#5a8df0", "#9a9890"]
    label: Literal["If it works", "If it struggles", "If you wait", "If nothing changes"]
    title: str
    summary: str
    confidence: int = Field(ge=0, le=100)
    events: list[SurgeonEvent] = Field(min_length=4, max_length=4)

    @model_validator(mode="after")
    def validate_identity_fields(self) -> "SurgeonFuture":
        expected = {
            "f1": ("#2dd68a", "If it works"),
            "f2": ("#e6a830", "If it struggles"),
            "f3": ("#5a8df0", "If you wait"),
            "f4": ("#9a9890", "If nothing changes"),
        }
        expected_color, expected_label = expected[self.id]
        if self.color != expected_color or self.label != expected_label:
            raise ValueError(
                f"{self.id} must use color {expected_color} and label {expected_label}."
            )
        return self

class ForkPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str
    action: str

class SurgeonOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    futures: list[SurgeonFuture] = Field(min_length=4, max_length=4)
    fork_point: ForkPoint

    @model_validator(mode="after")
    def validate_future_order_and_status_quo(self) -> "SurgeonOutput":
        expected_ids = ["f1", "f2", "f3", "f4"]
        ids = [future.id for future in self.futures]
        if ids != expected_ids:
            raise ValueError("futures must be ordered exactly as f1, f2, f3, f4.")

        if self.futures[3].confidence != 100:
            raise ValueError("f4 confidence must be exactly 100.")

        return self

class CompanionOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reply: str = Field(min_length=1)
    rerun: bool = False

    @field_validator("reply", mode="before")
    @classmethod
    def normalize_reply(cls, value: object) -> object:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        return value

class ErrorBody(BaseModel):
    code: str
    message: str
    details: object | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
    request_id: str | None = None
