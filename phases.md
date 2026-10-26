# phases.md — phase plan for muse-eternal

Fresh-start plan. Status is per phase; a phase is done only with its
verification evidence (tests, builds, smoke), per `agents.md`.

## Phase 0 — Documentation spine — DONE 2026-10-27

This file set (`README.md`, `agents.md`, `phases.md`, `architecture.md`,
`decisions.md`, `brain.md`, `.gitignore`), committed locally. Enterprise
doc tree (`docs/`, 440 placeholders + manifest + module mapping) created
2026-10-27 from the uploaded master list (adapted), committed locally
(4c2bf7a) and pushed to GitHub. No application code yet.

## Phase 1 — Architecture skeleton — DONE 2026-10-27 (parent-verified)

Repo layout, conventions, and the scope of the first slice, written and
verified before code. Delivered: ARCHITECTURE_OVERVIEW, TECH_STACK,
FOLDER_STRUCTURE, PROJECT_SCOPE (00_Project_Foundation) + manifest and
brain sync. Done-marked on parent verification under the project goal's
autonomy grant (verification is the gate; no separate tap).

## Phase 2 — API foundation + first content slice — NEXT (first slice: G01 glossary)

NestJS API foundation (envelope, errors, public-read gating) plus G01
glossary public reads. First slice = G01: it is first in the Phase 4
order, and no old-web readers exist in the fresh repo to justify any
other choice. The slice's Prisma model is a Phase 2 step (schema only,
no migration run). G01 staff CRUD + S32 land in Phase 3. Begins after
the Phase 1 commit, so the tree is clean.

## Phase 3 — Auth + admin + S32 on one module — NOT STARTED (one module: G01)

Capability-based auth, staff admin app, and the S32 workflow (draft →
review → approve → publish, two-key publish, append-only versions) on
G01: staff CRUD + S32 on the Phase 2 slice. Follows Phase 2.

## Phase 4 — Module-by-module migration — NOT STARTED

Each module in this order (autonomous under the project goal):

1. Canonical masters first: G01 glossary (covered by Phases 2–3: model,
   public reads, staff CRUD, S32, admin screens), then S01 persons, T01 temples, M10
   festivals, R01 rituals, J05 gemstones, K01 stories, AR05 ragas, AR06
   talas, AU01 audio, VD01 video.
2. Remaining content modules (C01–C23) plus Samskara, Deity, and Mantra as
   content.
3. System services: search, media pipeline, notifications, tiers and
   subscriptions enforcement, jobs (including the DailyPanchang job, which
   is job-generated data, not editorial content).

Each module: data model, public reads (published-only + tier-gated), staff
CRUD, S32 wiring, admin screens.

## Phase 5 — Legacy archive + website surfaces — NOT STARTED

Website surfaces for the migrated modules, and archiving of the previous
implementation line. Needs all migration waves verified plus an explicit
tap. Never before parity.

## Excluded from every phase

- Promotions of skeleton/index-only modules (C24–C33): each needs a
  qualifying editorial brief plus the owner's tap first.
- Owner-gated content: unresolved relations, no-source items, unapproved
  vocabulary, ratified codes, blocking links. Blocked items stay blocked;
  never filled by inference.
- Open decisions (see `decisions.md`): implemented around, never over.
- Live-environment work (stable database, migrations, seed, CI/CD wiring,
  restore test, monitoring with a test alert) waits on provisioned
  infrastructure; it is not part of any code phase's "done".

## Gates between phases

- Progression is autonomous under the project goal (owner direction
  2026-10-27): work moves across phases without a per-phase tap, and
  progress is reported at phase boundaries.
- No phase is reported done without its verification evidence (tests,
  builds, and smoke for code phases; manifest + brain + cross-check
  evidence for docs-only phases).
- Nothing is committed or pushed without a tap, per `agents.md`.
  Deletions still need an explicit word for exactly what is deleted.
  Owner-gated items stay gated.
