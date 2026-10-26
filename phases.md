# phases.md — phase plan for muse-eternal

Fresh-start plan. Status is per phase; a phase is done only with its
verification evidence (tests, builds, smoke), per `agents.md`.

## Phase 0 — Documentation spine — DONE 2026-10-27

This file set (`README.md`, `agents.md`, `phases.md`, `architecture.md`,
`decisions.md`, `brain.md`, `.gitignore`), committed locally. No application
code yet.

## Phase 1 — Architecture skeleton — NOT STARTED

Repo layout, conventions, and the scope of the first slice, written and
tapped before code. Needs the owner's tap to begin.

## Phase 2 — API foundation + first content slice — NOT STARTED

NestJS API foundation (envelope, errors, public-read gating) plus the first
content slice's public reads. Needs Phase 1 done and its own tap.

## Phase 3 — Auth + admin + S32 on one module — NOT STARTED

Capability-based auth, staff admin app, and the S32 workflow (draft →
review → approve → publish, two-key publish, append-only versions) on a
single module first. Needs Phase 2 done and its own tap.

## Phase 4 — Module-by-module migration — NOT STARTED

Each module on its own tap, in this order:

1. Canonical masters first: G01 glossary, S01 persons, T01 temples, M10
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

- Each phase needs its own tap. A tap for one phase is not a tap for the
  next.
- No phase is reported done without tests, builds, and smoke evidence.
- Nothing is committed or pushed without a tap, per `agents.md`.
