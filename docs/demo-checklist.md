# Mentat Demo Checklist

## Dry run setup

1. `npm install`
2. `npm --workspace apps/api run seed`
3. Set `apps/api/.env`
4. Start the API: `cd apps/api && npm run dev`
5. Start the web app: `cd apps/web && npm run dev -- --host 0.0.0.0 --port 5173`
6. Open the phone on the same network
7. Use `alex-demo`

## Demo story

1. Show the phone-first PWA and mention that it is the same deployable app served from Cloud Run.
2. Load `alex-demo` and point out the memory digest, current accountability focus, and recent progress.
3. Start a live session and let Mentat sit in the readiness state first.
4. Show Mentat asking for:
   - full body in frame
   - racket visibility
   - usable ready stance
5. Once readiness passes, start the live coaching exchange.
6. End the session and show the explicit post-session pipeline.
7. Land on the summary, fix list, and progress dashboard.
8. Close with: Mentat remembers the last session and uses it immediately in the next one.

## Backup plan

- If Gemini Live is unavailable, set `MENTAT_USE_MOCK_LIVE=1`.
- The mock bridge still demonstrates:
  - readiness gating
  - live session lifecycle
  - post-session memory pipeline
  - progress continuity

## Demo risks to check before recording

- Camera permissions are granted
- Mic permissions are granted
- `alex-demo` seed data exists
- The API and web app are using the same code revision
- If using real Gemini, credentials are loaded and the provider is not falling back unexpectedly
