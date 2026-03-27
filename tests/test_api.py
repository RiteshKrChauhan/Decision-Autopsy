from fastapi.testclient import TestClient

from app.services.agents import get_agent_executor


class StubExecutor:
    async def run_structured_agent(self, *, agent_name, prompt, request, output_model):
        if agent_name == "listener":
            return {
                "agent": "listener",
                "output": {
                    "interpreted_decision": "Whether to leave a job",
                    "situation_summary": "The user feels trapped but uncertain.",
                    "confidence_score": 41,
                    "clarity_score": 33,
                    "missing_information": ["runway", "support system"],
                    "emotional_signals": ["fear", "urgency"],
                },
                "model": "stub-model",
                "usage": {"input_tokens": 1, "output_tokens": 2, "total_tokens": 3},
                "raw_text": None,
            }
        return {
            "agent": "questioner",
            "output": {
                "recommended_focus": "financial_reality",
                "questions": [
                    {
                        "question_id": "runway",
                        "question": "How many months of living expenses do you have saved?",
                        "priority": "high",
                        "category": "financial",
                        "rationale": "This determines whether the choice is survivable.",
                    }
                ],
            },
            "model": "stub-model",
            "usage": {"input_tokens": 1, "output_tokens": 2, "total_tokens": 3},
            "raw_text": None,
        }


def _payload() -> dict[str, object]:
    return {
        "context": {
            "decision": {"title": "Should I leave my job?"},
            "answers": {},
        },
        "input": {"user_message": "I hate my current role but I am scared."},
        "metadata": {"request_id": "req-1", "debug": False},
    }


def test_health(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready(client: TestClient) -> None:
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_usage_endpoint_returns_snapshot(client: TestClient) -> None:
    async def stub_usage():
        return {
            "month_usage": 1140,
            "month_limit": 20000000,
            "remaining_tokens": 19998860,
            "percentage": "0.01%",
            "reset_at": "2026-04-01T00:00:00Z",
        }

    from app.api import routes

    original = routes.get_usage_snapshot
    routes.get_usage_snapshot = stub_usage
    try:
        response = client.get("/api/v1/usage")
    finally:
        routes.get_usage_snapshot = original

    assert response.status_code == 200
    assert response.json()["month_limit"] == 20000000


def test_listener_endpoint_returns_contract(client: TestClient) -> None:
    client.app.dependency_overrides[get_agent_executor] = lambda: StubExecutor()

    response = client.post("/api/v1/listener", json=_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["agent"] == "listener"
    assert body["output"]["confidence_score"] == 41
    client.app.dependency_overrides.clear()


def test_questioner_endpoint_returns_contract(client: TestClient) -> None:
    client.app.dependency_overrides[get_agent_executor] = lambda: StubExecutor()

    response = client.post("/api/v1/questioner", json=_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["agent"] == "questioner"
    assert body["output"]["questions"][0]["category"] == "financial"
    client.app.dependency_overrides.clear()


def test_invalid_request_payload_returns_structured_error(client: TestClient) -> None:
    response = client.post("/api/v1/listener", json={"context": {}, "input": []})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "request_validation_error"
