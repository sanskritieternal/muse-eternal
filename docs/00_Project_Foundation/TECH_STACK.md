# Tech Stack

Status: WRITTEN (Phase 1 skeleton, 2026-10-27). The stack as decided
(see `decisions.md` 2026-10-27 and root `architecture.md`). Nothing here
is implemented yet; each piece becomes real in its phase.

## The stack

| Layer | Choice | Why (as decided) |
| --- | --- | --- |
| API | NestJS | Explicit modules, guards, and services — no generated admin, no magic access layer |
| Public website | Next.js | Public site, consuming the API over REST |
| Admin app | Next.js, separate app | Staff app kept separate from the public site, not a route inside it |
| Database | PostgreSQL | The single store: content, workflow, jobs, and audit |
| ORM | Prisma | Data access for the API |
| API style | REST first | The public website already consumes REST; no GraphQL surface is assumed unless a spec names one |
| Jobs and queues | Postgres-backed queues | Jobs run on the database itself; no separate broker |
| Hosting (decided, not provisioned) | Hostinger + eternalsanskriti.com | Provider and domain decided 2026-10-26; plan size and region still open; nothing provisioned yet |

## Layer by layer

### API — NestJS

The API owns data, auth, workflow, jobs, and every read and write. Both
the website and the admin app call it; neither touches the database
directly. Guards check capabilities, not role names; access denies by
default and fails closed; enforcement is server-side only.

### Website and admin — Next.js, two apps

The public website renders published content from API public reads. The
admin app is a second Next.js application for staff (login, editing,
workflow bar, versions, audit, assignments). Keeping them separate means
staff surfaces, session handling, and visitor surfaces never share
routes, layouts, or access assumptions.

### Database — PostgreSQL, the single store

One database holds content rows, workflow state, versions, assignments,
annotations, audit events, jobs, and queues. Consequences of the
single-store choice: no cross-store consistency work, no separate cache
or broker to operate, and backup/restore covers the whole platform in
one place. Reads with no database available fail as 503, never as
fabricated data and never as 500.

### ORM — Prisma

Prisma is the API's data-access layer. Schema changes arrive as
migrations, run against the provisioned database only — never against
an unstable local database, and never as part of a docs-only phase.

### API style — REST first

Every content response uses the `{ data, meta }` envelope; failures use
RFC 9457 problem bodies; timestamps are ISO-8601; lists paginate by
cursor by default, with a module spec's own pagination variant standing
as specified for that module. A GraphQL surface is documented only if a
spec names one (see `docs/04_Backend/GRAPHQL.md`, placeholder).

### Jobs — Postgres-backed queues

Scheduled and background jobs (including the DailyPanchang job, which is
job-generated data, not editorial content) run on Postgres-backed
queues. There is no Redis, no separate broker, and no cache store in
this stack — the manifest records the Redis schema file as EXCLUDED for
exactly this reason.

### Auth and workflow (stack-adjacent, decided design)

- Staff sessions: short-lived JWT access token plus a rotating refresh
  token (hashed at rest, never extending the original session bound).
  Failed logins lock out after repeated attempts; an error message
  never reveals whether an account exists.
- All auth and workflow decisions emit through one audit helper with a
  closed event vocabulary. Secrets never surface in responses or logs.
- S32 states are Draft → Review → Approve → Publish (closed set).
  Publish requires two keys: the publish capability AND membership of
  the Publish Authority list. Versions are append-only; approving with
  edits keeps the document in review and records annotations.

### Tiers and access

Tiers are Free < Seva < Premium < Ultra. Ultra is per-asset,
platform-exclusive content. No price is decided anywhere; price data
seeds empty and is decided at pre-launch. Access is enforced server-side
on every read, including per-asset Ultra gating. The tier name "Plus"
is forbidden and never appears.

### Content and AI rules the stack must honour

- One canonical master per entity; everything else links or is a view.
- Doctrinal claims are labelled by school; wellness, jyotish, and vastu
  content carries disclaimers.
- Haridasa and Haridasi are separate taxonomy nodes, never merged.
- Transliteration direction is Roman/IAST → Devanagari (canonical).
- AI is editor-assist only (ADR-010); autonomous AI is banned. The
  deterministic knot/grid carve-out (D-05) stands.
- S32 governs content records, not media file rows.

## Explicitly NOT in the stack

- **Redis** (or any separate cache/broker store). Excluded by decision;
  see the manifest.
- **Vercel, AWS, Supabase** as deployment targets. Hosting is decided:
  Hostinger + eternalsanskriti.com. Their deployment files are recorded
  as EXCLUDED in the manifest; the Hostinger deployment doc is a
  placeholder (`docs/10_DevOps/HOSTINGER_DEPLOYMENT.md`).
- **A mobile app.** No mobile app is decided; mobile files are marked
  FUTURE.
- **A generated/CMS admin** (Payload-style). The admin is a custom
  Next.js app; the API has no generated admin layer.
- **GraphQL by default.** REST first; GraphQL only where a spec names
  a surface.
- **Visitor-facing AI generation.** Banned by ADR-010; AI files in the
  tree are editor-assist scope only.
- **The tier name "Plus".** Forbidden.
- **Any price, number, vocabulary value, or field not in `decisions.md`.**
  Nothing here invents one.

## Open stack-adjacent items (not decided — implemented around, never over)

- Hosting plan size and region.
- CI/CD tooling; deploy windows; on-call roster (wiring time).
- S33 joint confirmation on the per-locale workflow-state map.
- MFA for elevated accounts; service keys (later phase); break-glass
  scope (Super Admin only until widened by decision).
- Schedule-publish, version-restore, SEO pre-publish gate, specialist
  reviewer triggers beyond the general roster.
- Numbers pending from the owner: search SLO values, AI-assist retention
  days, re-notification interval for unacknowledged Page-severity alerts.
