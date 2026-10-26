# modules/ — per-module architecture docs

Status: WRITTEN (this mapping file). Per-module architecture documents
are created here at each module's migration wave — not in advance, and
not under the master list's 23 generic module names (those do not match
this project's module system and were not created).

## Canonical module order

1. G01 glossary, S01 persons, T01 temples, M10 festivals, R01 rituals,
   J05 gemstones, K01 stories, AR05 ragas, AR06 talas, AU01 audio,
   VD01 video.
2. Remaining content modules C01–C23, plus Samskara, Deity, and Mantra
   as content.
3. System services (search, media, notifications, tiers, jobs) live in
   their tree folders, not here.

## Per-module file

Each module gets `docs/modules/<code>/ARCHITECTURE.md` when its wave
begins. Each module document covers (per the master list's Phase 4
shape): information architecture, CMS collections, database schema,
taxonomy, SEO rules, APIs, permissions, media management, editorial
workflow, and frontend experience — as specified for that module, never
invented.

## Rules

- One canonical master per entity; everything else links or is a view.
- A module doc is written from that module's spec in its wave, with the
  manifest (`docs/DOCUMENTATION_INDEX.md`) and `brain.md` updated in the
  same change.
- Skeleton/index-only modules (C24–C33) get no architecture doc until an
  editorial brief plus the owner's tap qualifies them.
- Owner-gated content (unresolved relations, no-source items, unapproved
  vocabulary, ratified codes, blocking links) stays blocked in module
  docs, never filled by inference.
