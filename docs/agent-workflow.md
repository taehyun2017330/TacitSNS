# Agent Workflow

## Baseline Branch
- Active baseline branch: `codex/chi-system-foundation`
- Use small, focused commits for major system changes so older checkpoints remain easy to revisit.

## Recommended Operating Model
- Use one main agent as the integrator and decision-maker.
- Use read-only agents to gather evidence before editing large or cross-cutting areas.
- Use write-capable workers only for bounded slices with a disjoint ownership zone.
- Keep one commit per meaningful checkpoint: setup, refactor, feature slice, verification, design pass.

## Persistent Agent Roles
- `architect`: protects code boundaries, flags oversized context sinks, and recommends extractions before they become painful.
- `explorer`: traces the real execution path and gathers file-level evidence.
- `trace_guardian`: reviews lineage, node creation, feedback persistence, and history-board semantics.
- `reviewer`: checks correctness, regressions, security, and missing tests before a checkpoint lands.
- `docs_researcher`: verifies framework or API behavior against documentation before implementation depends on it.

## Ownership Zones
- `workspace-trace`: `frontend/src/components/PostStudio.tsx`, `frontend/src/components/PostGrid.tsx`, `frontend/src/components/history/*`
- `prompt-autocomplete`: `frontend/src/components/BrandAutocomplete.tsx`, `backend/routers/autocomplete.py`, `backend/services/autocomplete_service.py`, `backend/autocomplete-server.js`
- `image-generation`: `backend/main_simple.py`, `backend/image_generation_final.py`, `backend/services/gemini_service.py`
- `design-system`: `frontend/src/index.css`, component CSS files, `docs/design-system/*`

## Default Allocation Rules
- Do not have two workers edit the same ownership zone at the same time.
- If a task touches `workspace-trace`, run `trace_guardian` before closing it.
- If a task touches an external library, model API, or framework behavior, run `docs_researcher` before relying on assumptions.
- If a task adds logic to a file that already acts like a controller, ask `architect` first whether the logic should be extracted.
- Use `reviewer` before committing any non-trivial change.

## Current Refactor Pressure Points
- `frontend/src/components/BrandAutocomplete.tsx` is the main prompt-system context sink.
- `frontend/src/components/PostStudio.tsx` is the main workspace and trace coordinator.
- `frontend/src/components/PostGrid.tsx` mixes rendering with branching and feedback behavior.
- `backend/main_simple.py` still mixes app setup and product logic.
- `backend/image_generation_final.py` mixes provider integration, fallback utilities, and delta logic.

## Installed Design Skills
Impeccable is installed project-locally in `.agents/skills/`.

Most relevant first commands:
- `$teach-impeccable`
- `$audit`
- `$arrange`
- `$typeset`
- `$clarify`
- `$polish`
- `$extract`

## Installed Engineering Skills
ECC Codex scaffolding is installed project-locally.

Most relevant first skills for this repo:
- `$frontend-patterns`
- `$backend-patterns`
- `$api-design`
- `$tdd-workflow`
- `$verification-loop`
- `$documentation-lookup`
- `$deep-research`
- `$security-review`
- `$search-first`

## Recommended Next Sequence
1. Run `architect` once on the current UI/backend hotspots before the next major feature slice.
2. Run `$teach-impeccable` against the current UI and write `.impeccable.md`.
3. Clean up the current interface without changing core behavior yet.
4. Update `docs/design-system/design-sheet.html`.
5. Update `docs/design-system/design-sheet.md`.
6. Commit that design pass as its own checkpoint.

## Practical Workflow For This Repo
1. Main agent scopes the task and assigns a single ownership zone.
2. `explorer` or `architect` checks the affected files if the task is large.
3. A worker implements only that bounded slice.
4. `trace_guardian` runs if history or branching behavior changed.
5. `reviewer` runs before commit.
6. Main agent verifies build/compile behavior and creates a small commit.

## Design References
- `docs/design-system/design-sheet.html`
- `docs/design-system/design-sheet.md`
- `AGENTS.md`
- `.codex/AGENTS.md`
