# TacitSNS Design Sheet Notes

## Purpose
This document accompanies `design-sheet.html`.
Use it to record the design rules that should remain stable across the CHI prototype.

## Current Status
- Baseline scaffold created.
- Design context captured in `.impeccable.md`.
- First visual cleanup pass completed on onboarding and post-creation surfaces.

## Current Direction
- Primary users: small business owners with low design literacy
- Interface tone: clean, minimalistic, actually usable
- Target feel: premium editorial tool
- Mode target: light mode only for now
- Anti-reference: should not feel like obviously vibe-coded UI

## First Pass Decisions
- Use warm paper backgrounds rather than cold white dashboards.
- Use editorial serif headings with restrained sans-serif body text.
- Use deep teal as the primary action color instead of generic bright blue.
- Keep most surfaces neutral and let warmth appear as accent rather than full-screen tint.
- Use pill-shaped controls, quieter borders, and lower-contrast cards for a cleaner expert feel.
- Keep feedback semantics vivid and explicit, even if surrounding surfaces become quieter.
- Preserve the trace board's internal layout logic while restyling the shell around it.

## Capture Checklist
- Color tokens and semantic usage
- Typography hierarchy
- Button variants
- Button resting-state visibility and disabled-state treatment
- Hero CTA treatment for the main generation action
- Chips, badges, and feedback markers
- Inputs, sliders, and form control focus states
- Grid card behavior
- Scrollbar treatment for panels and long workflows
- Single-image editor layout
- Trace board node rules
- Modal spacing and sizing
- Empty/loading/error states

## Design Guardrails
- Reuse the current workshop demo language where possible.
- Avoid introducing a second, conflicting design system.
- Keep history/trace views visually explicit and stable.
- Primary actions must remain clearly visible without hover.
- The main generation CTA may use a stronger primary treatment than secondary primary buttons.
- Scrollbars should feel integrated into the paper/editorial surface rather than staying browser-default.
- Grids should read as quiet comparison tools, not loud gallery cards.
