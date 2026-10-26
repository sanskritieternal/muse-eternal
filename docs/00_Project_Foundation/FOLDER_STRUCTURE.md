# Folder Structure

Status: WRITTEN (Phase 1 skeleton, 2026-10-27). The repository layout
as it will be. This is skeleton-level intent: it names the top-level
shape and the rule for where new files go. It does not specify module
internals — those are specified per module in its own phase and spec.

## Layout

```
muse-eternal/
├── README.md            # Entry point and doc map
├── agents.md            # Governor: how work is done here
├── phases.md            # Phase plan, status, gates
├── architecture.md      # Stack, layout, binding rules
├── decisions.md         # Decision log (the only place decisions live)
├── brain.md             # Living project memory
├── .gitignore           # Standard Node/Next/Nest ignores
├── docs/                # Enterprise documentation tree (see below)
├── api/                 # NestJS API (planned — no code yet)
├── web/                 # Public website, Next.js (planned — no code yet)
└── admin/               # Staff admin app, Next.js (planned — no code yet)
```

## Root docs

The six spine files at the root are the governing layer. They are the
only docs that live at the root; everything else documentary lives under
`docs/`. Root spine files change only under the sync rule (same change
as the work they describe, with `brain.md` and the manifest updated).

## docs/ tree

```
docs/
├── DOCUMENTATION_INDEX.md   # Manifest: every file, its status, the
│                            # 112-doc mapping, adaptations, exclusions
├── README.md                # Tree readme
├── modules/
│   └── README.md            # Module mapping (per-module docs are
│                            # created here at migration time)
├── 00_Project_Foundation/   # This file lives here (12 files)
├── 01_Product_Requirements/ # (36 files)
├── 02_Design_System/        # (20 files)
├── 03_Frontend/             # (18 files)
├── 04_Backend/              # (25 files)
├── 05_Database/             # (11 files)
├── 06_API/                  # (15 files)
├── 07_AI/                   # (12 files, editor-assist scope only)
├── 08_Security/             # (12 files)
├── 09_Testing/              # (15 files)
├── 10_DevOps/               # (18 files, incl. HOSTINGER_DEPLOYMENT.md)
├── 11_Analytics/            # (8 files)
├── 12_Business/             # (18 files)
├── 13_Legal/                # (8 files)
├── 14_Launch/               # (15 files)
├── 15_Maintenance/          # (15 files)
├── 16_Runbooks/             # (20 files)
├── 17_UX_Research/          # (10 files)
├── 18_Feature_Specifications/ # (10 files)
├── 19_Data_Documentation/   # (10 files)
├── 20_Infrastructure_Architecture/ # (12 files)
├── 21_Engineering_Standards/# (12 files)
├── 22_Integrations/         # (12 files)
├── 23_Mobile/               # (10 files, FUTURE — no mobile app decided)
├── 24_AI_Engineering/       # (14 files, editor-assist scope only)
├── 25_Security_Compliance/  # (12 files)
├── 26_Performance/          # (10 files)
├── 27_QA_Test_Cases/        # (10 files)
├── 28_Analytics_Data_Tracking/ # (10 files)
├── 29_Product_Management/   # (10 files)
├── 30_Team_Operations/      # (10 files)
└── 31_Documentation_System/ # (10 files)
```

Most tree files are placeholders (standard header: status, needed-when,
purpose, sync rule). Placeholders are filled in their phase, with the
manifest and `brain.md` updated in the same change. The manifest
(`docs/DOCUMENTATION_INDEX.md`) is the authority on each file's status;
a file's own header is not the authority.

## Planned application directories (skeleton level only)

These directories do not exist yet. Their top-level shape below is
intent, not decided internals — module internals are specified per
module in its phase.

### api/ — NestJS API

```
api/
├── src/
│   ├── <feature modules>/   # One module per domain, added per phase
│   ├── workflow/            # S32 workflow engine + adapters (Phase 3+)
│   ├── auth/                # Capability guards, sessions (Phase 3+)
│   ├── audit/               # The one audit helper (Phase 3+)
│   └── jobs/                # Postgres-backed job services (Phase 4)
├── prisma/
│   └── schema.prisma        # Data model (grows per module phase)
└── test/                    # API tests (unit + e2e)
```

Rules: explicit modules, guards, and services — no generated admin, no
magic access layer. Data access goes through Prisma. No module's
internals are specified here.

### web/ — public website (Next.js)

```
web/
├── app/        # Public routes (read-only surfaces over API public reads)
├── components/ # Presentational components
└── lib/        # API client (REST, envelope-aware) and helpers
```

Rules: the website never touches the database directly; it renders
published content from API public reads only. Website surfaces for new
modules arrive in Phase 5, not with the modules themselves.

### admin/ — staff admin app (Next.js, separate)

```
admin/
├── app/        # Staff routes (login-gated; list, create, edit, workflow)
├── components/ # Shared workflow components (specified per phase, not here)
└── lib/        # API client (Bearer auth, envelope-aware) and helpers
```

Rules: a separate app, not a route inside the public site. Staff
surfaces exist only behind capability checks; the admin app never
touches the database directly.

## Where new files go (rule)

- **Application code** goes under its app directory (`api/`, `web/`,
  `admin/`) and nowhere else. No code at the repo root, no code under
  `docs/`.
- **Documentation** goes under `docs/` (tree files, per the manifest)
  or the root spine (the six governing files only). No docs inside
  `api/`, `web/`, or `admin/` beyond code-adjacent notes that a phase
  explicitly specifies.
- **A new doc** may be added when a gap is found; the manifest, the
  README map, and `brain.md` are updated in the same change.
- **A new app directory** is never created without a decision recorded
  in `decisions.md`.
- **Generated files, build outputs, and secrets** never enter the repo
  (see `.gitignore`); environment files (`.env*`) are never committed.

## What is not here

- No `payload/` directory: the previous implementation line is
  reference-only and lives outside this repo.
- No mobile app directory: no mobile app is decided.
- No `docs/modules/<code>/` module files yet: per-module architecture
  docs are created at each module's migration wave.
