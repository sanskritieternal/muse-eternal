# DOCUMENTATION_INDEX — manifest for docs/

Status: WRITTEN (this manifest). It governs the whole `docs/` tree: what
exists, what is a placeholder, what was excluded and why, and how the
uploaded Enterprise Platform Documentation Master List maps onto
muse-eternal. When any file below changes status, this manifest changes
in the same change (see the sync rule in `agents.md`).

## Status legend

- **WRITTEN** — real content, kept current.
- **PLACEHOLDER** — empty file with a standard header (status, needed-when,
  purpose, sync rule). Not a completed document; never cite one as done.
- **EXCLUDED** — intentionally not created, with a reason. Never silently
  dropped.

## The tree

Source structure: the uploaded master list's `PROJECT_DOCS/` tree, placed
here as `docs/` (same numbered folders). Folder counts below are counted
from the files actually created, not from the source's claimed totals.

| Folder | Files | Needed when |
| --- | ---: | --- |
| 00_Project_Foundation | 12 | Phase 1 (skeleton) — foundation docs |
| 01_Product_Requirements | 36 | Phase 4 (module work) — per-feature requirements |
| 02_Design_System | 20 | Website batch / design system work |
| 03_Frontend | 18 | Website batch — frontend work |
| 04_Backend | 25 | Phases 2–3 — backend foundation and auth |
| 05_Database | 11 | Phase 2 — database design |
| 06_API | 15 | Phases 2–3 — API work |
| 07_AI | 12 | Phase 4 system services — editor-assist AI scope only (ADR-010) |
| 08_Security | 12 | Phase 3 onwards — security |
| 09_Testing | 15 | Every phase — testing |
| 10_DevOps | 18 | Provisioning / DevOps work (Hostinger decided) |
| 11_Analytics | 8 | Phase 4 system services — analytics |
| 12_Business | 18 | Pre-launch — business and pricing (no prices decided) |
| 13_Legal | 8 | Counsel gates — legal |
| 14_Launch | 15 | Pre-launch — launch readiness |
| 15_Maintenance | 15 | Post-launch — maintenance |
| 16_Runbooks | 20 | Operations — runbooks, as systems go live |
| 17_UX_Research | 10 | Website batch — UX research |
| 18_Feature_Specifications | 10 | Phase 4 — feature specifications |
| 19_Data_Documentation | 10 | Phases 2 and 4 — data documentation |
| 20_Infrastructure_Architecture | 12 | Provisioning — infrastructure (Hostinger) |
| 21_Engineering_Standards | 12 | Phase 1 — engineering standards |
| 22_Integrations | 12 | Phase 4 system services — integrations |
| 23_Mobile | 10 | FUTURE — only if a mobile app is decided (not in current scope) |
| 24_AI_Engineering | 14 | Phase 4 system services — editor-assist AI scope only (ADR-010) |
| 25_Security_Compliance | 12 | Phase 3 onwards — security and compliance |
| 26_Performance | 10 | Every phase — performance |
| 27_QA_Test_Cases | 10 | Every phase — QA test cases |
| 28_Analytics_Data_Tracking | 10 | Phase 4 system services — analytics tracking |
| 29_Product_Management | 10 | Ongoing — product management |
| 30_Team_Operations | 10 | Ongoing — team operations |
| 31_Documentation_System | 10 | Phase 0 — documentation system (this manifest governs) |
| **Total placeholders** | **440** | |

Real (WRITTEN) files in `docs/`: this manifest, `README.md` (tree readme),
and `modules/README.md` (module mapping). Everything else in the folders
above is a PLACEHOLDER.

Name note: `docs/31_Documentation_System/DOCUMENTATION_INDEX.md` is a
placeholder for the future documentation-system index. It is not this
manifest; this manifest lives at `docs/DOCUMENTATION_INDEX.md`.

## How the 112 phase documents map (no duplication)

The master list's first part (112 documents in 12 phases) is NOT copied
as a second tree. Each phase maps to the tree and spine files below:

