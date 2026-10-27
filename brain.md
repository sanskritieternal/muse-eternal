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
  placeholders). Phase 2 DONE 2026-10-27 (parent-verified): NestJS API
  foundation + G01 glossary public reads (api/, 18/18 tests, build +
  no-DB smoke green; committed + pushed 2969ffe). Phase 3 DONE
  2026-10-27 (parent-verified): capability-based auth
  (JWT 15 min + rotating hashed refresh, argon2id, 5/15 lockout) +
  admin/ Next app (G01 only) + S32 workflow on G01 (staff CRUD, model
  completion #7/#9/repeaters, two-key publish, Super Admin break-glass,
  append-only versions, 72h reassign, 5-min autosave coalescing,
  roster-filtered reviewers); api 62/62 tests, both builds + both
  smokes green, uncommitted). Phase 4 NEXT: migration from S01.
- Design-system foundation written 2026-10-27
  (`02_Design_System/DESIGN_SYSTEM.md`, tokens PROPOSED): awaits
  alignment with the approved Puranas mockup + parent verification;
  component code lands after mockup approval.
- Production-readiness rule set 2026-10-27 (`agents.md` + `decisions.md`
  + `architecture.md` + design doc + phases gates): no placeholders,
  TODOs, stubs, "coming soon", or mock/dummy data in the shipped
  product; seed files under `api/prisma/seed/` when data is needed.

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
