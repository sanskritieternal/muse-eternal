# Project Scope

Status: WRITTEN (Phase 1 skeleton, 2026-10-27). Project scope and the
first-slice scope, matching `phases.md` exactly. Where `phases.md` is
ambiguous, this document flags it rather than resolving it.

## Project scope (the whole endeavour)

Build, from a fresh start in this repository, a Sanatan Dharma
editorial-CMS platform: an editorial CMS (admin panel), a public
website, and an API, for scriptures, temples, festivals, rituals,
saints, philosophy, and the arts — on the decided stack (NestJS API +
Next.js website and separate admin app + PostgreSQL, Prisma, REST
first, Postgres-backed jobs), under the decided rules (tiers Free <
Seva < Premium < Ultra with no prices decided; editor-assist AI only
under ADR-010; S32 workflow governing content records; one canonical
master per entity; doctrinal claims labelled by school; disclaimers on
wellness, jyotish, and vastu content).

The work proceeds in phases (see `phases.md`): Phase 0 documentation
spine (done), Phase 1 architecture skeleton (this document set),
Phase 2 API foundation + first content slice, Phase 3 auth + admin +
S32 on one module, Phase 4 module-by-module migration, Phase 5 legacy
archive + website surfaces.

## Phase 2 — first-slice scope (what it WILL build)

Phase 2 builds exactly two things, per `phases.md`:

### 1. API foundation

- **Envelope:** every content response uses `{ data, meta }` (lists
  carry `meta.total` plus the page's pagination fields; singles carry
  `meta.total = 1`; count endpoints carry `data: { count }`).
- **Errors:** RFC 9457 problem bodies (`type`, `title`, `status`,
  `detail`, `instance`) with no internals leaked.
- **Public-read gating:** published-only and tier-gated reads, enforced
  server-side. A gated read returns 404 (or an empty list), never leaked
  content. A read with no database available fails as 503, never as
  fabricated data and never as 500.
- **Conventions the foundation carries:** ISO-8601 timestamps; cursor
  pagination by default on lists (a module spec's own pagination
  variant stands as specified for that module); REST first.

### 2. The first content slice's public reads

Public list and detail reads for the first content slice, under the
foundation's gating (published-only + tier-gated, envelope, RFC 9457
errors). The slice's public reads are the vertical proof that the
foundation works end to end: API → database → envelope → gated
response.

## Phase 2 — what it will NOT build (explicitly out)

- **No auth, no admin app, no S32 workflow.** That is Phase 3 (auth +
  admin + S32 on one module). Phase 2 has no login, no capability
  guards, no staff endpoints, no workflow states, no versions.
- **No module migration.** That is Phase 4 (each module on its own
  order: canonical masters first, then C01–C23 plus Samskara, Deity, and
  Mantra, then system services).
- **No website surfaces for new modules.** That is Phase 5 (after all
  migration waves verify, plus an explicit tap; never before parity).
- **No live database, migration run, seed data, or deployment.** Those
  are provisioned-environment work. They are excluded from every code
  phase's "done" (see `phases.md`): stable database, migrations, seed,
  CI/CD wiring, restore test, and monitoring with a test alert all wait
  on provisioned infrastructure.
- **No promotions of skeleton/index-only modules (C24–C33).** Each needs
  a qualifying editorial brief plus the owner's tap first.
- **No owner-gated content.** Unresolved relations, no-source items,
  unapproved vocabulary, ratified codes, and blocking links stay
  blocked; never filled by inference.
- **No open decisions implemented over.** S33 confirmation, the
  s04-vs-s01 conflict, MFA, service keys, break-glass scope, and the
  pending numbers are implemented around, never over.

## Flags and ambiguities in phases.md (named, not resolved)

These are genuine gaps in the Phase 2 scope as written. They are for
the parent to resolve; this document does not assume answers:

1. **Which module is the first slice?** `phases.md` Phase 2 says "the
   first content slice's public reads" but does not name the module.
   It is not assumed here to be any particular module (not Puranas, not
   G01, not any other). The slice's identity must be named before Phase
   2 code begins.
2. **Where does the first slice's staff CRUD land?** Phase 2 specifies
   public reads only. Phase 3 specifies S32 on one module; Phase 4
   specifies per-module staff CRUD. `phases.md` does not say whether the
   first slice's staff CRUD arrives with Phase 3's one-module slice or
   with its Phase 4 migration. Not assumed either way.
3. **Is the slice's data model part of Phase 2?** Public reads
   presuppose a data model for the slice, but `phases.md` does not name
   a data-model step inside Phase 2. Whether the model is built in
   Phase 2 or specified earlier (Phase 1 follow-up) is open.
4. **Phase 1's "written and tapped" wording vs the autonomy exception.**
   `phases.md` Phase 1 says the skeleton is "written and tapped before
   code", while its gates section (parent's gate edit) records
   autonomous progression under the project goal. How the two wordings
   reconcile for Phase 1's done-marking is the parent's step, not this
   document's.

## Scope boundaries that never move

- Tiers stay Free < Seva < Premium < Ultra; "Plus" never appears; no
  price is decided or seeded.
- AI stays editor-assist only (ADR-010); no visitor-facing AI
  generation, no auto-publish, no auto-apply.
- S32 governs content records, not media file rows.
- One canonical master per entity; everything else links or is a view.
- No invented numbers, prices, vocabulary values, fields, or tiers.
  An empty-vocabulary field stays optional.
- Nothing is committed or pushed without a tap; deletion needs an
  explicit word for exactly what is deleted.
