# Design System — foundation

Status: WRITTEN (design-system foundation, 2026-10-27).
Grounded only in the repo spine (`README.md`, `agents.md`, `phases.md`,
`architecture.md`, `decisions.md`, `brain.md`) and the Phase-1
foundation docs. Nothing is copied from the previous implementation
line. Nothing here is a decision unless it also appears in
`decisions.md`.

## How to read the PROPOSED marks

Every token value in §2 (hex colors, type sizes, spacing, radii,
shadows, breakpoints) is **PROPOSED**. A Puranas reader mockup is being
built in parallel as a separate artifact; these values are defined here
first so the mockup has a system to be judged against, and they are
**aligned with the approved mockup after user review** — they do not
claim to already match it. Changing a PROPOSED value after mockup
approval is a one-place edit: tokens live in a single tokens file per
app, never scattered across components.

The rules in §4 are **DECIDED** (they restate `architecture.md` and
`decisions.md`; on any conflict, those files win). The component
inventory in §3 states purpose, states, and usage rules; per-component
detail (exact anatomy, variants, code) lives in the per-topic docs
listed in §7 when those are written. This document is docs + tokens
only: **no component code lands here or from this document** — code
lands after mockup approval (see §6).

## 1. Direction

A warm editorial system for long-form sacred reading: cream pages, ink
text, deep maroon as the primary brand, saffron and gold as accents.
The reader is the hero — shloka display, legibility, and calm
navigation outrank decoration. The admin app uses the same tokens with
a denser, work-oriented application of them (see §6).

## 2. Design tokens (all PROPOSED)

### 2.1 Color

Neutrals (warm cream family):

| Token | Value (PROPOSED) | Use |
| --- | --- | --- |
| `--color-page` | `#FDF6E9` | Page background |
| `--color-surface` | `#FFFCF3` | Card / panel background |
| `--color-raised` | `#F7F0DC` | Raised surface, sidebar |
| `--color-border` | `#E5D9BE` | Borders, dividers |
| `--color-ink` | `#2B2118` | Primary text |
| `--color-ink-secondary` | `#5C4A33` | Secondary text |
| `--color-ink-muted` | `#6E5B44` | Muted text, captions |

Brand:

| Token | Value (PROPOSED) | Use |
| --- | --- | --- |
| `--color-maroon` | `#7B1E26` | Primary brand, primary buttons, links |
| `--color-maroon-dark` | `#5E141B` | Hover, header band, dark sections |
| `--color-maroon-tint` | `#F7E8E6` | Tinted backgrounds, selected states |
| `--color-saffron` | `#C85A17` | Accent fills, large text, highlights |
| `--color-saffron-bright` | `#E87722` | Graphics, decorative accents only |
| `--color-saffron-text` | `#9C4A0F` | Saffron text and saffron buttons |
| `--color-saffron-tint` | `#FDEEDD` | Tinted backgrounds |
| `--color-gold` | `#B98A2F` | Accent lines, rules, decorative marks |
| `--color-gold-bright` | `#D4A017` | Graphics only |
| `--color-gold-tint` | `#F7ECD2` | Tinted backgrounds |

Functional (status and feedback):

| Token | Value (PROPOSED) | Use |
| --- | --- | --- |
| `--color-success` | `#2E7D32` | Success, published state |
| `--color-danger` | `#B3261E` | Errors, destructive actions |
| `--color-info` | `#1D5C7A` | Informational notes |
| `--color-warning-fill` | `#B98A2F` | Warning fills (with ink text, never gold text) |

Tier badge colors (PROPOSED; badges name the tier, never a price):

| Tier | Badge treatment (PROPOSED) |
| --- | --- |
| Free | Cream fill, ink text, ink outline |
| Seva | Saffron tint fill, saffron-text (`#9C4A0F`) text |
| Premium | Maroon tint fill, maroon text |
| Ultra | Gold tint fill, maroon text, gold rule |

