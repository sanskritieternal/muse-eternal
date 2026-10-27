# muse-eternal API

NestJS + Prisma API for the muse-eternal platform. Phase 2 scope only:
API foundation + G01 glossary public reads.

## What is built (Phase 2)

- **Foundation:** every response uses the `{ data, meta }` envelope;
  errors are RFC 9457 problem bodies (`type`, `title`, `status`,
  `detail`, `instance`) with no internals leaked; ISO-8601 timestamps;
  cursor pagination by default on lists.
- **Public reads (no auth, no staff endpoints, no workflow states):**
  - `GET /health` — 200, no database dependency.
  - `GET /glossary` — list, alphabetical by normalized IAST, `?letter=`
    single A–Z filter, `?limit=` (default 20, clamped at 100),
    `?cursor=` opaque pagination.
  - `GET /glossary/:slug` — detail, `meta.total = 1`.
- **Gating, enforced server-side on every read:** a row is publicly
  visible only when published AND Free-visible AND not Vocabulary
  Required. Anything else reads as 404 (detail) or absence (list) —
  never leaked content. No database available reads as 503, never 500
  and never fabricated data.
- **Data model (schema only):** `prisma/schema.prisma` — `GlossaryTerm`
  + `LanguageOfOrigin` (Sanskrit · Prakrit · Pali · Tamil · Hindi ·
  Other) + `Tier` (FREE · SEVA · PREMIUM · ULTRA). Field list follows
  the G01 v5 spec. No category code is baked in: the G01 category
  numbering (C25 vs C09) stays open.

## What is NOT built yet

Auth, admin app, S32 workflow, staff CRUD (all Phase 3, on G01);
module migration (Phase 4); website surfaces (Phase 5); live database
work — no migration run, no seed, no deployment (provisioned
environment required). There is no AI code in this phase at all.

## Install / build / test / run

```sh
npm install --ignore-scripts   # see note below, then:
npx prisma generate            # needs the query-engine binary; see note
npm run build                  # tsc -> dist/
npm test                       # jest, 18 tests, no live DB required
npm start                      # node dist/main.js (PORT env, default 3000)
./smoke.sh                     # build + boot + no-DB smoke checks
```

**Prisma engine note (environment quirk, 2026-10-27):** in this VM,
`npm install` must use `--ignore-scripts` because Prisma's postinstall
engine download aborts with ECONNRESET through the egress proxy, and
`prisma generate` fails the same way (5 retries attempted). Workaround
used: the query-engine binary (`libquery_engine-debian-openssl-3.0.x.so.node`,
Prisma 6.19.3) was copied from a local cache into
`node_modules/prisma/` and `node_modules/@prisma/engines/` /
`node_modules/.prisma/client/`, after which `prisma generate`
succeeded. These are gitignored build artifacts, never committed; a
provisioned environment runs `prisma generate` normally. If generate
fails for you the same way, seed the engine binary into
`node_modules/prisma/` first, then re-run generate.

## Stack (exact, installed)

- NestJS 11.2.8, Express 5.2.1 (wildcard fallback uses the `/*splat`
  form), TypeScript 5.x, Jest 29 + ts-jest, supertest.
- Prisma 6.19.3 (`@prisma/client` + `prisma`), PostgreSQL provider.
- Node 24.22.1, npm 10.9.4.

## Layout

- `src/main.ts` — bootstrap, global RFC 9457 filter.
- `src/common/` — envelope, domain errors, problem filter.
- `src/glossary/` — controller, service (gating/ordering/filter/
  pagination), repository interface, Prisma repository, types.
- `src/health/` — liveness probe.
- `src/fallback/` — unknown-route 404 (imported last so its wildcard
  cannot shadow real routes).

## Phase 3 — auth + admin + S32 on G01 (2026-10-27, uncommitted)

### Auth design (as implemented)

- **Roles (7, S01):** `super_admin`, `admin`, `editor`, `reviewer`,
  `translator`, `support_agent`, `viewer`. Guards check **capabilities,
  not role names**; deny by default; fail closed. The 25-key matrix in
  `src/auth/capabilities.ts` governs — where S32 §4 lists Admin as a
  submitter/approver, the matrix denies it (Admin holds no
  `content.create`/`content.update`/`content.review`/`content.publish`).
  That divergence is flagged in code comments, not resolved.
