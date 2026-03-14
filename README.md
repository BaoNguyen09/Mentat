# Mentat

Mentat is a real-time multimodal coaching app built for the Gemini Live Agent Challenge. The current repo is a table-tennis-first MVP with a live session shell, readiness gate, post-session memory, and voice-tracked domain knowledge that syncs into Obsidian.

## What it does right now

- Starts a live camera + microphone coaching session from the browser
- Uses Gemini Live when `GEMINI_API_KEY` is set, otherwise falls back to a mock bridge
- Runs a readiness gate before coaching starts
- Finalizes sessions into summaries, fix lists, and progress updates
- Captures domain knowledge by voice or text
- Syncs saved knowledge into your Obsidian vault as markdown pages

## Workspace

| Package | Description |
| --- | --- |
| `apps/api` | Hono backend, live bridge, knowledge routes, Obsidian sync |
| `apps/web` | React frontend |
| `packages/types` | Shared TypeScript contracts |

## Requirements

- Node.js 22+
- npm 11+
- Optional Gemini API key

## Install

```bash
npm install
```

## Environment

Create `apps/api/.env` from `apps/api/.env.example`:

```env
GEMINI_API_KEY=
GOOGLE_CLOUD_PROJECT=
FIRESTORE_EMULATOR_HOST=
PORT=8000
```

Notes:

- `GEMINI_API_KEY` is optional. If blank, the app still runs in mock mode.
- Leave `FIRESTORE_EMULATOR_HOST` blank unless you wire Firestore later.
- The current web app is single-user by default. It binds to one local profile and does not ask for a visible user ID.

## Run locally

Terminal 1:

```bash
cd apps/api
npm run dev
```

Terminal 2:

```bash
cd apps/web
npm run dev -- --host 0.0.0.0 --port 5173
```

Open:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8000`

The Vite dev server proxies `/api` and `/ws` to the API automatically.

## Where data is stored

Local store:

- `C:\Users\loqpm\Documents\GitHub\Mentat\apps\api\data\local-store.json`

Obsidian sync output:

- `C:\Users\loqpm\Documents\Projects\Obsidian Vault\Projects\Mentat\Knowledge\`

## Voice knowledge flow

1. Open the app.
2. Go to the Knowledge card.
3. Pick a domain and subdomain, for example `Sports / Chess`.
4. Click `Start voice capture`.
5. Speak your update.
6. Stop capture and click `Save knowledge`.

Mentat will:

- store the transcript
- extract a summary
- extract key points
- detect a next action if present
- sync the resulting markdown into Obsidian

## Useful commands

```bash
npm run typecheck
npm --workspace apps/api run build
npm --workspace apps/web run build
```

## Notes

- The current hackathon MVP is still table-tennis-first for the live coaching flow.
- Knowledge capture already supports broader domains such as sports, work, learning, home, and health.
- Firestore is optional and not required for the current local setup.