Contrast pairs, computed from the values above (WCAG 2.1 AA: 4.5:1
normal text, 3:1 large text):

| Pair | Ratio | Verdict |
| --- | --- | --- |
| Ink on page cream | 14.65:1 | Pass (AAA) |
| Ink-secondary on page cream | 7.87:1 | Pass (AAA) |
| Ink-muted on page cream | 6.02:1 | Pass (AA) |
| Maroon on page cream | 9.50:1 | Pass (AAA) |
| Cream on maroon | 9.50:1 | Pass (AAA) |
| Cream on maroon-dark | 12.27:1 | Pass (AAA) |
| Dark saffron text on page cream | 5.75:1 | Pass (AA) |
| White on dark saffron | 6.18:1 | Pass (AA) |
| Ink on saffron tint | 13.84:1 | Pass (AA) |
| Maroon on gold tint | 8.70:1 | Pass (AA) |
| Success / danger / info on page cream | 4.77 / 6.08 / 6.82:1 | Pass (AA) |
| White on success / danger / info | 5.13 / 6.54 / 7.33:1 | Pass (AA) |

**Guardrails the ratios force:** bright saffron (`#E87722`, 2.75:1 on
cream) and gold (`#B98A2F`, 2.90:1 on cream) are never body text — graphics, rules,
and large display use only. Default saffron (`#C85A17`, 3.96:1 on
cream) is large text and fills only; saffron *text* always uses
`--color-saffron-text`. Any future token must verify ≥4.5:1 for normal
text before it is used as text.

Dark mode is NOT specified: no dark theme is decided. Do not invent
one; a dark theme is a later decision with its own contrast pass.

### 2.2 Typography (all PROPOSED)

Stacks (first family is the preferred family; fallbacks are required):

- Display serif: `Fraunces, Georgia, 'Times New Roman', serif`
  (PROPOSED — section titles, work titles, hero headings).
- Body serif: `'Source Serif 4', Georgia, 'Times New Roman', serif`
  (PROPOSED — long-form prose, translations, commentary).
- UI sans: `Inter, system-ui, -apple-system, 'Segoe UI', sans-serif`
  (PROPOSED — navigation, labels, buttons, tables, admin UI).
- Devanagari: `'Noto Serif Devanagari', 'Noto Sans Devanagari',
  Mangal, serif` — **Noto Serif Devanagari first** (required order).
  Devanagari text always uses this stack, never a Latin-only stack.
- Mono: `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`
  (PROPOSED — references, slugs, codes, technical strings).

Scale (PROPOSED; sizes are px, line-height unitless):

| Step | Size / line-height | Use |
| --- | --- | --- |
| Display | 40 / 1.15 | Work titles, hero headings |
| H1 | 32 / 1.2 | Page titles |
| H2 | 24 / 1.3 | Section headings |
| H3 | 20 / 1.35 | Subsection headings |
| Body | 17 / 1.6 | Prose, translations |
| Body Devanagari | 19 / 1.8 | Devanagari shloka and prose (larger + looser: conjunct legibility) |
| Small | 14 / 1.5 | Metadata, captions, table cells |
| Caption | 12 / 1.4 | Footnotes, attribution lines |

Rules: Latin and Devanagari text never share a size rule — Devanagari
is always set at the Devanagari step (see §5). Headings use the
display serif; UI chrome (nav, buttons, labels) uses the UI sans;
long-form prose uses the body serif. No font is loaded that the stack
does not name.

### 2.3 Spacing, radii, elevation, breakpoints (all PROPOSED)

Spacing scale (4-pt base, px): `4, 8, 12, 16, 24, 32, 48, 64, 96`.
Component padding uses the scale; arbitrary values are a defect.

Radii (px): inputs and chips `4`; cards and panels `8`; large cards
and dialogs `12`; pills, badges, and toggles `999` (fully rounded).

Elevation (shadows, PROPOSED):

