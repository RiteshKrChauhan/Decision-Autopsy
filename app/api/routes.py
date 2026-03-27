from fastapi import APIRouter, Depends, status

from app.prompts.listener import LISTENER_PROMPT
from app.prompts.questioner import QUESTIONER_PROMPT
from app.prompts.patternreader import PATTERN_READER_PROMPT
from app.schemas.agent import (
    AgentRequest,
    AgentResponse,
    ListenerOutput,
    QuestionerOutput,
    PatternReaderOutput,
)
from app.services.agents import AgentExecutor, get_agent_executor
from app.services.agents import get_usage_snapshot

router = APIRouter()


@router.get("/health", tags=["platform"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", tags=["platform"])
async def ready() -> dict[str, str]:
    return {"status": "ready"}


@router.get("/api/v1/usage", tags=["platform"])
async def usage() -> dict[str, object]:
    return await get_usage_snapshot()


@router.post(
    "/api/v1/listener",
    response_model=AgentResponse[ListenerOutput],
    status_code=status.HTTP_200_OK,
    tags=["agents"],
)
async def listener(
    request: AgentRequest,
    executor: AgentExecutor = Depends(get_agent_executor),
) -> AgentResponse[ListenerOutput]:
    return await executor.run_structured_agent(
        agent_name="listener",
        prompt=LISTENER_PROMPT,
        request=request,
        output_model=ListenerOutput,
    )


@router.post(
    "/api/v1/questioner",
    response_model=AgentResponse[QuestionerOutput],
    status_code=status.HTTP_200_OK,
    tags=["agents"],
)
async def questioner(
    request: AgentRequest,
    executor: AgentExecutor = Depends(get_agent_executor),
) -> AgentResponse[QuestionerOutput]:
    return await executor.run_structured_agent(
        agent_name="questioner",
        prompt=QUESTIONER_PROMPT,
        request=request,
        output_model=QuestionerOutput,
    )

@router.post(
    "/api/v1/pattern-reader",
    response_model=AgentResponse[PatternReaderOutput],
    status_code=status.HTTP_200_OK,
    tags=["agents"],
)
async def pattern_reader(
    request: AgentRequest,
    executor: AgentExecutor = Depends(get_agent_executor),
) -> AgentResponse[PatternReaderOutput]:
    return await executor.run_structured_agent(
        agent_name="pattern-reader",
        prompt=PATTERN_READER_PROMPT,
        request=request,
        output_model=PatternReaderOutput,
    )

