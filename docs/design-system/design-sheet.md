# TacitSNS Design Sheet Notes

## Purpose
This document accompanies `design-sheet.html`.
Use it to record the design rules that should remain stable across the CHI prototype.

## Current Status
- Baseline scaffold created.
- Design context captured in `.impeccable.md`.
- Product shell now includes mock login, brand setup, business-goal selection, post-goal workspace, and nested 2x2 studio entry.
- The goal hierarchy is now a first-class structural pattern, not just a content idea.
- Brand identity and brand positioning now live in one guided narrative field with autocomplete support.
- Custom business goals and custom post goals should use add-cards that open focused dialogs, not long inline form rows.
- Custom post-goal creation should branch first: `reference image` vs `text only`. Image-first creation should treat the uploaded example as the visual anchor for the resulting post-goal card.
- Post-goal recommendation cards should include visual preview blocks so the examples feel concrete before the user enters the studio.
- Goal setup should be staged, not collapsed: brand narrative -> business goals -> post goals -> main workspace.
- Business-goal selection should not be one large flat card grid. Use three layers instead: top recommendations, one compact row for the broader goal library, and a chosen-goal module that appears only after selection.
- Business-goal selection should stay close to a single-decision surface. Avoid extra confirmation modules when the selected state can live directly on the card.
- Business-goal selection should be framed as `system interpretation -> user confirmation`, not `ranked options -> pick one`.
- Users should choose one primary business goal at this step, while still being able to add a custom goal if the shared library misses their intention.
- The interface must explicitly distinguish `business goal` from `post goal`: business goal is why the brand is using SNS marketing, post goal is the specific kind of post to make next.
- Do not use `Top 1 / Top 2 / Top 3` style ranking language for macro goals. Use a subtle `Recommended` cue and a short `Why this fits` explanation instead.
- Keep the business-goal step visually light: avoid always-on summary strips, count chips, or multiple badges when one selected card can carry the state.
- Put the current brand snapshot on the intro side of the onboarding layout during goal selection so the decision surface can stay focused on the right.
- Label that left-side snapshot explicitly as `Your brand story`, with only the basic brand name, category, and story summary.
- Label that left-side snapshot explicitly as `Your brand narrative`, with only the basic brand name, category, and story summary.
- Custom business-goal entry should mirror the recommended-card structure: main goal, what it means, and why it fits. Only the main goal is required.
- Do not show recommendation chips inside the custom business-goal dialog.
- The onboarding industry field should feel like the same system as the rest of the UI: styled text input plus suggestion chips, with custom entry always allowed.
- Custom or user-added goals must appear explicitly as the user’s own confirmed goals, not be visually absorbed into the recommendation language.
- Custom business goals should live in a separate `Custom goals` area and must not displace or rewrite the system-recommended business goals.
- The selected post-goal folders should read as the primary working set, with recommendations visually demoted beneath them.
- Onboarding should keep explanation light so the guided narrative field remains the dominant action on the page.

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
- Limit the system to three button families: primary CTA, secondary surface button, and choice/chip button.
- Use sentence-case for primary and secondary buttons; reserve uppercase pressure for labels and compact choice controls.
- Do not use white or near-white text on small teal pills, chips, or status tags. Reserve inverted accent treatments for large primary CTAs only.
- Do not use soft teal text on tinted teal backgrounds for small UI either. Small badges, count chips, rank pills, and inline actions should use near-ink text with clear contrast.
- Small selected states should prefer light accent fills with dark ink or dark teal text over dark accent fills with pale text.
- Ready-state helper text on light surfaces should also use near-ink text, not accent-colored text alone.
- Reduce right-rail and helper-panel chrome so guidance does not compete with the main workspace.
- Treat the product shell as a hierarchy-first experience:
  login -> brand setup -> business goals -> post-goal workspace -> studio / traceboard.
- Onboarding is now the full hierarchy setup:
  brand narrative -> business goal -> post goals -> workspace -> studio / traceboard.
- Business goals should be broad, outcome-based, and readable in plain language before any taxonomy appears.
- Business-goal recommendations must stay at the macro SNS marketing level and should never drift into obvious post-goal suggestions like founder intro, process showcase, or customer proof.
- Post goals should read like folders written in user language, with taxonomy tags shown as supporting metadata underneath.
- Post-goal onboarding should preview concrete example directions visually, using example tiles or placeholder frames, before the user enters the workspace.
- Post-goal onboarding must explicitly bridge from brand narrative + business goal -> specific image directions, so users understand that post goals are narrower visual explorations, not another broad strategy step.
- Chosen post goals should feel like deliberate selections that will become workspace folders; users should be able to add, adjust, and remove them before entering the workspace.
- Suggested post goals should be inspectable before selection: users should be able to click into a suggested direction, see example imagery and taxonomy meaning, and then choose it with confidence.
- Suggested post goals should attempt an AI-backed pass first, but must always fall back to a deterministic library so the onboarding step never appears empty.
- Users should also be able to attach their own reference image to a post goal; that uploaded reference should travel with the chosen folder as a visual anchor for later generation.
- The autocomplete field should look like the same editorial system as the rest of the app and must not clip its hover surfaces or tooltips.
- Step markers and hierarchy numbers must have explicit resting-state contrast; progress indicators cannot rely on subtle tint alone.
- Step markers must visually separate `active`, `completed`, and `upcoming` states. Active gets the strongest emphasis, completed resolves into a quieter confirmed state, and upcoming remains neutral.
- Progress numbers themselves must always keep readable contrast; do not let soft fills or ambient rings reduce numeral legibility.
- Sliding transition layers should be non-interactive while they animate so one click can never trigger two steps.
- Workspace panels should feel like an expert planning surface, not a chat toy or generic dashboard.
- Keep feedback semantics vivid and explicit, even if surrounding surfaces become quieter.
- Preserve the trace board's internal layout logic while restyling the shell around it.

## Capture Checklist
- Color tokens and semantic usage
- Typography hierarchy
- Button variants
- Button resting-state visibility and disabled-state treatment
- Hero CTA treatment for the main generation action
- Mapping from component-specific class names to the three canonical button families
- Chips, badges, and feedback markers
- Inputs, sliders, and form control focus states
- Login shell and onboarding shell patterns
- Goal hierarchy summary and sidebar hierarchy treatment
- Workspace composer, recommendation cards, and folder cards
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
- The main generation CTA should use a clearly higher-contrast hero treatment than secondary primary buttons.
- Do not create new button looks for individual features; reuse one of the three canonical families.
- Scrollbars should feel integrated into the paper/editorial surface rather than staying browser-default.
- Grids should read as quiet comparison tools, not loud gallery cards.
- The main workspace should privilege structure over decoration: one clear active business goal, visible post-goal folders, and a direct path into the studio.
- Taxonomy language supports the interface but should not lead it; surface user-language goals first.
