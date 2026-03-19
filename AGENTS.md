# AGENTS.md

## Project Context
This repository is the active CHI prototype branch for TacitSNS.
Treat the current workshop demo as the baseline system, not as throwaway code.

## Working Priorities
- Preserve useful structures and interaction patterns from the current demo.
- Prefer incremental refactors over broad rewrites.
- Keep the trace/history system stable and inspectable.
- When changing UI, extend the existing visual language unless a deliberate design pass says otherwise.

## Git Workflow
- Use small, focused commits.
- Separate setup commits from feature commits.
- Do not rewrite branch history unless explicitly requested.

## Design Workflow
- Keep a persistent design reference in `docs/design-system/design-sheet.html`.
- Keep accompanying notes in `docs/design-system/design-sheet.md`.
- Before major UI work, update those references or explain why they are stale.

## Validation
Before closing a change:
- run the relevant build or compile step
- check state persistence and history behavior if the task touches the trace system
- note any unverified API-dependent behavior clearly
