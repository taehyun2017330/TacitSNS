# AGENTS.md

## Project Context
This repository is the active CHI prototype branch for TacitSNS.
Treat the current workshop demo as the baseline system, not as throwaway code.

## Working Priorities
- Preserve useful structures and interaction patterns from the current demo.
- Prefer incremental refactors over broad rewrites.
- Keep the trace/history system stable and inspectable.
- When changing UI, extend the existing visual language unless a deliberate design pass says otherwise.

## Code Organization
- Keep components, hooks, services, and history logic compartmentalized as the repo grows.
- Avoid letting `PostStudio`, `BrandAutocomplete`, or backend entrypoints absorb new unrelated responsibilities.
- Prefer extracting helpers or submodules before a file becomes a persistent context sink.
- Treat trace/history semantics as a first-class system boundary, not incidental UI state.

## Git Workflow
- Use small, focused commits.
- Separate setup commits from feature commits.
- Do not rewrite branch history unless explicitly requested.
- Prefer checkpoint commits at stable milestones over saving every tiny edit.
- Before a commit, make sure the diff represents one coherent change: refactor, feature slice, bug fix, or design pass.

## Design Workflow
- Keep a persistent design reference in `docs/design-system/design-sheet.html`.
- Keep accompanying notes in `docs/design-system/design-sheet.md`.
- Before major UI work, update those references or explain why they are stale.

## Validation
Before closing a change:
- run the relevant build or compile step
- check state persistence and history behavior if the task touches the trace system
- note any unverified API-dependent behavior clearly
