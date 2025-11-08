# Vivi — Agentic Activity Network

“You bring the mood. Your friends bring the vibe. AI orchestrates the plan.”

Vivi is a full-stack reimagining of the Yumi social-agentic platform, pivoting from food discovery to activity discovery. The system coordinates group moods, taste graphs, and live event data to suggest the perfect shared experience. Built for the web and deployable end-to-end on Render.

---

## Architecture

- **Frontend** — Vite + React web app (`frontend/`) that captures natural language mood prompts, lets you tag friends, and renders AI-curated plan cards.
- **Backend** — FastAPI service (`backend/`) orchestrating multi-agent planning (listener → profile → merge → explorer → writer → scheduler) with pluggable tool functions.
- **Data Contracts** — Typed schemas in `backend/schemas.py`; mock tool implementations ready to be swapped for Supabase, Google Places, Eventbrite, Meetup, TikTok sentiment, etc.
- **Deployment** — `render.yaml` blueprint provisions a Python web service (`vivi-api`) and a static site (`vivi-web`). Environment variables stubbed for Gemini, Claude, OpenAI.

---

## Getting Started

### 1. Backend (FastAPI)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.api:app --host 0.0.0.0 --port 8000
```

Test locally:

```bash
curl -X POST http://localhost:8000/api/v1/plan \
  -H "Content-Type: application/json" \
  -d '{
        "query_text": "We are broke, want outdoor music near Cambridge after 5pm.",
        "user_ids": ["u1","u2","u3"],
        "location_hint": "Cambridge, MA",
        "time_window": "today 5-8pm"
      }'
```

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:8000` in a `.env.local` file to point at the FastAPI service.

---

## Render Deployment

1. Push this repo to GitHub.
2. In Render, “New Blueprint” → connect repository → deploy.
3. Configure `VITE_API_BASE_URL` for `vivi-web` to the public URL of `vivi-api`.
4. Add real API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `CLAUDE_API_KEY`) to the backend service when ready to swap the mock LLM/tool functions.

Render spins up:

- `vivi-api` — Python web service running `uvicorn backend.api:app`.
- `vivi-web` — Static site that serves the Vite build from `frontend/dist`.

---

## Extending to Production

- Replace `backend/tools.py` stubs with live integrations (Supabase for profiles, Google Places/Eventbrite/Meetup for activities, TikTok/Reddit scrapers for vibe validation).
- Swap `llm_json` in `backend/agents.py` with calls to Gemini Flash or Claude 3.5 via function calling.
- Add embeddings via `sentence-transformers` to compute merge weights and history-aware recommendations.
- Wire a scheduler agent to auto-create calendar invites or group texts (e.g., via Twilio).
- Expand frontend with authentication, saved crews, and “auto-nudge” predictions (“You and @Rajesh are free Sunday; want a mindful hike?”).

---

## Hackathon Pitch Snapshots

- **Concept** — Vivi mediates “What should we do?” decisions better than any group chat.
- **Agent Graph** — Listener → Profile → Merge → Explorer → Writer → Scheduler.
- **Demo Flow** — natural language mood input → structured intent → merged taste graph → ranked experiences with vibe scores.
- **Next** — Voice concierge, trust graphs, cross-city itineraries, and automated booking concierge.

Bring the vibes, let Vivi orchestrate the rest. </>