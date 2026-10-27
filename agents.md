# agents.md — how work is done in muse-eternal

This file governs this repository. Every other doc here must agree with it.
On any conflict between docs, **agents.md wins** until agents.md itself is
amended — and amending agents.md needs the owner's explicit tap.

## Doc map and maintenance

- `README.md` — entry point and doc map.
- `phases.md` — phase plan, status, gates. A phase is done only when its
  verification evidence exists (tests, builds, smoke), not when code merely
  exists.
- `architecture.md` — stack, layout, binding technical rules.
- `decisions.md` — the only place decisions are recorded. If it is not in
  `decisions.md`, it is not decided.
- `brain.md` — living status. Update it whenever status changes: a phase
  completes, a decision lands, a flag opens or closes.
- Canonical specifications live in Notion ("muse eternal"). Repo docs
  interpret them and never contradict them.

## Documentation sync rule

All files stay in sync with each other, and with this file. This rule
binds every task, including code tasks:

- **Update together.** Every implementation task updates every doc it
  affects, in the same change: the task's own docs, `brain.md`, and the
  manifest (`docs/DOCUMENTATION_INDEX.md`) status entries. Doc updates
  are part of the task, never a follow-up.
- **No contradictions.** No doc may contradict agents.md or
  `decisions.md`. On conflict, agents.md wins until agents.md itself is
  amended (which needs the owner's explicit tap).
- **Placeholders.** A file not needed yet is created as an empty file
  with the standard placeholder header (status PLACEHOLDER, needed-when,
  purpose, sync rule) — this is the "needed while developing" rule. A
  placeholder is never cited as a completed document. It is filled only
  in its phase, and filling flips its status to WRITTEN with the
  manifest and `brain.md` updated in the same change. These headers are
  status labels for not-yet-written docs, not product placeholders:
  they carry no fake content. (See the production-readiness rule
  below, which governs the shipped product.)
- **Manifest discipline.** `docs/DOCUMENTATION_INDEX.md` is updated
  whenever a file is added, removed, renamed, or changes status. A doc
  that does not apply is recorded there as EXCLUDED with its reason —
  never silently dropped. A genuinely new doc may be added when a gap is
  found; the manifest, the README map, and `brain.md` are updated in the
  same change.
- **Sync check before reporting.** Before any task is reported done,
  verify the affected docs agree with each other and with agents.md —
  not just the file that was edited.

## Working rules

- **Spec-first.** Build from the spec, never by porting old code verbatim.
  The previous implementation line (`eternalmu`) is reference-only: read it
  to understand, re-derive from the spec to build. Never copy its code,
  collections, or wording into this repo.
- **Proposal before building.** Structure and scope are proposed and tapped
  before work starts. Ask first when the shape of the work is in question.
- **A tap authorises one step.** A terse approval ("go", "proceed", "apply
  all ★") authorises only the next concrete step inside the recommended
  sequence. It never overrides an advised guardrail or wait, and never
  authorises deletion, a push, or a new phase. Exception: the
  muse-eternal project goal (owner direction 2026-10-27) authorises
  autonomous progression across tasks and phases; it does not authorise
  deletion, pushes, or overriding a guardrail.
- **Depth over summary.** Consolidated docs carry full content, never
  summaries. Gaps are named, never silently filled.
- **No invention.** No invented numbers, prices, vocabulary values, fields,
  or tiers. An empty-vocabulary field stays optional. A proposed value is
  never silently promoted to a decided one.
- **Production-ready, no fakes (owner direction 2026-10-27).** The
  shipped product contains no placeholders, no TODO/FIXME markers left
  in committed code, no stubs, no "coming soon" surfaces, and no mock,
  hardcoded-mocked, or dummy data — in code, UI, or API responses.
  Everything merged is production-ready end to end (API + validation +
  tests + build + smoke). Concretely: an unbuilt route does not exist
  (404), never a fake 200; an unbuilt surface does not appear in nav;
  an empty state shows a real empty state ("No entries yet"), never
  fabricated rows; no lorem ipsum, no hardcoded content rows, no fake
  counts or names served as content. Open work lives in `phases.md` /
  `brain.md` / goal tracking, never as code comments. When data is
  needed for development or demo, it lives ONLY in seed files under
  `api/prisma/seed/` (one file per module plus a loader), each headed
  "SEED DATA — development/demo only; delete this file to remove it".
  Seed files are never imported by production code paths; the seed
  runner is a dev-only entry point, never wired into app startup and
  never run in production. Removing seed data means deleting the file
  and dropping it from the loader — nothing else to hunt down. No seed
  files exist until data is actually needed. NOT violations of this
  rule: test doubles inside spec files (tests only, never shipped),
  and sample content in design mockups/artifacts that is labeled as
  sample (never shipped as product). This rule governs the shipped
  product; the Documentation sync rule's PLACEHOLDER headers above are
  status labels for not-yet-written docs, not product placeholders.
- **DRAFT is not approval.** A document marked DRAFT is a working draft even
  when every open item inside it is decided. Approval is explicit, per doc
  or in bulk.
- **Verify before reporting.** No step is reported complete without its
  evidence: tests green, builds pass, smoke checks pass, live pages
  re-fetched where a publish is claimed. A tool's success message is not
  verification.
- **No commit or push without a tap.** Nothing is committed or pushed on
  the agent's own initiative. Deletion of any kind needs an explicit word
  for exactly what is deleted.
- **Credential hygiene.** A secret supplied in chat is used once for exactly
  what was asked, never stored, never repeated, and its revocation step is
  named once.
- **Status, compactly.** Surface honest status and short options with the
  most-recommended marked ★ when a choice is genuinely open. Where no
  recommendation is supported by evidence, say so plainly and offer no ★.

## Standing project rules (carried, not re-decided here)

- Tiers: Free < Seva < Premium < Ultra. Ultra is per-asset,
  platform-exclusive content. No price is decided; price seeds stay empty
  and prices are decided at pre-launch.
- AI is editor-assist only (ADR-010): AI may draft or suggest inside the
  editor's workflow; nothing AI-generated is saved, applied, or published
  without explicit editor action, and AI-assisted content passes S32
  review. Autonomous AI (auto-publish, auto-apply, visitor-facing AI
  generation) is banned.
- S32 (Editorial Workflow & Versioning) governs content records, not media
  file rows. The deterministic knot/grid carve-out (D-05) stands.
- Doctrinal claims are labelled by school. Wellness, jyotish, and vastu
  content carries disclaimers. Haridasa and Haridasi are separate taxonomy
  nodes, never merged.
- One canonical master per entity; everything else links or is a view.
- Tab counts grow as depth requires; no tab count is fixed.
