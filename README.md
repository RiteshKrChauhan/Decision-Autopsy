# FutureDecisions

An AI tool that helps you see the outcomes of your decisions before making them. It simulates multiple possible futures, showing how each path unfolds over time. Instead of giving advice, it provides clear, visual insight so you can choose with confidence.

## Backend

Stateless FastAPI backend for the Decision Autopsy product.

## What this includes
- Shared request, response, error, and `context` contracts
- `POST /api/v1/listener`
- `POST /api/v1/questioner`
- `GET /health`
- `GET /ready`
- Claude-compatible HTTP client with JSON parsing and repair
- Tests for contracts, endpoints, and failure paths

## Run locally
1. Create a virtual environment and install dependencies:
   `pip install -e .[dev]`
2. Copy `.env.example` to `.env` and fill in your real API key.
3. Start the API:
   `uvicorn app.main:app --reload`

The backend now loads `.env` automatically from the repo root. It also accepts legacy `ABBY_API_KEY`, `ABBY_MODEL`, and `ABBY_BASE_URL` env vars if those are already present in your shell.

## Environment variables
- `DECISION_AUTOPSY_API_KEY`
- `DECISION_AUTOPSY_BASE_URL`
- `DECISION_AUTOPSY_MODEL`
- `DECISION_AUTOPSY_TIMEOUT_SECONDS`
- `DECISION_AUTOPSY_DEBUG_RAW_TEXT`
- `DECISION_AUTOPSY_FRONTEND_ORIGINS`
  Example: `http://localhost:5173,http://127.0.0.1:5173`

Default provider values are aligned with the local `APITEST` project:
- base URL: `https://api.abby.abb.com/api/v1/developers`
- model: `claude-4.5-sonnet`
- auth: `Authorization: Bearer <key>`

## API shape
All agent endpoints accept:
- `context`
- `input`
- `metadata` optional

All agent endpoints return:
- `agent`
- `output`
- `model`
- `usage` optional
- `raw_text` optional when debug is enabled

## Notes for Ranveer
The `Context` schema in [`app/schemas/context.py`](/Users/manishmandal/Documents/DecisionAutopsy/app/schemas/context.py) is the canonical contract. Downstream agents should consume it, not redefine it.