- Level 0: none (flat on cream).
- Level 1 (cards, dropdowns): `0 1px 2px rgba(43,33,24,0.08)`.
- Level 2 (menus, popovers): `0 4px 12px rgba(43,33,24,0.12)`.
- Level 3 (dialogs, toasts): `0 12px 32px rgba(43,33,24,0.16)`.
- Focus ring (separate from shadow, always visible): `0 0 0 3px
  rgba(200,90,23,0.35)` outside the element outline (see §5).

Breakpoints (min-width, px, PROPOSED): mobile `0–479`; small tablet
`480`; tablet `768`; laptop `1024`; desktop `1280`; wide `1440`.
Layouts are mobile-first: single column below 768, sidebar layouts
from 1024. Breakpoint names are `sm, md, lg, xl, 2xl` in that order.

Motion (PROPOSED): default duration 150ms for feedback (hover,
focus, toggles), 250ms for panels and dialogs; easing
`ease-out`. Motion never carries meaning alone (see §5, reduced
motion).

## 3. Component inventory

Each entry states purpose, states, and do/don't rules. Per-component
detail (anatomy, variants, code) belongs in the §7 docs when written;
nothing here is component code.

### Buttons — primary / secondary / ghost

- Purpose: the single action control. Primary = the page's main
  action (maroon fill, cream text). Secondary = supporting actions
  (cream fill, maroon text, maroon outline). Ghost = quiet actions
  (no fill, ink text, underline or tint on hover).
- States: default, hover, focus (visible ring, §2.3), active,
  disabled (muted fill, no pointer, never hover-styled), loading
  (spinner + label kept, click blocked).
- Do: one primary per view. Don't: maroon text buttons on maroon
  backgrounds; saffron as a primary button except with
  `--color-saffron-text` fill and white text; disabled buttons that
  look clickable.

### Top navigation

- Purpose: wayfinding across the site (work families, search entry,
  tier state, account). Maroon-dark band with cream text, or cream
  band with ink text — one treatment per app, not both.
- States: default, hover (tint underline), active section (saffron
  rule beneath), focus, collapsed (mobile menu below 768).
- Do: keep the active section visibly marked. Don't: hide navigation
  behind hover; put gated content links where a gated read would leak
  (links to gated content render the same as any link — the read
  itself enforces the gate server-side).

### Breadcrumbs

- Purpose: orientation within a work (Scripture → Purana → Adhyaya →
  Shloka). UI sans, small step, ink-secondary with the current page
  in ink.
- States: default, hover (underline), current (not a link, `aria-current`).
- Do: mirror the real hierarchy. Don't: invent intermediate levels;
  truncate the current page's title.

### Cards

- Purpose: entry points (works, modules, glossary terms, search
  results). Surface background, level-1 elevation, radius 8.
- States: default, hover (level-2 elevation, no layout shift),
  focus-within (ring), selected (maroon-tint background + maroon rule).
- Do: one action per card region, whole-card links only where the
  card has exactly one destination. Don't: nested interactive
  elements inside a linked card; image-only cards with no text
  alternative.

### Shloka display (Devanagari + IAST + translation + commentary)

- Purpose: the reader's core block. Order is fixed: Devanagari verse
  (canonical, Devanagari stack, Devanagari step) → IAST transliteration
  → translation → commentary blocks. Transliteration direction is
  Roman/IAST → Devanagari canonical per `decisions.md`; the display
  order never reverses that authority — Devanagari leads, IAST aids.
- States: default; verse-number anchor (linkable, `#shloka-N`);
  commentary collapsed/expanded (state labelled, not icon-only);
  font-size control applied (see below).
- Do: keep each verse's blocks together; label the school of any
  doctrinal claim in commentary (see §4); carry disclaimers on
  wellness/jyotish/vastu commentary (see §4). Don't: render IAST as a
  substitute for Devanagari; mix commentary schools without labels;
  break a verse across pagination boundaries.

### Language / view toggles

- Purpose: switch the reader's aids — Devanagari / IAST / translation
  visibility, and commentary on/off. Segmented control (pill group),
  one active segment (maroon fill, cream text).