- **Passwords:** argon2id (`src/auth/password.ts`).
- **Access token:** JWT, 15 minutes (`JWT_ACCESS_TTL_MINUTES`, default
  15), carrying a capability snapshot re-resolved from the DB at
  refresh. Implemented with `jsonwebtoken` directly: `@nestjs/jwt`
  v11 ships ESM-only output that Jest (CommonJS) cannot parse.
- **Refresh token:** opaque random 32 bytes, stored as a SHA-256 hash
  (raw never persisted), rotating, family id preserved; absolute
  session bound from S01 K-2 (`SESSION_TIMEOUT_MINUTES`, default 60)
  never extended. Reuse of a rotated token revokes the whole family
  (401). Logout revokes one token and is idempotent.
- **Lockout (implementation choice, specs name no counts):** 5 failed
  attempts → 15-minute lock (`LOCKOUT_ATTEMPTS`, `LOCKOUT_MINUTES`).
  All login failures return the identical generic 401 — never
  revealing account existence or lockout state.
- **JWT secret:** `JWT_SECRET` env; production throws if unset;
  non-production falls back to a dev-only secret with a loud warning
  (never for real deployment).
- **MFA is NOT implemented** (deferred). Elevated logins (super_admin,
  admin) are audited with `mfa: 'mfa_missing'`; no session counts as
  MFA-verified.
- **First Super Admin bootstrap is NOT built** (no backdoor endpoint).
  How the first staff user is created in a provisioned environment is
  an open deployment procedure, not invented here. No seed users ship.

### Endpoints (staff; all under `/staff/glossary` unless noted)

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
  `GET /auth/me`.
- `POST /staff/glossary` (content.create), `GET /staff/glossary`,
  `GET /staff/glossary/:slug`, `PATCH /staff/glossary/:slug`
  (content.update OR content.translate; translator requests may touch
  `localeStates` only, Draft only), `GET /staff/glossary/reviewers`
  (content.review), `POST /staff/glossary/reassign-overdue`
  (content.review).
- Workflow: `POST :slug/submit` (content.create OR content.update),
  `POST :slug/assignments/:id/outcome` (content.review),
  `POST :slug/approve` (content.review), `POST :slug/publish`
  (content.publish + two-key in the service),
  `POST :slug/unpublish` (content.publish + two-key),
  `POST :slug/break-glass` (Super Admin role check in the service, no
  capability decorator), `POST :slug/assignments/:id/reassign`
  (content.review), `GET :slug/versions`, `GET :slug/assignments`.
- `GET /staff/audit` (audit.view: Super Admin, Admin, Support Agent).

### S32 behaviors (as implemented)

- Closed states DRAFT → REVIEW → APPROVE → PUBLISHED; no skipping
  except break-glass (forward only, Super Admin only, reason
  mandatory, audited with skipped states).
- **Two-key publish:** `content.publish` capability AND membership in
  the Publish Authority list (default `['admin', 'super_admin']`).
  With the default list only Super Admin passes both keys: Reviewer
  holds the capability but is not listed; Admin is listed but holds
  no capability. Publish and unpublish share the rule; both require
  `changeSummary` (publish) and report gates.
- **Versions append-only**, labels `v{major}.{minor}`: create → v1.0;
  every edit/transition → minor+1; publish → major+1, minor reset.
  Restore creates a new version with `restoredFrom` — but
  version-restore (T-7) itself is deferred, not built.
- **Approved-with-edits:** annotations only; document returns to Draft
  for the editor; reviewer never rewrites content. Notes mandatory for
  Returned and Approved-with-edits (else 422). Return re-opens all
  assignments as Pending with outcome history preserved.
- **Review SLA:** specialist 72h for G01 (`SYS32_REVIEW_SLA_HOURS`,
  default 72). Auto-reassign default 72h past breach
  (`SYS32_AUTO_REASSIGN_HOURS`, default 72; 0 = off). The overdue sweep
  reassigns round-robin to the next roster member; with no other
  member it marks `escalated: true` instead of inventing an assignee.
