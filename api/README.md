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
