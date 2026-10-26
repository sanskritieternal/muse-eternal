# docs/ — enterprise documentation tree

Status: WRITTEN (this readme). The tree holds the enterprise
documentation structure adopted from the uploaded Enterprise Platform
Documentation Master List, adapted for muse-eternal.

## What lives here

- `DOCUMENTATION_INDEX.md` — **the manifest.** It lists every file, its
  status (WRITTEN / PLACEHOLDER / EXCLUDED), the folder-to-phase map,
  the mapping of the master list's 112 phase documents, and every
  adaptation and exclusion with its reason. Start there.
- `00_Project_Foundation/` … `31_Documentation_System/` — 440 placeholder
  files (standard header: status, needed-when, purpose, sync rule).
- `modules/README.md` — the module mapping: per-module architecture docs
  are created at migration time under `docs/modules/<code>/`.

## Status right now

All tree files are PLACEHOLDERS except this readme, the manifest, and
`modules/README.md`. A placeholder is not a completed document and is
never cited as one. Placeholders are filled in their phase, with the
manifest and `brain.md` updated in the same change (see the sync rule in
`agents.md`).

## Governing docs (repo root, not in this tree)

`agents.md` governs all docs here. `decisions.md` records what is
decided. `brain.md` records current status. On any conflict, `agents.md`
wins until `agents.md` itself is amended.
