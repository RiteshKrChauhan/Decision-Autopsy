from pydantic import ValidationError

from app.schemas.agent import (
    AgentRequest,
    CompanionOutput,
    ErrorResponse,
    ListenerOutput,
    QuestionerOutput,
    SurgeonOutput,
)


def test_agent_request_accepts_compact_context() -> None:
    request = AgentRequest.model_validate(
        {
            "context": {
                "decision": {"title": "Should I quit my job?"},
                "answers": {"financial_reality": "I have 6 months of savings"},
            },
            "input": {"user_message": "I want to leave but I am scared."},
            "metadata": {"request_id": "req-1", "debug": False},
        }
    )

    assert request.context.decision.title == "Should I quit my job?"
    assert request.context.answers.financial_reality == "I have 6 months of savings"


def test_context_rejects_unknown_top_level_fields() -> None:
    try:
        AgentRequest.model_validate(
            {
                "context": {
                    "decision": {"title": "Move cities?"},
                    "unexpected": "break-contract",
                },
                "input": {},
            }
        )
    except ValidationError as exc:
        assert "unexpected" in str(exc)
    else:
        raise AssertionError("ValidationError was expected for unknown fields.")


def test_listener_output_contract() -> None:
    output = ListenerOutput.model_validate(
        {
            "interpreted_decision": "Whether to leave a stable job for a startup role",
            "situation_summary": "The user feels pulled toward growth but fears instability.",
            "confidence_score": 42,
            "clarity_score": 37,
            "missing_information": ["current savings runway", "family obligations"],
            "emotional_signals": ["fear", "restlessness"],
        }
    )

    assert output.confidence_score == 42
    assert output.missing_information[0] == "current savings runway"


def test_listener_output_normalizes_provider_shape() -> None:
    output = ListenerOutput.model_validate(
        {
            "interpreted_decision": "Whether to leave current employment",
            "situation_summary": "The user wants autonomy but fears failure.",
            "confidence_score": 0.75,
            "clarity_score": 0.65,
            "missing_information": ["burn rate"],
            "emotional_signals": [
                {"emotion": "fear", "intensity": "high"},
                "restlessness",
            ],
        }
    )

    assert output.confidence_score == 75
    assert output.clarity_score == 65
    assert output.emotional_signals == ["fear:high", "restlessness"]


def test_questioner_output_contract() -> None:
    output = QuestionerOutput.model_validate(
        {
            "recommended_focus": "financial_reality",
            "questions": [
                {
                    "question_id": "financial-runway",
                    "question": "How many months can you cover living costs without salary?",
                    "priority": "high",
                    "category": "financial",
                    "rationale": "This determines whether the risk is survivable.",
                }
            ],
        }
    )

    assert output.questions[0].category == "financial"


def test_questioner_output_normalizes_common_aliases() -> None:
    output = QuestionerOutput.model_validate(
        {
            "recommended_focus": "financial_reality",
            "questions": [
                {
                    "id": "runway",
                    "text": "How many months of savings do you have?",
                    "priority": "high",
                    "category": "financial",
                    "context": "This determines survivability.",
                }
            ],
        }
    )

    assert output.questions[0].question_id == "runway"
    assert output.questions[0].question == "How many months of savings do you have?"
    assert output.questions[0].rationale == "This determines survivability."


def test_error_response_contract() -> None:
    error = ErrorResponse.model_validate(
        {
            "error": {
                "code": "invalid_model_output",
                "message": "Model output did not match the expected schema.",
            },
            "request_id": "req-9",
        }
    )

    assert error.error.code == "invalid_model_output"


