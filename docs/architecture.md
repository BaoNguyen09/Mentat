# Mentat MVP Architecture

Mentat ships as a single Cloud Run service for the hackathon MVP:
- the React PWA is built into `apps/web/dist`
- the Hono API serves REST routes, WebSocket upgrades, and the static web build
- Gemini Live handles real-time audio/video coaching
- Firestore is optional in production, with a local JSON repository fallback for development

## System view

```mermaid
flowchart LR
  User["Phone Browser (PWA)"] --> UI["React Web App"]
  UI --> REST["Hono REST API"]
  UI --> WS["WebSocket /ws/session"]
  REST --> Memory["Session Context + Progress Reads"]
  WS --> Bridge["Live Session Bridge"]
  Bridge --> Gemini["Gemini Live API"]
  REST --> Finalize["Post-session Memory Pipeline"]
  Finalize --> Repo["Firestore or Local JSON Store"]
  Memory --> Repo
  Finalize --> Repo
```

## Live coaching flow

```mermaid
sequenceDiagram
  participant User
  participant Web as Phone PWA
  participant API as Hono API
  participant Live as Gemini Live
  participant Store as Firestore/Local Store

  User->>Web: Start session
  Web->>API: POST /api/sessions/start
  API->>Store: Load recent summaries + latest fix list
  API-->>Web: sessionId + wsUrl
  Web->>API: Open WebSocket
  API->>Live: Create live session with prompt + memory digest
  Web->>API: Stream camera frames + mic audio
  API->>Live: Forward realtime audio/video
  Live-->>API: Coach audio, transcripts, readiness cues
  API-->>Web: session-status, readiness-update, coach-text/audio
  User->>Web: End session
  Web->>API: POST /api/sessions/finalize
  API->>Live: Close live bridge
  API->>API: Generate summary + fix list + validation
  API->>Store: Save session memory + refresh progress
  API-->>Web: Final summary for dashboard
```

## Deployment shape

```mermaid
flowchart TD
  Build["npm run build"] --> Image["Docker build"]
  Image --> CloudRun["Cloud Run service"]
  CloudRun --> Vertex["Gemini Live / Gemini Flash"]
  CloudRun --> Firestore["Firestore (optional)"]
  CloudRun --> Browser["Phone browser clients"]
```

## Notes

- The readiness gate is part of the live bridge, not just the UI. The session stays in `readiness` until framing, racket visibility, and stance are confirmed.
- The post-session memory pipeline writes:
  - validated session summary
  - compressed summary for future context
  - fix list
  - derived progress snapshot
- The local fallback repository lives under `apps/api/data/` and is ignored by git.
