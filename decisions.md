# decisions.md — decision log

The only place decisions are recorded (per `agents.md`). If it is not
here, it is not decided. Dates are when the decision was tapped.

## Decided

- **2026-10-27 — Fresh start in muse-eternal.** This repository is the
  working line. Nothing is carried over from the previous implementation
  line; it stays reference-only. The doc spine (Phase 0) is the first
  commit.
- **2026-10-27 — Stack: NestJS + Next.js + PostgreSQL.** Prisma as ORM,
  Postgres-backed jobs, REST first, separate admin app.
- **2026-10-27 — Enterprise doc tree adopted (adapted).** The uploaded
  master list's structure is adopted as `docs/` (folders 00–31), with
  adaptations where it conflicts with decided facts: agents.md governs;
  the 112 phase documents are mapped, not duplicated; the 23 generic
  module names are superseded by the project module system; Hostinger
  replaces generic deployment targets; no Redis; AI files are
  editor-assist scope only (ADR-010). Exclusions and the source-total
  reconciliation are recorded in `docs/DOCUMENTATION_INDEX.md`.
- **2026-10-26 — Ultra tier.** A fourth tier above Premium: per-asset,
  platform-exclusive content in any format. No Ultra price decided.
- **2026-10-26 — Hosting: Hostinger + eternalsanskriti.com.** Provider and
  domain decided; plan size and region still open; nothing provisioned
  yet.
- **2026-10-26 — Notion canonical tree: "muse eternal".** Earlier trees
  (The eternal, eternalmu, Sanatan Dharma Platform) are superseded; create
  nothing like them. Specs live in "muse eternal".
- **2026-10-24 — ADR-010 amended: editor-assist AI only.** AI may draft or
  suggest inside the editor's workflow; nothing AI-generated is saved,
  applied, or published without explicit editor action, and AI-assisted
  content passes S32 review. Autonomous AI is banned.
- **2026-10-24 — Tab rule.** Tab counts grow as depth requires; no tab
  count is fixed.
- **2026-10-24 — T20 relationship vocabulary canonical.** Parent text ·
  Precursor · Supplement · Related themes · Analogous teaching. All other
  vocabulary entries stay optional until their owning editors rule.
- **2026-10-24 — Transliteration direction.** Roman/IAST → Devanagari is
  canonical.
- **2026-10-24 — D-05 carve-out stands.** Deterministic knot/grid content
  is exempt from the AI-assist rule under ADR-010.
- **2026-09-30 — Haridasa/Haridasi two-node rule.** Separate taxonomy
  nodes, never merged: Haridasa (South Indian Haridasa devotional
  tradition) vs Haridasi (Swami Haridas / Haridasi Sampradaya).
- **Standing — S32 scope.** S32 governs content records, not media file
  rows.
- **Standing — Vocabulary rule.** An unapproved vocabulary entry stays
  optional/nullable; an empty-vocabulary field is never enforced.
- **Standing — Price rule.** No price is decided anywhere; price data
  seeds empty; prices are decided at pre-launch through a versioned admin
  mechanism.
- **Standing — 301 mapping (implementation: Website batch).** W-1→13.1,
  W-2..W-10→13.27, W-11→13.30, W-12→13.26, W-13→13.28; R01→13.27, R02→13.30,
  R03→13.26, R04→13.28; the v1 page is never deleted.
- **DECIDED — Production-readiness rule (2026-10-27).** No placeholders,
  TODOs, stubs, "coming soon" surfaces, or mock/hardcoded/dummy data in
  the shipped product; everything merged is production-ready end to
  end. Data needed for development/demo lives only in seed files under
  `api/prisma/seed/` (dev-only entry point, never shipped, removable by
  deleting the file + loader entry). Test doubles and labeled mockup
  sample content are not violations; docs PLACEHOLDER headers are
  status labels, not product placeholders.

## Open (not decisions — implemented around, never over)

- S33 joint confirmation on the per-locale workflow-state map.
- The s04-vs-s01 conflict: one spec lists Admin as submitter/approver,
  the S01 capability matrix denies Admin content update/review. Guards
  follow the matrix until the owners reconcile.
- MFA for elevated (Super Admin / Admin) accounts.
- Service keys (later phase).
- Break-glass scope: one spec permits Admin, the narrowed rule is Super
  Admin only; widening is a later decision.
- Schedule-publish, version-restore, SEO pre-publish gate, specialist
  reviewer triggers beyond the general roster.
- Numbers pending from the owner: search SLO values, AI-assist retention
  days, re-notification interval for unacknowledged Page-severity alerts.
- Hosting plan size and region; CI/CD tooling; deploy windows; on-call
  roster (wiring time).
