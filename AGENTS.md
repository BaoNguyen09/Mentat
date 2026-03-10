# AGENTS.md

## Project Goal

Mentat is a table-tennis-first AI sports coach for the Gemini Live track. The demo priority is real-time multimodal coaching. Memory is the differentiator that makes the coach feel continuous across sessions.

## Locked MVP Scope

- Build one sport well: table tennis only
- Keep a shared coaching core plus one table-tennis module
- Support post-session scoring, fix list generation, compressed summaries, and next-session accountability
- Support a small progress/dashboard read model
- Do not add journaling, additional sports, or a web-research agent unless explicitly requested

## Ownership Split

- Teammate area: live Gemini session bridge, video/audio feed integration, real-time interaction loop, coaching delivery UX
- Your area: memory layer, prompt architecture, repositories, post-session pipeline, progress data, shared contracts
- Shared area: root workspace config, `packages/types`, prompt interfaces, end-to-end flow contracts

## Async Collaboration Rules

- Read this file before making structural changes
- Do not rewrite another person's area unless the contract requires it
- When you change a shared contract, update both the calling code and the contract definition in `packages/types`
- Prefer additive changes over broad rewrites during the hackathon
- Keep the architecture simple: one `Hono` backend, synchronous post-session processing, minimal derived Firestore read model

## Prompt Architecture

- Shared core prompt handles identity, tone, interruption behavior, memory injection, and safety boundaries
- Sport modules provide sport-specific mechanics, scoring emphasis, common mistakes, and corrective drills
- MVP module: `table-tennis`

## File Ownership Guide

- `apps/api/src/ws/**`: teammate-led unless shared interface work is needed
- `apps/api/src/prompts/**`: your area
- `apps/api/src/services/**`: mostly your area, except live session transport concerns
- `apps/api/src/repositories/**`: your area
- `apps/web/src/hooks/useSession.ts`: shared integration point
- `packages/types/**`: shared contract surface; change carefully

## Working Style For AI Agents

- Make focused changes tied to the current MVP scope
- Call out contract changes clearly in your final message
- Add tests when touching memory flow or shared parsing logic
- Avoid speculative abstractions; leave obvious extension points instead
