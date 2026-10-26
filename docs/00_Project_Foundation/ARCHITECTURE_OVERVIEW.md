# Architecture Overview

Status: WRITTEN (Phase 1 skeleton, 2026-10-27). This document describes
the system at skeleton level: what it is, which parts exist, and how
they relate. It agrees with root `architecture.md` (stack, layout,
binding rules) and `decisions.md` (what is decided). Nothing here is
implemented yet; each rule becomes real in its phase (see `phases.md`).

## What the platform is

muse-eternal is a Sanatan Dharma editorial-CMS platform with three
faces:

1. **An editorial CMS** — where editors, reviewers, translators, and
   administrators create, review, approve, publish, and maintain
   content through a governed workflow (S32).
2. **A public website** — where visitors (devotees, temples, scholars,
   guests) read published content, browse masters and modules, and use
   the public surfaces.
3. **An API** — the single backend that serves both faces: staff
   operations for the CMS and public reads for the website.

Content covers scriptures, temples, festivals, rituals, saints,
philosophy, and the arts. One canonical master exists per entity
(glossary, persons, temples, festivals, rituals, gemstones, stories,
ragas, talas, audio, video); everything else links or is a view.

## The three applications and how they relate

| Application | Directory | Role | Who uses it |
| --- | --- | --- | --- |
| API | `api/` | NestJS backend. Owns data, auth, workflow, jobs, and all reads and writes. | Nobody directly; both other apps call it |
| Public website | `web/` | Next.js public site. Renders published content from API public reads. | Visitors |
| Admin app | `admin/` | Separate Next.js staff app (not a route inside the public site). Staff login, editing, workflow, versions, audit. | Editors, reviewers, admins |

Rules governing the relationship:

- **The API is the only writer and the only gatekeeper.** The website
  never touches the database directly; the admin app never touches it
  directly either. Every read and write goes through the API, which
  enforces publication state, tier visibility, and capabilities
  server-side.
- **The website sees published content only.** Public reads return
  published, tier-visible rows. A gated read returns 404 (or an empty
  list), never leaked content.
- **The admin app sees the workflow.** Draft, review, approve, publish,
  versions, assignments, and audit exist only behind staff auth and
  capability checks. Visitors never see them.
- **No shared database access, no shared secrets.** Each app holds only
  its own configuration; secrets never surface in responses or logs.

## Request and flow picture (skeleton level)

Public flow:

```
Visitor -> web/ -> API public read -> PostgreSQL
              (published-only + tier-gated, server-side)
```

Staff flow:

```
Staff -> admin/ -> API staff endpoint (capability guard) -> PostgreSQL
              (draft/review/approve/publish via S32; audited)
```

Background flow:

```
Scheduled job -> API job service -> PostgreSQL
              (Postgres-backed queues; no separate broker)
```

Failure behaviour (binding, from `architecture.md`):

- A read with no database available fails as 503 — never as fabricated
  data, never as 500.
- An error response is an RFC 9457 problem body (`type`, `title`,
  `status`, `detail`, `instance`) with no internals leaked.
- Every content response uses the `{ data, meta }` envelope (lists carry
  `meta.total` plus the page's pagination fields; singles carry
  `meta.total = 1`; count endpoints carry `data: { count }`).
- Timestamps are ISO-8601 throughout. Lists paginate by cursor by
  default; a module spec's own pagination variant stands as specified
  for that module.

## Editorial workflow (S32) in the picture

S32 governs content records, not media file rows. Its states are a
closed set: Draft → Review → Approve → Publish. Publishing requires
two keys: the publish capability AND membership of the Publish Authority
list. Versions are append-only; approving with edits keeps the document
in review and records annotations — a reviewer never mutates content.
Scheduled publish, version restore, and specialist reviewer triggers are
deferred items, not part of the first workflow slice.

## Tiers and access in the picture

Tiers are Free < Seva < Premium < Ultra. Ultra is per-asset,
platform-exclusive content. No price is decided anywhere; price data
seeds empty and is decided at pre-launch. Access is enforced server-side
on every read, including per-asset Ultra gating. The tier name "Plus"
is forbidden and never appears.

## Content rules in the picture

- Doctrinal claims are labelled by school. Wellness, jyotish, and vastu
  content carries disclaimers.
- Haridasa and Haridasi are separate taxonomy nodes, never merged.
- Transliteration direction is Roman/IAST → Devanagari (canonical).
- AI is editor-assist only (ADR-010): AI may draft or suggest inside
  the editor's workflow; nothing AI-generated is saved, applied, or
  published without explicit editor action, and AI-assisted content
  passes S32 review. Autonomous AI (auto-publish, auto-apply,
  visitor-facing AI generation) is banned. The deterministic knot/grid
  carve-out (D-05) stands.

## How docs, specs, and code relate

- **Canonical specifications** live in Notion ("muse eternal"). They are
  the source of truth for what each module is.
- **Repo docs** (this file, root `architecture.md`, `decisions.md`,
  `phases.md`, `brain.md`, and the rest of `docs/`) interpret the specs
  for this repository. They never contradict the specs, `agents.md`, or
  `decisions.md`; on conflict, `agents.md` wins.
- **`agents.md` governs how work is done** (spec-first, proposal before
  building, verify before reporting, no commit or push without a tap,
  no deletion without an explicit word).
- **`decisions.md` is the only place decisions are recorded.** If a rule
  is not in `decisions.md`, it is not decided — it is flagged as open
  and implemented around, never over.
- **Code implements the docs.** Each phase builds what its docs specify
  (see `PROJECT_SCOPE.md` for Phase 2's scope and `phases.md` for the
  full plan). Docs update in the same change as the work they describe
  (see the sync rule in `agents.md`).

## What is not in this picture

- No mobile app (placeholders for mobile are marked FUTURE).
- No separate message broker or cache store (jobs and queues live on
  PostgreSQL).
- No generated admin and no magic access layer (explicit NestJS
  modules, guards, and services).
- No live environment yet: no provisioned database, no deployment, no
  seed data. Those wait on provisioned infrastructure and are not part
  of any code phase's "done" (see `phases.md`).
