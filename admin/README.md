# admin/ — staff admin app (Phase 3, G01 only)

Next.js 16.4.3 + React 19.3.1. Minimal but real: login, glossary list
(+ create), glossary edit, S32 workflow bar, versions view, review
assignments, audit view. No other modules' screens (G01 only).

## Auth pattern: BFF, tokens never touch the browser

- `app/api/auth/login` proxies to the API and sets httpOnly cookies
  (`access_token` 15 min, `refresh_token` 60 min, sameSite lax).
- `app/api/auth/logout` revokes server-side (best effort) and clears
  both cookies.
- `app/api/[...path]` forwards everything else (`/staff/glossary/*`,
  `/staff/audit`, `/auth/me`) to the API with the access cookie as a
  Bearer token, retrying once after a refresh on 401. Explicit
  `/api/auth/*` routes take precedence over the catch-all.
- `middleware.ts` redirects `/glossary*` to `/login` when the access
  cookie is absent (presence only; validity and capabilities are
  enforced by the API).

## Pages and components

- `app/login/page.tsx` — staff login form. Login failures surface the
  API's deliberately generic detail (no account-existence or lockout
  disclosure).
- `app/glossary/page.tsx` — staff list + create-draft form (all
  publish-gate-required fields).
- `app/glossary/[slug]/page.tsx` — edit form (Draft edits only; the
  API 409s otherwise), autosave toggle (PATCH with `autosave: true`,
  coalesced server-side in a 5-minute window), versions list,
  assignments list, audit section (recent events for this term;
  hidden when the caller lacks `audit.view`).
- `components/WorkflowBar.tsx` — state display + transitions:
  submit (roster-filtered reviewer picker), outcome recording
  (approved / returned / approved-with-edits, notes required for the
  latter two), approve, two-key publish, two-key unpublish, and a
  Super Admin-only break-glass section (reason mandatory). Denials
  surface as errors, never silent no-ops.
- `components/LogoutButton.tsx` — header logout.

## Env

- `API_URL` (server-only, default `http://localhost:3000`). The
  browser never calls the API directly, so no `NEXT_PUBLIC_*` API
  origin is needed.

## Run

```sh
npm install   # deps already installed in this workspace
npm run dev   # or: npm run build && npm run start
bash smoke.sh # build + start + /glossary 307 to /login, /login 200, zero 500s
```

## What is NOT here (deferred with the API)

User/role-admin screens, roster-admin surface, schedule-publish,
version-restore, SEO gate UI, MFA enrollment (elevated logins are
audited with `mfa_missing`; no session counts as MFA-verified).
