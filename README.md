# Mentat

Mentat is a table-tennis-first AI sports coach built for the Gemini Live Agent Challenge.

## MVP

- Live table tennis coaching with Gemini Live
- Post-session scoring, fix list, and memory
- Next-session accountability from saved context
- Progress dashboard data

## Workspace

- `apps/api`: Hono backend and Gemini Live session orchestration
- `apps/web`: React PWA frontend
- `packages/types`: shared TypeScript contracts

## Contract boundaries

The MVP contract surface lives in `packages/types` and is implemented by the route stubs in `apps/api/src/routes`.

### Live session transport owns

- `POST /api/sessions/start`
- websocket handoff via `wsUrl`
- live bridge state such as `connecting`, `active`, `error`, and `complete`
- real-time transport messages such as input audio/video, coach audio, transcripts, interruption, and bridge provider

### Post-session pipeline owns

- `POST /api/sessions/finalize`
- `SessionSummary`
- `FixItem[]`
- `GET /api/progress/:userId`
- progress snapshots, recent sessions, and accountability memory reads

### Shared contract rule

The live loop can stream and observe, but it should not rewrite the post-session summary schema.
The post-session pipeline can summarize and persist outcomes, but it should not change the websocket/live transport shape without updating `packages/types`.

## Local setup

### Requirements

- Node.js 22+ recommended
- npm 11+
- A Gemini API key if you want the real Live API path

### Install

From the repo root:

```bash
npm install
```

### Environment

Copy the API env example and fill in your values:

```bash
copy apps\\api\\.env.example apps\\api\\.env
```

Set at least:

```env
GEMINI_API_KEY=your_key_here
PORT=8000
```

Notes:

- `apps/api/.env` is loaded automatically by the API on startup.
- If `GEMINI_API_KEY` is empty, Mentat falls back to the mock live bridge so you can still test the flow locally.
- Leave `FIRESTORE_EMULATOR_HOST` empty for now. Firestore is not wired yet in the current MVP.

### Start the API

From `apps/api`:

```bash
npm run dev
```

The API runs at:

```text
http://127.0.0.1:8000
```

### Start the web app

From `apps/web`:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

The web app runs at:

```text
http://127.0.0.1:5173
```

### Run both

Open two terminals:

Terminal 1:

```bash
cd apps/api
npm run dev
```

Terminal 2:

```bash
cd apps/web
npm run dev -- --host 127.0.0.1 --port 5173
```

### Verify the app

1. Open `http://127.0.0.1:5173`
2. Enter a user id such as `alex-demo`
3. Pick a coaching personality
4. Start a session
5. Allow camera and microphone access
6. End the session to see the post-session analysis flow

If the Gemini key is configured correctly, the live session uses the real Gemini bridge.
If not, the same flow runs in mock mode so camera, mic, UI state, and finalize flow can still be tested.

## Build and typecheck

From the repo root:

```bash
npm run typecheck
npm run build
```

## Notes

- The hackathon MVP is intentionally scoped to one sport: table tennis.
- Journal support and a web-research agent are future extensions, not current scope.