def test_surgeon_output_contract() -> None:
    output = SurgeonOutput.model_validate(
        {
            "futures": [
                {
                    "id": "f1",
                    "color": "#2dd68a",
                    "label": "If it works",
                    "title": "You build traction early",
                    "summary": "You validate demand quickly and commit fully.",
                    "confidence": 56,
                    "events": [
                        {"when": "Month 3", "what": "You ship an MVP", "note": "You stop planning and start learning from real users."},
                        {"when": "Month 9", "what": "You hit first revenue", "note": "The decision becomes operational, not theoretical."},
                        {"when": "Year 2", "what": "You scale distribution", "note": "Your work compounds because the market pulls you forward."},
                        {"when": "Year 5", "what": "You lead a durable business", "note": "You have leverage and optionality you did not have before."},
                    ],
                },
                {
                    "id": "f2",
                    "color": "#e6a830",
                    "label": "If it struggles",
                    "title": "You survive the hard middle",
                    "summary": "Progress is slower, but the path remains alive.",
                    "confidence": 63,
                    "events": [
                        {"when": "Month 3", "what": "Early tests underperform", "note": "You confront weak assumptions while runway is still intact."},
                        {"when": "Month 9", "what": "You tighten the offer", "note": "Focus replaces excitement and decisions get sharper."},
                        {"when": "Year 2", "what": "A narrow segment responds", "note": "You build confidence through fit, not hype."},
                        {"when": "Year 5", "what": "You run a lean operation", "note": "It is not flashy, but it is real and resilient."},
                    ],
                },
                {
                    "id": "f3",
                    "color": "#5a8df0",
                    "label": "If you wait",
                    "title": "You delay and de-risk",
                    "summary": "You keep stability while postponing the leap.",
                    "confidence": 68,
                    "events": [
                        {"when": "Month 3", "what": "You stay in your role", "note": "Cash flow stays predictable and pressure drops."},
                        {"when": "Month 9", "what": "You build part-time", "note": "Momentum exists, but tradeoffs limit velocity."},
                        {"when": "Year 2", "what": "Progress remains incremental", "note": "Safety is high, but ambition is diluted."},
                        {"when": "Year 5", "what": "You revisit the same decision", "note": "The question persists because it was never fully tested."},
                    ],
                },
                {
                    "id": "f4",
                    "color": "#9a9890",
                    "label": "If nothing changes",
                    "title": "You defer until drift decides",
                    "summary": "Inaction resolves the decision by default.",
                    "confidence": 100,
                    "events": [
                        {"when": "Month 3", "what": "You postpone again", "note": "Urgency fades and habits reassert control."},
                        {"when": "Month 9", "what": "The window narrows", "note": "External constraints increase while flexibility decreases."},
                        {"when": "Year 2", "what": "You normalize compromise", "note": "The cost is quiet, but cumulative."},
                        {"when": "Year 5", "what": "You call it practicality", "note": "The unrealized path becomes a private reference point."},
                    ],
                },
            ],
            "fork_point": {
                "body": "Everything in this autopsy hinges on one variable: whether you get first meaningful customer proof before runway pressure forces retreat.",
                "action": "Talk to three operators in your exact market and ask when demand became undeniable.",
            },
        }
    )

    assert len(output.futures) == 4
    assert output.futures[0].id == "f1"
    assert output.futures[3].confidence == 100


def test_surgeon_output_rejects_wrong_order() -> None:
    try:
        SurgeonOutput.model_validate(
            {
                "futures": [
                    {
                        "id": "f2",
                        "color": "#e6a830",
                        "label": "If it struggles",
                        "title": "A",
                        "summary": "A",
                        "confidence": 60,
                        "events": [
                            {"when": "Month 3", "what": "A", "note": "A"},
                            {"when": "Month 9", "what": "A", "note": "A"},
                            {"when": "Year 2", "what": "A", "note": "A"},
                            {"when": "Year 5", "what": "A", "note": "A"},
                        ],
                    },
                    {
                        "id": "f1",
                        "color": "#2dd68a",
                        "label": "If it works",
                        "title": "B",
                        "summary": "B",
                        "confidence": 55,
                        "events": [
                            {"when": "Month 3", "what": "B", "note": "B"},
                            {"when": "Month 9", "what": "B", "note": "B"},
                            {"when": "Year 2", "what": "B", "note": "B"},
                            {"when": "Year 5", "what": "B", "note": "B"},
                        ],
                    },
                    {
                        "id": "f3",
                        "color": "#5a8df0",
                        "label": "If you wait",
                        "title": "C",
                        "summary": "C",
                        "confidence": 65,
                        "events": [
                            {"when": "Month 3", "what": "C", "note": "C"},
                            {"when": "Month 9", "what": "C", "note": "C"},
                            {"when": "Year 2", "what": "C", "note": "C"},
                            {"when": "Year 5", "what": "C", "note": "C"},
                        ],
                    },
                    {
                        "id": "f4",
                        "color": "#9a9890",
                        "label": "If nothing changes",
                        "title": "D",
                        "summary": "D",
                        "confidence": 100,
                        "events": [
                            {"when": "Month 3", "what": "D", "note": "D"},
                            {"when": "Month 9", "what": "D", "note": "D"},
                            {"when": "Year 2", "what": "D", "note": "D"},
                            {"when": "Year 5", "what": "D", "note": "D"},
                        ],
                    },
                ],
                "fork_point": {"body": "x", "action": "y"},
            }
        )
    except ValidationError as exc:
        assert "ordered exactly as f1, f2, f3, f4" in str(exc)
    else:
        raise AssertionError("ValidationError was expected for invalid future order.")


def test_companion_output_requires_non_empty_reply() -> None:
    try:
        CompanionOutput.model_validate({"reply": "   ", "rerun": False})
    except ValidationError as exc:
        assert "at least 1 character" in str(exc)
    else:
        raise AssertionError("ValidationError was expected for empty reply.")
