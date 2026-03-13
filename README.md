# Mentat

Mentat is a real-time multimodal life coach built for the Gemini Live Agent Challenge. It uses phone camera + microphone to coach table tennis technique through live video analysis, then remembers your progress across sessions.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Phone Browser (PWA)            │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Camera   │  │ Audio    │  │ Coach UI      │ │
│  │ (1fps)   │  │ (16kHz)  │  │ + Readiness   │ │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘ │
│       └──────┬───────┘                │         │
│              ▼                        ▲         │
│       WebSocket (/ws/session)         │         │
└──────────────┼────────────────────────┼─────────┘
               │                        │
┌──────────────▼────────────────────────┼─────────┐
│              Hono API (port 8000)               │
│  ┌───────────────────┐  ┌──────────────────┐    │
│  │ Live Session      │  │ REST Routes      │    │
│  │ Bridge (WS)       │  │ /api/sessions/*  │    │
│  │                   │  │ /api/progress/*  │    │
│  │ ┌───────────────┐ │  └───────┬──────────┘    │
│  │ │ Gemini Live   │ │          │               │
│  │ │ (audio+video) │ │          ▼               │
│  │ └───────────────┘ │  ┌──────────────────┐    │
│  └───────────────────┘  │ Post-Session     │    │
│                         │ Pipeline         │    │
│  ┌───────────────────┐  │ ┌──────────────┐ │    │
│  │ Prompt Layers     │  │ │ Gemini Flash │ │    │
│  │ identity.ts       │  │ │ (summary +   │ │    │
│  │ personality.ts    │  │ │  fix list)   │ │    │
│  │ table-tennis.ts   │  │ └──────────────┘ │    │
│  │ + accountability  │  └───────┬──────────┘    │
│  └───────────────────┘          │               │
│                                 ▼               │
│                         ┌──────────────────┐    │
│                         │ Firestore        │    │
│                         │ (sessions,       │    │
│                         │  profiles,       │    │
│                         │  progress)       │    │
│                         └──────────────────┘    │
└─────────────────────────────────────────────────┘
```

## MVP Features

- **Live coaching**: Real-time video + audio coaching via Gemini Live API
- **Pre-session readiness**: Framing, racket, and stance checks before coaching starts
- **Post-session memory**: AI-generated summary, scores, and fix list after each session
- **Cross-session accountability**: Prior fix list loaded into next session's coaching context
- **Progress dashboard**: Streak, session count, and recent session history

## Workspace

| Package | Description |
|---------|-------------|
| `apps/api` | Hono backend, Gemini Live bridge, post-session pipeline |
| `apps/web` | React PWA frontend (mobile-first) |
| `packages/types` | Shared TypeScript contracts |

## Local Setup

### Requirements

- Node.js 22+
- npm 11+
- A Gemini API key (optional — falls back to mock bridge)

### Install

```bash
npm install
```

### Environment

```bash
cp apps/api/.env.example apps/api/.env
```

Set at least:

```env
GEMINI_API_KEY=your_key_here
PORT=8000
```

If `GEMINI_API_KEY` is empty, Mentat runs in mock mode — camera, mic, UI, and finalize all still work.

For Firestore persistence (optional):

```env
FIREBASE_PROJECT_ID=your_project
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

Without Firestore config, session data persists in-memory (resets on server restart).

### Seed demo data

```bash
cd apps/api && npm run seed
```

Creates the Alex demo user with 3 historical sessions and progress data.

### Run

Terminal 1 (API):
```bash
cd apps/api && npm run dev
```

Terminal 2 (Web):
```bash
cd apps/web && npm run dev -- --host 0.0.0.0 --port 5173
```

Open `http://127.0.0.1:5173` on desktop or your phone (same network).

### Typecheck

```bash
npm run typecheck
```

## Demo Script

### Setup (before demo)

1. `npm install` and `npm run seed` in `apps/api`
2. Set `GEMINI_API_KEY` in `apps/api/.env`
3. Start both servers
4. Open on phone browser, install PWA ("Add to Home Screen")

### Demo flow (3 minutes)

1. **Open Mentat** — show it loads as a standalone PWA on phone
2. **Enter user ID** `alex-demo` — show context loads with accountability from prior sessions
3. **Pick personality** (sensei) — start session
4. **Readiness check** — Mentat asks to see full body, racket, and stance before coaching
5. **Live coaching** — point camera at table tennis practice, Mentat gives real-time corrections
6. **End session** — show the 4-step finalize animation: close loop, score, fix list, refresh memory
7. **Post-session review** — show the generated summary, scores, and drill-specific fix list
8. **Progress dashboard** — show streak, session count, and that memory persists

### Key talking points

- "Mentat remembers" — show accountability items loading from prior sessions
- "Coach, not chatbot" — readiness gate + one-fix-at-a-time philosophy
- "Real multimodal" — live video frames + audio streaming to Gemini Live API
- "Memory pipeline" — Gemini Flash generates structured summaries, stored in Firestore

## Deployment (Cloud Run)

```bash
# Build
docker build -t mentat .

# Tag and push
docker tag mentat gcr.io/YOUR_PROJECT/mentat
docker push gcr.io/YOUR_PROJECT/mentat

# Deploy
gcloud run deploy mentat \
  --image gcr.io/YOUR_PROJECT/mentat \
  --port 8080 \
  --set-env-vars "GEMINI_API_KEY=your_key,FIREBASE_PROJECT_ID=your_project" \
  --allow-unauthenticated \
  --region us-central1
```

## Notes

- The hackathon MVP is scoped to table tennis. The Domain type supports 6 life domains for future expansion.
- Without Gemini credentials, the mock bridge provides the same session lifecycle for local testing.
- The service worker caches the app shell for offline launch, but live coaching requires an active connection.