- States: active, inactive, hover, focus, disabled (when a view has
  no content for this verse — labelled, not silently absent).
- Do: persist the choice for the session; state the active view in
  text, not color alone. Don't: toggle the canonical Devanagari off
  and leave IAST as the only verse text without a clear label.

### Font-size control

- Purpose: reader scaling (A− / A / A+), scaling body and Devanagari
  steps together, preserving their ratio (Devanagari stays larger and
  looser). Range: three steps down to small, three steps up, from the
  base scale — never below the §5 legibility minimums.
- States: at-minimum / at-maximum (buttons disabled, labelled).
- Do: apply instantly, no reload. Don't: scale UI chrome with reader
  text; reset the size on navigation. Persistence beyond the session
  (account-level preference) is NOT decided — flagged in §8.

### Badges — tier (Free / Seva / Premium / Ultra)

- Purpose: name the tier a piece of content requires. Treatments per
  §2.1. Text is always the tier name; no price, no "Pro", never
  "Plus" (forbidden).
- States: default only (badges are not interactive; a gated badge
  links to the access explanation, not to the content).
- Do: show the badge wherever access is tier-gated. Don't: use color
  alone — the tier name is always printed; invent tier names.

### Adhyaya sidebar / contents

- Purpose: within-work navigation (adhyaya list, current position,
  progress). Raised surface, sticky from 1024 up, collapsible below.
- States: default, current (maroon rule + tint), visited (ink-secondary),
  hover, focus, collapsed (mobile: disclosure, labelled).
- Do: keep the current adhyaya visible on load (scroll into view).
  Don't: paginate the contents list; hide the current position.

### Prev / next navigation

- Purpose: sequential reading (previous / next adhyaya or shloka).
  Paired buttons with direction labels and the destination title.
- States: default, hover, focus, disabled at the ends (labelled
  "First" / "Last", not removed).
- Do: label destinations by title, not "Prev/Next" alone. Don't:
  remove the control at boundaries — disable it and say why.

### Forms / inputs

- Purpose: staff and visitor input (search, login, editorial fields).
  Cream surface, ink text, border token, radius 4, visible labels
  above every field.
- States: default, focus (ring), filled, error (danger border +
  error text, never color alone), disabled, readonly.
- Do: label every field; put errors in text beside the field.
  Don't: placeholder-only labels; error states that rely on color.

### Workflow bar (admin app)

- Purpose: S32 state and actions for the document being edited:
  current state (Draft / Review / Approve / Publish), transitions
  available to this user, two-key publish affordance, version note,
  annotations entry. This is the admin app's S32 surface; it enforces
  nothing by itself — the API enforces capabilities and the two-key
  rule server-side.
- States: per workflow state (color + text label, never color alone);
  action availability per capability (unavailable actions are
  disabled with a reason, not hidden); two-key progress (first key
  recorded, second key awaited — both labelled by actor and time).
- Do: show who holds each key; show the version number; link to the
  versions view and the audit trail. Don't: let the bar imply a
  reviewer can edit content (annotations only — a reviewer never
  mutates content); show a publish action to a user lacking either
  key as enabled.

### Tables

- Purpose: indexes, catalogs, admin lists. UI sans, small step,
  header row in raised surface with ink text, row dividers in border
  token.
- States: default, row hover (tint), sorted column (direction
  labelled in text), selected row (tint + rule), empty state (text,
  not a blank table).
- Do: keep headers visible on scroll for long tables; right-align
  numbers. Don't: use tables for layout; hide the empty state.

### Toasts / alerts

- Purpose: feedback and system messages (saved, published, error,
  Page-severity alerts in admin). Level-3 elevation, status color
  band + text label + icon, dismiss button.
- States: info, success, warning, error; auto-dismiss for success
  only (errors persist until dismissed); focus moves to error toasts.
