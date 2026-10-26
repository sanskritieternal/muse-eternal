# brain.md — living project memory

Update this file whenever status changes (per `agents.md`). Status lines
carry dates; nothing here is a decision unless it also appears in
`decisions.md`.

## Current status (2026-10-27)

- Repository `muse-eternal` created empty; doc spine committed locally
  (Phase 0): `README.md`, `agents.md`, `phases.md`, `architecture.md`,
  `decisions.md`, this file, `.gitignore`.
- No application code yet. No database. No deployment. Spine and doc
  tree pushed to GitHub (4b95ba4, 4c2bf7a; further pushes need the token
  supplied again per push).
- Previous implementation line (`eternalmu`, local tree only, unpushed):
  reference-only, not a source. Its work is not carried over.
- Enterprise doc tree (`docs/`): 440 placeholders + manifest
  (`docs/DOCUMENTATION_INDEX.md`) + module mapping, created 2026-10-27
  from the uploaded master list (adapted; exclusions and source-total
  reconciliation in the manifest), committed locally 2026-10-27 (4c2bf7a).

## Next

- Phase 1 DONE 2026-10-27 (parent-verified): four 00_Project_Foundation
  docs (ARCHITECTURE_OVERVIEW, TECH_STACK, FOLDER_STRUCTURE,
  PROJECT_SCOPE) filled from placeholders; manifest counts updated (436
  placeholders). Phase 2 NEXT: API foundation + G01 glossary public
  reads (first slice = G01; model in Phase 2, staff CRUD + S32 in Phase
  3); begins after the Phase 1 commit.

## Open items and flags

- S33 joint confirmation on the per-locale workflow-state map.
- s04-vs-s01 Admin submit/approve conflict (matrix governs).
- MFA for elevated accounts (not implemented anywhere yet).
- Service keys (later phase).
- Break-glass scope (Super Admin only until widened by decision).
- Schedule-publish, version-restore, SEO gate, specialist triggers.
- Owner-gated content stays blocked: unresolved relations, no-source
  items, unapproved vocabulary, ratified codes, blocking links.
- Skeleton/index-only modules (C24–C33) need an editorial brief plus a
  tap each before any promotion.

## Numbers pending from the owner (do not invent)

- Search SLO values.
- AI-assist retention days.
- Re-notification interval (minutes) for unacknowledged Page-severity
  alerts.
- Hosting plan size and region.

## Pointers

- Specs (canonical): Notion "muse eternal".
- Previous line (reference only): local `eternalmu` tree — read to
  understand, never copy from.
- Hosting (decided): Hostinger + eternalsanskriti.com (plan/region open).