- **Reviewer picker is roster-filtered** (roster `glossary_approver`,
  G01's single track). Roster empty → submit takes the pool-empty
  path (unassigned assignment, `poolEmpty: true`, queue-visible for
  escalation). Roster non-empty and no reviewer given with
  `SYS32_REQUIRE_REVIEWER` true (default) → 422
  `SYS32_REVIEWER_REQUIRED`. Explicit reviewer must exist, hold
  `content.review`, and be on the roster (else 422).
- **Autosave coalescing (O-8):** 5-minute window (`SYS32` coalesce
  minutes, default 5), same author, consecutive autosaves only; latest
  payload wins, earliest timestamp kept. Explicit saves always append.
- **Pre-publish gates:** `mandatory_fields` (all required G01 fields,
  all errors at once) and `specialist_reviews_complete` (all
  assignments Approved, re-checked at publish). `seo_markup_valid`
  (S14) is deferred — publish reports it as skipped.
- **Auto-publish on approve** (`SYS32_AUTO_PUBLISH_ON_APPROVE`, default
  false): publish is never automatic (D-2); when true, approve attempts
  the publish path with the same two-key check against the approver.
- **O-10 locale-state map:** implemented AROUND it, not over it.
  `localeStates` is a generic JSON overlay (locale → one of the four
  master states, validated, no invented states). It never drives the
  master `workflowState`. S33 joint confirmation still owed.
- **`published` boolean** stays the public-read gate and is kept in
  sync: true exactly when workflowState = PUBLISHED.

### Audit (S17 vocabulary + hash chain)

- One helper, `AuditService.emit`; modules never write audit rows
  directly. Closed 15-value vocabulary enforced in code: created,
  updated, deleted, published, unpublished, login, logout,
  permission_change, export, import, settings_change, view,
  tamper_check, retention_run, archive.
- Mappings: login success → `login`; failed login → `login` with
  `success: false`; refresh → `login` with `kind: 'token_refresh'`
  (no dedicated refresh value exists); logout → `logout`;
  capability/two-key/break-glass denials → `permission_change` with
  `denied: true`; transitions → `updated` except publish →
  `published`, unpublish → `unpublished`, create → `created`.
- Hash chain: `SHA-256(prev_hash || canonical_json(payload))`,
  genesis prev `GENESIS`, recursively sorted keys. Payloads never
  contain raw tokens or password material.

### G01 model completion (schema only, no migration run)

- Added: #7 Part of Speech (optional, open vocabulary free string),
  #9 Extended Definition (optional text), repeaters as JSON:
  #10 traditionMeanings, #12 regionalEquivalents, #18 audioTracks,
  #19 videoItems, #20 printablePdfs, #23 imageGallery, FAQ.
  Repeaters-as-JSON (not dedicated tables) is a documented Phase 3
  choice until a dedicated model is justified.
- Publish gate requires: #1, #2 (≤200), #4, #5 (Devanagari regex),
  #6 (closed enum), #8 (≤200), #22, #24, slug (unique, slug pattern).
  #3 Summary is optional (mockup asterisk convention governs over the
  validation table's "Required" — spec owners to reconcile).
  NOT added: #11 Etymology, #13/#14 references, #25 Licence Type
  (held optional per ADR-017 variance — empty canonical vocabulary).
- Public shape gains #7/#9/repeaters under the same published + FREE +
  not-Vocabulary-Required gate. Workflow internals are staff-only.
- IAST validation is a permissive Unicode letter/mark pattern, not
  full IAST phonology — an approximation; strict IAST is an
  editor-side concern.

### Env vars (Phase 3)

- `JWT_SECRET`, `JWT_ACCESS_TTL_MINUTES` (15), `SESSION_TIMEOUT_MINUTES`
  (60), `LOCKOUT_ATTEMPTS` (5), `LOCKOUT_MINUTES` (15),
  `SYS32_REQUIRE_REVIEWER` (true), `SYS32_AUTO_PUBLISH_ON_APPROVE`
  (false), `SYS32_AUTO_REASSIGN_HOURS` (72), `SYS32_REVIEW_SLA_HOURS`
  (72). Config tokens `AUTH_CONFIG` / `WORKFLOW_CONFIG` with
  `useFactory` providers — Nest cannot resolve optional
  interface-typed constructor params.

### NOT built in Phase 3 (deferred, flagged)

Schedule-publish (T-5), version-restore (T-7), SEO gate, specialist
triggers beyond roster behavior, capability caching,
revoke-all-sessions, bulk actions, webhooks (SYS-25), notifications
(S06), rate limiting (S32 §3 mentions 120 req/min per principal),
idempotency keys / per-document row locking, version-retention pruning
job, user/role-admin APIs and screens, API keys (S01 T-3–T-5), service
keys, MFA, custom roles, roster-admin surface (model + store exist;
population is out-of-band until a surface exists).