- Do: write messages as outcomes ("Saved as Draft", not "Done").
  Don't: stack more than three; use toasts for content the user
  must act on later (that belongs in a persistent surface).

## 4. Rules the system must encode (DECIDED)

These restate the spine; they are not proposals:

- **Tiers:** Free < Seva < Premium < Ultra. Ultra is per-asset,
  platform-exclusive content in any format. No price is decided
  anywhere; price data seeds empty; prices are decided at pre-launch
  through a versioned admin mechanism. "Plus" never appears.
- **Access display:** a gated read returns 404 (or an empty list),
  never leaked content. UI never previews gated content; badges and
  links name the gate, they do not bypass it.
- **AI:** editor-assist only (ADR-010). AI may draft or suggest
  inside the editor's workflow; nothing AI-generated is saved,
  applied, or published without explicit editor action, and
  AI-assisted content passes S32 review. Autonomous AI is banned.
  No component renders AI output to visitors.
- **S32:** Draft → Review → Approve → Publish (closed set). Publish
  requires two keys (capability + Publish Authority membership).
  Versions are append-only; approving with edits keeps the document
  in review with annotations — a reviewer never mutates content.
  S32 governs content records, not media file rows.
- **Doctrinal labelling:** doctrinal claims are labelled by school,
  visibly, wherever they appear (shloka commentary, cards, search
  results). Haridasa and Haridasi are separate taxonomy nodes, never
  merged — labels and filters keep them distinct.
- **Disclaimers:** wellness, jyotish, and vastu content carries
  disclaimers, in the content surface itself, not only on a separate
  page.
- **Transliteration:** Roman/IAST → Devanagari is canonical. Display
  order (Devanagari first) follows that authority.
- **Canonical masters:** one canonical master per entity; everything
  else links or is a view. Components never duplicate master content
  as a second source.
- **Vocabulary:** an unapproved vocabulary entry stays optional;
  components never enforce an empty-vocabulary field.
- **Production-readiness:** no placeholder UI, no "coming soon"
  screens or sections, no mock/dummy content in any component. An
  unbuilt surface does not appear in navigation; an empty state shows
  a real empty state, never fabricated rows. Sample content appears
  only in design mockups, labeled as sample, never in shipped UI.
  Development/demo data, when needed, comes only from seed files
  under `api/prisma/seed/` (see `agents.md`).

## 5. Accessibility

- **Contrast:** WCAG 2.1 AA minimum — 4.5:1 normal text, 3:1 large
  text (≥18pt, or 14pt bold). All §2.1 text pairs meet AA; the
  guardrails in §2.1 are binding, not advisory. Large-text-only
  colors (bright saffron, gold) are never promoted to body text.
- **Focus:** every interactive element has a visible focus ring
  (§2.3) that is never removed by component styles. Focus order
  follows visual order; no focus traps except dialogs (which return
  focus on close).
- **Keyboard:** all functionality is keyboard-operable — navigation,
  toggles, sidebar, prev/next, workflow actions, dialogs, toasts'
  dismiss. No hover-only actions; no keyboard traps.
- **Devanagari legibility:** Devanagari body minimum is the
  Devanagari step (19px / 1.8) at base size; the font-size control
  never scales below 16px / 1.7 for Devanagari. Conjunct-heavy text
  is never set in a Latin-only stack and never letterspaced.
- **Text alternatives:** every meaningful image, icon button, and
  decorative mark has a text alternative or is marked decorative.
  Status is never color alone (badges print names, workflow states
  print labels, errors print text).
- **Motion:** `prefers-reduced-motion` disables non-essential
  animation entirely. No flashing content.
- **Touch:** interactive targets minimum 44×44px (mobile), 32px
  minimum in dense admin tables with 8px spacing between targets.

## 6. Adoption plan

Order of adoption (docs + tokens first, code after approval):

1. **Tokens file per app (first code step, after mockup approval).**
   `web/` and `admin/` each get one tokens module generated from §2
   (same values, separate files — the apps are separate Next.js apps
   and share no runtime). No component code reads a hardcoded color,
   size, or spacing value; everything references tokens.
