# System Ownership

## Product-Level Subsystems

### 1. Intent Elicitation
- Scope: onboarding, brand knowledge capture, post goal input, scenario framing, goal hierarchy editing
- Why it exists: users start from tacit knowledge and vague goals, not explicit design instructions
- Current likely home: onboarding flow, brand input UI, future goal hierarchy components
- Preferred ownership: one agent owns the goal schema, UI flow, and persistence rules together

### 2. Goal Translation And Visual Strategy
- Scope: turning business goals into post goals, then into visual strategies the system can generate against
- Why it exists: the system must show how high-level goals became concrete visual tactics
- Preferred ownership: one agent owns goal-to-strategy mapping models, explanation copy, and related UI state

### 3. Multi-Option Generation And 2x2 Feedback
- Scope: 2x2 generation grid, image-level ratings, rationale display, batch-level branching, selective exploration
- Why it exists: preference emerges through comparison and structured reactions
- Current likely home: `frontend/src/components/PostGrid.tsx`, `frontend/src/components/PostStudio.tsx`, generation APIs
- Preferred ownership: one agent owns batch semantics and feedback encoding across frontend and backend

### 4. Dynamic Clarification Engine
- Scope: summarize, probe, clarify, challenge, commit triggers and question UIs
- Why it exists: user feedback can be vague, contradictory, under-specified, or level-ambiguous
- Preferred ownership: one agent owns trigger logic, question templates, and response parsing
- Notes: this should not be scattered into autocomplete, history, and generation files independently

### 5. Goal-To-Visual Sensemaking
- Scope: explanations for why an image was suggested, which visual elements relate to which goals, and how feedback was interpreted
- Why it exists: users need to understand system reasoning and challenge wrong interpretations
- Preferred ownership: one agent owns explanation models, highlight overlays, and evidence presentation

### 6. Traceboard And Preference Memory
- Scope: branching history, revoked or reinforced preferences, deltas between generations, timeline of evolving intent
- Why it exists: progress is not linear and prior feedback should remain visible and inspectable
- Current likely home: `frontend/src/components/history/*`, `frontend/src/components/PostStudio.tsx`
- Preferred ownership: one agent owns lineage semantics, node schemas, and history rendering together

### 7. Publishing And Platform Adaptation
- Scope: finalization, export, upload, platform-specific post variants, comparison across target platforms
- Why it exists: the system should connect exploration to an actual posting outcome
- Preferred ownership: one agent owns publishing workflows and platform-specific constraints

## Recommended Agent Ownership

### architect
- Owns: repo boundaries, extraction decisions, file size pressure, interface between subsystems
- Use when: a task crosses subsystems or a controller file is growing

### checkpoint_keeper
- Owns: commit timing and commit boundary quality
- Use when: a change is large enough that you might otherwise keep editing without a safe checkpoint

### intent_curator
- Owns: intent elicitation, goal hierarchy, and goal schema evolution
- Future code zone: onboarding UI, goal models, goal persistence

### generation_curator
- Owns: 2x2 batch generation semantics, feedback encoding, regeneration/exploration logic
- Current code zone: `PostStudio`, `PostGrid`, generation backend

### clarification_curator
- Owns: dynamic question triggers and structured follow-up prompts
- Future code zone: clarification engine, question components, trigger rules

### sensemaking_curator
- Owns: rationale generation, explanation rendering, goal-to-visual mapping
- Future code zone: explanation panels, overlays, reasoning services

### trace_guardian
- Owns: traceboard lineage, preference memory, history stability, deltas between generations
- Current code zone: `frontend/src/components/history/*`, relevant parts of `PostStudio`

### design_system_curator
- Owns: stable UI language, shared tokens, design sheet references, layout consistency
- Current code zone: `frontend/src/index.css`, component CSS, `docs/design-system/*`

### reviewer
- Owns: final correctness, regression, and test review before each checkpoint

## Commit Rhythm

### When To Commit
- after repo setup changes
- after a design-pass-only change
- after a bounded refactor that preserves behavior
- after a vertical feature slice is working
- after a risky bug fix with verified behavior

### When Not To Commit Yet
- when the diff mixes two subsystems and should be split
- when the trace/history behavior is broken mid-refactor unless you explicitly want a safety snapshot
- when a UI cleanup and logic rewrite are tangled together and should become two commits

## Linear Usage
- Make one Linear issue per subsystem-sized task, not per tiny file edit.
- Link each meaningful commit to one Linear issue or milestone in the commit message or PR notes.
- Use Linear for planning and grouping, and git commits for actual recoverable states.
- Do not rely on Linear instead of commit checkpoints.
