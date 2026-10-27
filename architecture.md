# architecture.md — stack, layout, and binding rules

Design only. Nothing in this file is implemented in this repository yet;
each rule becomes real in its phase (see `phases.md`).

## Stack

- **API:** NestJS. Explicit modules, guards, and services — no generated
  admin, no magic access layer.
- **Website:** Next.js (public site).
- **Admin:** a separate Next.js app for staff (not a route inside the
  public site).
- **Database:** PostgreSQL, the single store. Jobs run on Postgres-backed
  queues; no Redis.
- **ORM:** Prisma.

## Planned layout

- `api/` — NestJS application.
- `web/` — public website.
- `admin/` — staff admin application.
- Root docs — `README.md`, `agents.md`, `phases.md`, this file,
  `decisions.md`, `brain.md`.

## API conventions

- REST first. The public website already consumes REST; no GraphQL surface
  is assumed unless a spec names one.
- **Envelope:** every content response uses `{ data, meta }` (lists carry
  `meta.total` plus the page's pagination fields; singles carry
  `meta.total = 1`; count endpoints carry `data: { count }`).
- **Errors:** RFC 9457 problem bodies (`type`, `title`, `status`, `detail`,
  `instance`). No internals leak into error responses.
- **Timestamps:** ISO-8601 throughout.
- **Pagination:** cursor pagination by default on lists; a module spec's
  own pagination variant stands as specified for that module.
- **Public reads:** published-only and tier-gated, enforced server-side.
  A gated read returns 404 (or an empty list), never leaked content.
- **No-database reads** fail as 503, never as fabricated data and never
  as 500.
- **No stubs, no mock responses.** An unbuilt route does not exist
  (404), never a fake 200; no response ever carries fabricated data.
  Data needed for development/demo comes only from seed files under
  `api/prisma/seed/` (see the production-readiness rule in
  `agents.md`).

## Auth

- Capabilities, not role names, are checked at every guard. Deny by
  default; fail closed; enforcement is server-side only.
- Staff sessions: short-lived JWT access token plus a rotating refresh
  token (hashed at rest, never extending the original session bound).
  Failed logins lock out after repeated attempts; existence of an account
  is never revealed by an error message.
- All auth and workflow decisions emit through one audit helper with a
  closed event vocabulary. Secrets never surface in responses or logs.

## Editorial workflow (S32)

- States: Draft → Review → Approve → Publish (closed set).
- Publish requires two keys: the publish capability AND membership of the
  Publish Authority list.
- Versions are append-only; approving with edits keeps the document in
  review and records annotations — a reviewer never mutates content.
- Scheduled publish, version restore, and specialist reviewer triggers are
  deferred items, not part of the first workflow slice.

## Tiers and access

- Tiers: Free < Seva < Premium < Ultra. Ultra is per-asset,
  platform-exclusive content. No price is decided anywhere; price data
  seeds empty and is decided at pre-launch.
- Access is enforced server-side on every read, including per-asset Ultra
  gating. The tier name "Plus" is forbidden; it never appears.

## Content rules

- One canonical master per entity (glossary, persons, temples, festivals,
  rituals, gemstones, stories, ragas, talas, audio, video); everything
  else links or is a view.
- Doctrinal claims are labelled by school. Wellness, jyotish, and vastu
  content carries disclaimers.
- Haridasa and Haridasi are separate taxonomy nodes, never merged.
- Transliteration direction is Roman/IAST → Devanagari (canonical).
- AI is editor-assist only (ADR-010); see `agents.md`.
- S32 governs content records, not media file rows.