2. **admin/ (Phase 3 app, in flight concurrently).** The admin app
   adopts tokens as it is built; because this document's values are
   PROPOSED until mockup approval, admin code must centralize them
   (single tokens file) so post-approval alignment is a one-file
   change, not a component-by-component rewrite. Workflow bar,
   forms, tables, and toasts are the first admin components to
   conform; full conformance is verified at Phase 3 verification.
3. **web/ (Phase 5 surfaces).** Public surfaces adopt the full system
   at build time: top navigation, breadcrumbs, cards, shloka display,
   toggles, font-size control, sidebar, prev/next, tier badges.
   Reader components (shloka display, toggles, font-size control)
   are built against the approved mockup, not against this document
   alone.
4. **Per-component detail docs (§7).** Written as each component is
   built, flipping its placeholder to WRITTEN in the same change
   (manifest + brain updated together, per the sync rule).
5. **Verification gate.** No app ships a component that violates §4
   or §5. Token alignment to the approved mockup is verified by
   diffing the tokens file against the mockup's approved values
   before component code is accepted.

What this document does NOT do: it does not approve the mockup, set
any price, name any font license, specify a dark theme, or decide
account-level preference persistence (see §8).

## 7. Detail-doc map (02_Design_System placeholders)

Per-component detail lands in these existing placeholders when the
component is built; this foundation doc stays the umbrella and never
duplicates their detail:

| Component / topic | Detail doc |
| --- | --- |
| Colors, type, spacing, radii, shadows | `COLOR_SYSTEM.md`, `TYPOGRAPHY.md`, `SHADOW_SYSTEM.md`, `DESIGN_TOKENS.md` |
| Buttons | `BUTTONS.md` |
| Cards | `CARDS.md` |
| Forms, inputs | `FORMS.md`, `INPUTS.md` |
| Tables | `TABLES.md` |
| Toasts / alerts | `TOASTS.md` |
| Breakpoints, grid | `BREAKPOINTS.md`, `GRID_SYSTEM.md` |
| Drawers, modals, empty states, skeletons | `DRAWERS.md`, `MODALS.md`, `EMPTY_STATES.md`, `SKELETONS.md` |
| Iconography, illustration, motion | `ICONOGRAPHY.md`, `ILLUSTRATION_STYLE.md`, `MOTION_SYSTEM.md` |
| Brand | `BRAND_GUIDELINES.md` |
| Shloka display, toggles, font-size control, sidebar, prev/next, workflow bar, breadcrumbs, top navigation | No dedicated placeholder — detail is added to this foundation doc (or a new doc with a manifest update) when the component is built |

## 8. Flags (proposed vs decided — named, not resolved)

1. **All §2 token values are PROPOSED** (hex colors, type sizes,
   spacing, radii, shadows, breakpoints, motion). They align with the
   approved Puranas mockup after user review; until then, no value
   here is claimed to match the mockup.
2. **Font families are PROPOSED** (Fraunces, Source Serif 4, Inter).
   Licensing, loading strategy, and fallbacks for constrained
   networks are not decided.
3. **No dark theme is decided.** Do not build one from this document.
4. **Account-level persistence of reader preferences** (font size,
   view toggles) is NOT decided. Session-level persistence is the
   interim rule in §3; account-level is a later decision.
5. **Tier badge treatments are PROPOSED** (colors and fills). Tier
   names and order are DECIDED; badge styling is not.
6. **This document does not approve the mockup.** Mockup approval is
   the user's step; component code waits for it (§6).
7. **Folder-number note:** the task brief named `docs/09_Frontend/`
   as the home for this doc, but in this tree 09 is Testing and the
   design-system folder is `02_Design_System`. This doc lives at
   `02_Design_System/DESIGN_SYSTEM.md` (new file, recorded in the
   manifest); the 20 per-topic placeholders stay for detail.
