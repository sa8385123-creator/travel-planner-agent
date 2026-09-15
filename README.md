# Travel Planner Agent — Agentic AI Assignment

A travel-planning AI agent built with the OpenAI Agents SDK, served by FastAPI,
with a Next.js chat frontend. Free stack end to end.

## Stack

- **Frontend:** Next.js (TypeScript, App Router)
- **Backend:** FastAPI
- **Agent framework:** OpenAI Agents SDK (Python)
- **LLM:** Groq (free, OpenAI-compatible API)
- **Short-term memory:** PostgreSQL (Neon, free tier) — active chat sessions, messages, in-progress trip draft
- **Long-term memory:** MongoDB (Atlas, free tier) — user preferences, past saved trips

## How the agent works

One orchestrating agent with tools:

| Tool | Purpose | Data source |
|---|---|---|
| `get_weather` | Weather for a city/date | Open-Meteo (free, no key) |
| `search_flights` | Flight options | Mock data |
| `search_hotels` | Hotel options | Mock data |
| `get_user_profile` | Read saved preferences | MongoDB |
| `save_preference` | Persist a new preference | MongoDB |
| `build_itinerary` | Compose the final day-by-day plan | Agent reasoning |

Postgres holds the *current* conversation/session state (short-term/working
memory). MongoDB holds anything that should survive across sessions
(long-term memory) — this split is what makes the project agentic rather
than a plain chatbot: the agent decides when to call which tool and what to
persist where.

## Folder structure

```
travel-planner-agent/
├── backend/
│   └── app/
│       ├── main.py              FastAPI entrypoint
│       ├── core/config.py       env/settings
│       ├── db/postgres.py       short-term memory connection
│       ├── db/mongo.py          long-term memory connection
│       ├── models/              SQLAlchemy + Mongo schemas
│       ├── agent/travel_agent.py  the agent definition
│       ├── agent/tools/         weather, flights, hotels, memory tools
│       ├── api/routes/chat.py   POST /chat endpoint
│       └── schemas/chat.py      request/response models
└── frontend/
    ├── app/                     pages (Next.js App Router)
    ├── components/              ChatWindow, MessageBubble
    └── lib/api.ts               calls the FastAPI backend
```

## Roadmap

| Day | Goal | Status |
|---|---|---|
| 1 | Accounts (Groq, Neon, Atlas) + minimal "hello world" agent script | ⬜ |
| 2 | FastAPI skeleton + DB connections working | ⬜ |
| 3 | Agent + all tools (weather real, flights/hotels mock) | ⬜ |
| 4 | /chat endpoint wired to agent, short-term memory in Postgres | ⬜ |
| 5 | Long-term memory in MongoDB (preferences, past trips) | ⬜ |
| 6 | Next.js chat UI connected to backend | ⬜ |
| 7 | Polish, error handling, README for submission | ⬜ |

## Setup (do this before Day 1 starts)

1. Groq API key → https://console.groq.com
2. MongoDB Atlas free cluster → https://www.mongodb.com/cloud/atlas/register
3. Neon Postgres free project → https://neon.tech
4. Python 3.11+, Node.js 18+, Git installed

Copy `backend/.env.example` to `backend/.env` and fill in the three values
once you have them.
