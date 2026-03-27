from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class UserProfile(BaseModel):
    age_range: str | None = None
    occupation: str | None = None
    relationship_status: str | None = None
    location: str | None = None
    financial_context: str | None = None
    background_notes: list[str] = Field(default_factory=list)


class DecisionSummary(BaseModel):
    title: str | None = None
    description: str | None = None
    stage: str | None = Field(
        default=None,
        description="Example values: considering, deciding, decided, regretting.",
    )
    timeframe: str | None = None
    urgency: str | None = None


class AnswerSet(BaseModel):
    financial_reality: str | None = None
    practical_constraints: str | None = None
    emotional_risk: str | None = None
    desired_outcome: str | None = None
    feared_outcome: str | None = None
    alternatives_considered: list[str] = Field(default_factory=list)
    additional_answers: dict[str, str] = Field(default_factory=dict)


class ListenerSnapshot(BaseModel):
    interpreted_decision: str | None = None
    situation_summary: str | None = None
    confidence_score: int | None = Field(default=None, ge=0, le=100)
    clarity_score: int | None = Field(default=None, ge=0, le=100)
    missing_information: list[str] = Field(default_factory=list)
    emotional_signals: list[str] = Field(default_factory=list)


class QuestionRecord(BaseModel):
    question_id: str
    question: str
    priority: str
    rationale: str
    answer: str | None = None


class PatternPlaceholder(BaseModel):
    detected_patterns: list[str] = Field(default_factory=list)
    confidence_notes: list[str] = Field(default_factory=list)
    observation: str | None = None
    sub: str | None = None


class AutopsyEvent(BaseModel):
    when: str
    what: str
    note: str


class AutopsyFuture(BaseModel):
    id: str
    color: str
    label: str
    title: str
    summary: str
    confidence: int
    events: list[AutopsyEvent] = Field(default_factory=list)


class ForkPointSnapshot(BaseModel):
    body: str | None = None
    action: str | None = None


class AutopsyPlaceholder(BaseModel):
    timeline_ready: bool = False
    summary: str | None = None
    futures: list[AutopsyFuture] = Field(default_factory=list)
    fork_point: ForkPointSnapshot = Field(default_factory=ForkPointSnapshot)


class Context(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: DecisionSummary = Field(default_factory=DecisionSummary)
    user_profile: UserProfile = Field(default_factory=UserProfile)
    answers: AnswerSet = Field(default_factory=AnswerSet)
    missing_information: list[str] = Field(default_factory=list)
    listener_result: ListenerSnapshot | None = None
    question_history: list[QuestionRecord] = Field(default_factory=list)
    pattern_analysis: PatternPlaceholder = Field(default_factory=PatternPlaceholder)
    autopsy: AutopsyPlaceholder = Field(default_factory=AutopsyPlaceholder)
