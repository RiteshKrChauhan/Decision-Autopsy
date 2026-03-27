import httpx
import pytest

from app.core.settings import Settings
from app.schemas.agent import AgentRequest, ListenerOutput
from app.services.agents import AgentExecutor
from app.services.exceptions import AgentExecutionError
from app.services.llm import ClaudeCompatibleClient


def _request() -> AgentRequest:
    return AgentRequest.model_validate(
        {
            "context": {
                "decision": {"title": "Should I move abroad?"},
                "answers": {},
            },
            "input": {"user_message": "I want to move, but I do not know if it is wise."},
        }
    )


@pytest.mark.asyncio
async def test_agent_executor_repairs_wrapped_json() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                "output_text": 'Here is the result {"interpreted_decision":"Whether to move abroad","situation_summary":"The user is torn between opportunity and uncertainty.","confidence_score":44,"clarity_score":39,"missing_information":["budget","visa path"],"emotional_signals":["ambivalence","hope"]}',
                "usage": {"input_tokens": 10, "output_tokens": 20, "total_tokens": 30},
            },
        )
    )
    client = httpx.AsyncClient(
        transport=transport,
        base_url="https://mock-provider.test",
    )
    provider = ClaudeCompatibleClient(
        settings=Settings(
            api_key="test-key",
            base_url="https://mock-provider.test",
            model="mock-model",
            timeout_seconds=5,
            debug_raw_text=False,
        ),
        http_client=client,
    )

    executor = AgentExecutor(provider)
    response = await executor.run_structured_agent(
        agent_name="listener",
        prompt="prompt",
        request=_request(),
        output_model=ListenerOutput,
    )

    assert response.agent == "listener"
    assert response.model == "mock-model"
    assert response.usage and response.usage.total_tokens == 30
    await client.aclose()


@pytest.mark.asyncio
async def test_agent_executor_raises_on_invalid_schema() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={"output_text": '{"interpreted_decision":"Bad shape"}'},
        )
    )
    client = httpx.AsyncClient(
        transport=transport,
        base_url="https://mock-provider.test",
    )
    provider = ClaudeCompatibleClient(
        settings=Settings(
            api_key="test-key",
            base_url="https://mock-provider.test",
            model="mock-model",
            timeout_seconds=5,
            debug_raw_text=False,
        ),
        http_client=client,
    )
    executor = AgentExecutor(provider)

    with pytest.raises(AgentExecutionError) as exc:
        await executor.run_structured_agent(
            agent_name="listener",
            prompt="prompt",
            request=_request(),
            output_model=ListenerOutput,
        )

    assert exc.value.code == "invalid_model_output"
    await client.aclose()


@pytest.mark.asyncio
async def test_agent_executor_normalizes_nullable_listener_fields() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                "output_text": '{"interpreted_decision":null,"situation_summary":null,"confidence_score":31,"clarity_score":18,"missing_information":null,"emotional_signals":null}',
            },
        )
    )
    client = httpx.AsyncClient(
        transport=transport,
        base_url="https://mock-provider.test",
    )
    provider = ClaudeCompatibleClient(
        settings=Settings(
            api_key="test-key",
            base_url="https://mock-provider.test",
            model="mock-model",
            timeout_seconds=5,
            debug_raw_text=False,
        ),
        http_client=client,
    )

    executor = AgentExecutor(provider)
    response = await executor.run_structured_agent(
        agent_name="listener",
        prompt="prompt",
        request=_request(),
        output_model=ListenerOutput,
    )

    assert response.output.interpreted_decision == ""
    assert response.output.situation_summary == ""
    assert response.output.missing_information == []
    assert response.output.emotional_signals == []
    await client.aclose()
