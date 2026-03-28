# Decision Autopsy

Decision Autopsy helps users think through major life or career decisions by simulating four concrete future paths. Instead of generic advice, it runs a structured AI pipeline that:

1. Interprets the decision and missing context
2. Asks a few high-impact follow-up questions
3. Detects a framing pattern
4. Generates four future timelines and a fork point
5. Continues as a companion chat after futures are shown

The project is split into:

- A stateless FastAPI backend in Python
- A React + Vite frontend

## Architecture

### Backend (FastAPI)

The backend exposes health/platform routes and five agent routes:

- `GET /health`
- `GET /ready`
- `GET /api/v1/usage`
- `POST /api/v1/listener`
- `POST /api/v1/questioner`
- `POST /api/v1/pattern-reader`
- `POST /api/v1/surgeon`
- `POST /api/v1/companion`

All agent routes share a common request envelope and response envelope, with strict Pydantic schema validation.

### Frontend (React)

The frontend provides a chat-driven decision workflow:

- Decision intake
- Follow-up question flow with quick replies and skip support
- Pattern flash
- Futures panel (4 futures + fork point)
- Post-futures companion chat
- Session persistence in localStorage
- Live backend status and API usage/debug panel

## Repository Layout

```text
.
|- app/
|  |- api/              # FastAPI routes
|  |- core/             # settings + error handlers
|  |- prompts/          # system prompts per agent
|  |- schemas/          # request/response/context contracts
|  |- services/         # executor, LLM client, JSON repair
|  |- main.py           # app factory + middleware
|- frontend/
|  |- src/
|  |  |- components/
|  |  |- services/
|  |  |- state/
|  |- styles/main.css
|- tests/
|- pyproject.toml
|- README.md
```

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm

## Quick Start

### 1. Backend setup

From the repository root:

```bash
pip install -e .[dev]
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Update `.env`:

```env
DECISION_AUTOPSY_API_KEY=your-api-key-here
```

Run backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend base URL: `http://127.0.0.1:8000`

### 2. Frontend setup

From `frontend/`:

```bash
npm install
npm run dev
```

Additional frontend scripts:

```bash
npm run check
npm run build
npm run preview
```

Frontend base URL: `http://localhost:5173`

The frontend API target is configured in `frontend/src/config.js` and defaults to:

```js
apiBaseUrl: "http://127.0.0.1:8000"
```

### 3. Run tests

From the repository root:

```bash
pytest
```

Optional:

```bash
pytest --cov=app tests/
```

## Environment Variables

Configured in `.env` (auto-loaded from repo root by `app/core/settings.py`).

| Variable | Required | Default | Description |
|---|---|---|---|
| `DECISION_AUTOPSY_API_KEY` | Yes (for provider calls) | `""` | Provider API key |
| `DECISION_AUTOPSY_BASE_URL` | No | `https://api.abby.abb.com/api/v1/developers` | Provider base URL |
| `DECISION_AUTOPSY_MODEL` | No | `claude-4.5-sonnet` | Model ID |
| `DECISION_AUTOPSY_TIMEOUT_SECONDS` | No | `60` | HTTP timeout |
| `DECISION_AUTOPSY_DEBUG_RAW_TEXT` | No | `false` | Include raw model text in API responses |
| `DECISION_AUTOPSY_FRONTEND_ORIGINS` | No | localhost origins | CORS allowed origins (comma-separated) |

Legacy fallback is supported:

- `ABBY_API_KEY` -> `DECISION_AUTOPSY_API_KEY`
- `ABBY_BASE_URL` -> `DECISION_AUTOPSY_BASE_URL`
- `ABBY_MODEL` -> `DECISION_AUTOPSY_MODEL`

## API Contracts

### Shared request envelope

All agent endpoints accept:

```json
{
   "context": {},
   "input": {},
   "metadata": {
      "request_id": "req-123",
      "client_version": "0.1.0",
      "debug": false
   }
}
```

### Shared response envelope

All agent endpoints return:

```json
{
   "agent": "listener",
   "output": {},
   "model": "claude-4.5-sonnet",
   "usage": {
      "input_tokens": 10,
      "output_tokens": 20,
      "total_tokens": 30
   },
   "raw_text": null
}
```

### Error shape

```json
{
   "error": {
      "code": "request_validation_error",
      "message": "Request payload failed validation.",
      "details": []
   },
   "request_id": "req-123"
}
```

## Agent Endpoints

### `POST /api/v1/listener`

Interprets decision intent and returns:

- `interpreted_decision`
- `situation_summary`
- `confidence_score` (0-100)
- `clarity_score` (0-100)
- `missing_information` (string[])
- `emotional_signals` (string[])

### `POST /api/v1/questioner`

Returns next follow-up question(s):

- `recommended_focus`
- `questions[]` with `question_id`, `question`, `priority`, `category`, `rationale`, `answer_choices`

### `POST /api/v1/pattern-reader`

Returns one framing pattern:

- `observation`
- `sub`

### `POST /api/v1/surgeon`

Returns final futures and fork point:

- `futures` (exactly 4: `f1`, `f2`, `f3`, `f4`)
- `fork_point` (`body`, `action`)

### `POST /api/v1/companion`

Returns follow-up conversational reply:

- `reply`
- `rerun` (boolean)

### Platform endpoints

- `GET /health` -> `{"status": "ok"}`
- `GET /ready` -> `{"status": "ready"}`
- `GET /api/v1/usage` -> provider usage snapshot

## Quick API Smoke Test

With backend running on `127.0.0.1:8000`:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/ready
```

Listener example:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/listener \
   -H "Content-Type: application/json" \
   -d '{
      "context": {
         "decision": {"title": "Should I leave my job?"},
         "answers": {}
      },
      "input": {"user_message": "I want to quit but I am scared."},
      "metadata": {"request_id": "readme-smoke", "debug": false}
   }'
```

## Typical Flow

1. Frontend calls `listener` with the user's initial decision.
2. Frontend loops through `questioner` while collecting answers.
3. Frontend calls `pattern-reader` once enough signal is collected.
4. Frontend calls `surgeon` to generate 4 futures and fork point.
5. After futures are visible, frontend uses `companion` for follow-up chat.

## Development Notes

- The canonical shared context contract is `app/schemas/context.py`.
- Backend is intentionally stateless; the frontend owns session state.
- `.env` is ignored by git; `.env.example` is the template.
- `frontend/README.md` currently contains outdated notes (for example, references to mock mode and port 3000). Use this root README and source files as the current truth.

## Troubleshooting

### `GET /health` works but agent calls fail with provider errors

Likely missing/invalid `DECISION_AUTOPSY_API_KEY`. Platform routes do not require provider credentials, but `/api/v1/usage` and `/api/v1/*` agent calls do.

### CORS errors from frontend

Set `DECISION_AUTOPSY_FRONTEND_ORIGINS` to include your frontend origin, for example:

```env
DECISION_AUTOPSY_FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend cannot reach backend

Confirm:

1. Backend is running on `127.0.0.1:8000`
2. `frontend/src/config.js` points to the same backend origin

## License

No license file is currently defined in this repository.
