# muse-eternal — Sanatan Dharma editorial-CMS platform

A fresh-start repository: an editorial CMS (admin panel), a public website,
and an API, for Sanatan Dharma content — scriptures, temples, festivals,
rituals, saints, philosophy, and the arts.

## Stack

NestJS API + Next.js (public website and a separate admin app) + PostgreSQL.
See `architecture.md` for the binding rules.

## Status (2026-10-27)

Fresh start. This repository currently holds the documentation spine only —
no application code, no database, no deployment yet. The previous
implementation line (`eternalmu`) is reference-only and is not a source to
copy from; everything here is derived fresh from the specs.

## Documentation map

| File | Role |
| --- | --- |
| `agents.md` | **Governor.** How work is done here. On any conflict between docs, `agents.md` wins until `agents.md` itself is amended. |
| `phases.md` | The phase plan, with status and gates. |
| `architecture.md` | Stack, layout, and binding technical rules. |
| `decisions.md` | The decision log — what is settled, and what is still open. |
| `brain.md` | Living project memory: current status, open items, flags. |

Canonical specifications live in Notion ("muse eternal"). These repo docs
interpret them; they never contradict them.

## Planned layout

- `api/` — NestJS API (planned)
- `web/` — public website, Next.js (planned)
- `admin/` — staff admin app, Next.js (planned)
- Root docs — this file and the map above

## Getting started

Nothing to run yet. Phase 1 (architecture skeleton) begins on the owner's
tap — see `phases.md`.