| Master-list phase | Maps to |
| --- | --- |
| 1 — Foundation & Product Strategy (10) | 00_Project_Foundation, 01_Product_Requirements, 29_Product_Management, root `README.md` |
| 2 — Enterprise Design System (10) | 02_Design_System |
| 3 — UX Documentation (10) | 17_UX_Research, 03_Frontend (UX-adjacent), 02_Design_System |
| 4 — Sanatan Module Architecture (23) | SUPERSEDED — see module mapping below; per-module docs are created at migration time |
| 5 — CMS & Content Architecture (8) | 18_Feature_Specifications, 19_Data_Documentation, 31_Documentation_System, root `architecture.md` (S32, content rules) |
| 6 — Backend Architecture (9) | 04_Backend, 05_Database, 06_API, 20_Infrastructure_Architecture |
| 7 — Security & Compliance (8) | 08_Security, 25_Security_Compliance, 13_Legal |
| 8 — DevOps & Infrastructure (8) | 10_DevOps, 20_Infrastructure_Architecture |
| 9 — Quality Assurance (7) | 09_Testing, 27_QA_Test_Cases |
| 10 — Analytics & Growth (5) | 11_Analytics, 28_Analytics_Data_Tracking |
| 11 — Operations & Administration (7) | 15_Maintenance, 16_Runbooks, 30_Team_Operations |
| 12 — Engineering Standards (7) | 21_Engineering_Standards, root `agents.md` (working rules), 00_Project_Foundation (git workflow, versioning) |

## Module mapping (Phase 4 of the master list, superseded)

The master list's 23 generic module names (Vedas, Upanishads, Gita,
Puranas, Itihasa, Mantras, Bhakti, Temples, Festivals, Wellness, Yoga,
Ayurveda, Meditation, Guru Parampara, Saints, Deities, Sacred Places,
Sanskrit, Scriptures, Stories, Kids, Courses, Community) do NOT match
this project's module system and were NOT created as files. Project
module architecture docs are created per module, at that module's
migration wave, at `docs/modules/<code>/ARCHITECTURE.md` (see
`docs/modules/README.md`). Canonical order: G01 glossary, S01 persons,
T01 temples, M10 festivals, R01 rituals, J05 gemstones, K01 stories,
AR05 ragas, AR06 talas, AU01 audio, VD01 video, then C01–C23 plus
Samskara, Deity, and Mantra.

## Adaptations and exclusions (agents.md wins on conflict)

- **EXCLUDED — `05_Database/REDIS_SCHEMA.md`.** No Redis in this stack;
  jobs run on Postgres-backed queues.
- **EXCLUDED — `10_DevOps/VERCEL_DEPLOYMENT.md`,
  `AWS_DEPLOYMENT.md`, `SUPABASE_SETUP.md`.** Hosting is decided:
  Hostinger + eternalsanskriti.com. Added instead (placeholder):
  `10_DevOps/HOSTINGER_DEPLOYMENT.md`.
- **AI scope (07_AI, 24_AI_Engineering, PRD_AI_ASSISTANT, PRD_AI_AGENTS,
  AI_API, RUNBOOK_AI_PROVIDER_DOWN).** Placeholders are scoped to
  editor-assist AI only (ADR-010). Visitor-facing AI assistant features
  are banned and must not be written into these files.
- **Tiers.** Any "Free vs Pro" / enterprise-plan wording in the generic
  list is superseded by Free < Seva < Premium < Ultra; "Plus" is
  forbidden; no prices are decided.
- **Mobile (23_Mobile, PRD_MOBILE, PRD_PWA, PWA guides).** Placeholders
  marked FUTURE — no mobile app is decided.
- **GraphQL (04_Backend/GRAPHQL.md).** Placeholder only: REST first; a
  GraphQL surface is documented only if a spec names one.

## Source-total reconciliation (named, not smoothed)

The uploaded master list's own totals do not reconcile, so this manifest
records counted numbers, not claimed ones:

- The list claims 291 files for the `PROJECT_DOCS/` tree; the filenames
  actually listed total 282 (281 content files + 1 tree README).
- The list claims a "~350" grand total; its parts sum to far more
  (112 + 282 + 162 = 556 listed items).
- Nothing was silently dropped to force a match: the 112 phase documents
  are mapped above (not duplicated), 4 files are EXCLUDED with reasons,
  2 files were added (HOSTINGER_DEPLOYMENT.md, modules/README.md), and
  this tree holds 440 placeholders + 3 written files.

## Sync rule (summary — full rule in agents.md)

Every implementation task updates every doc it affects in the same
change, plus `brain.md` and this manifest's status entries. No doc may
contradict `agents.md` or `decisions.md`. Placeholders are filled only
in their phase (or with a manifest update), and their status flips to
WRITTEN in the same change.
