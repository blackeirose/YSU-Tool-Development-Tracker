# PROJECT_CONTEXT.md

## Project Identity

**Name:** YSU Tool Development Tracker  
**Repository:** `blackeirose/YSU-Tool-Development-Tracker`  
**Type:** Lightweight web application / development dashboard  
**Status:** Active — Supabase cloud Tracker live

## Purpose

Track YSU software/tool ideas, active development, priorities, progress, resources, workload, launch links, current state, and next steps in a Table / Kanban interface.

Primary user: YuCheng Su.

## Current Product State

The Tracker supports:

- Table view
- Kanban / Card view
- filtering and sorting
- inline editing in owner mode
- detail editing in owner mode
- drag-and-drop status changes in owner mode
- launch links
- workload / progress metrics
- add and delete operations in owner mode
- public read-only browsing
- MAIN-style Owner sign-in via six-digit Supabase email OTP

The original browser-only `localStorage` data has already been migrated to Supabase. Supabase is the runtime source of truth; localStorage remains only as a local safety/fallback cache.

## Architecture

Pattern: authenticated cloud application with public read access.

Current flow:

`Browser UI → Supabase JavaScript client → Supabase Postgres`

Source code and deployment remain separate from application data:

`GitHub → GitHub Pages → tracker.ycsu.cc`

## Technology

- Static HTML / CSS / JavaScript
- Supabase JavaScript client
- Supabase Postgres
- Supabase Auth
- GitHub Pages

No frontend framework is currently required.

## Source Control

Canonical source:

`https://github.com/blackeirose/YSU-Tool-Development-Tracker`

Default branch: `main`

GitHub is the source of truth for application code and project documentation.

## Deployment

Platform: GitHub Pages  
Source: `main` branch, repository root  
Production domain: `https://tracker.ycsu.cc`  
Custom domain configuration is stored in `CNAME`.

## Data / Storage

Cloud project: `ysu-tool-tracker`  
Supabase project ref: `fzydsnxxcdllkjxwdiwn`

Primary table: `public.tracker_items`

Cloud data includes:

- tool/project name
- category
- platform
- GitHub requirement
- status
- progress
- priority
- current state
- next step
- assigned resource
- Codex load
- Image 2 estimate
- hours
- notes
- readiness
- launch links
- ordering and timestamps

Browser localStorage remains as a safety/fallback cache, not the canonical Tracker state.

## Authentication / Access

Current access model:

- public users: read-only
- authorized owner: insert / update / delete and Kanban drag/status changes

Owner access intentionally matches the YCSU MAIN interaction pattern:

`Public read-only → Owner sign in → six-digit email code → verify in the original browser → owner edit mode`

The authorized owner is identified by the fixed Supabase Auth user ID `38531f7e-e05e-473a-a587-500b1d3aebe5` (current account email `blackeirose@gmail.com`). Frontend UI checks the same owner ID; database Row Level Security is the actual write authorization boundary.

`tracker_items` RLS:

- `anon` + `authenticated`: SELECT
- authenticated owner UUID only: INSERT / UPDATE / DELETE

The Supabase publishable key may be present in client-side code; privileged service-role credentials must never be committed to GitHub or exposed in the browser.

## Owner UI

The legacy always-visible email/auth bar is retained only as hidden compatibility DOM for the existing application code. `owner-ui.js` provides the user-facing owner flow; `email-otp.js` handles request/verify and the 60-second resend cooldown. `app.js` owns the single revision-guarded Auth lifecycle and requires the fixed owner UUID even during local fallback. Supabase SDK 2.116.0 is vendored and pinned; its default session storage/refresh and Magic Link callback remain compatible.

Public mode hides owner-only controls such as Add Item, Delete Selected, row selection/delete columns, inline editing, and Kanban drag behavior. Owner mode restores those capabilities.

## Important Constraints

- Preserve public read-only access.
- Never relax owner write RLS to all authenticated users.
- Owner authorization should use the stable Supabase user ID, not user-editable metadata or a client-supplied role.
- Preserve the lightweight static architecture unless requirements justify additional complexity.
- Do not replace GitHub Pages merely because another deployment service is available.
- Keep database and UI responsibilities separated enough that the service can be replaced later if needed.
- Preserve localStorage as a safety/fallback cache unless a deliberate cleanup milestone removes it.

## Current Development Focus

Maintain the live cloud Tracker and keep project/task state current. Owner editing should remain consistent with MAIN while public visitors get a clean read-only view.

## Next Likely Milestone

Improve shared YSU owner/admin interaction patterns only when there is a concrete usability need; do not add a new framework or authentication system for consistency alone.

## Agent Entry Summary

This is a lightweight static Tracker deployed with GitHub Pages at `tracker.ycsu.cc`. GitHub is the code source of truth; Supabase is the cloud data source. Public access is read-only. Owner editing uses the same Supabase owner identity as MAIN and is protected by RLS using the fixed owner UUID. Read `DECISIONS.md` before making durable architecture, access, or service changes.


## Email OTP maintenance

The shared Supabase project already uses the owner's Resend Custom SMTP, six-digit email OTP (3600-second expiry) and a passwordless email containing both Token and ConfirmationURL, verified during MAIN v1.4 maintenance. Tracker reuses that configuration and explicitly redirects compatible email links to its own origin. No shared Auth settings, RLS, other app or Tracker records were changed in this frontend task.

Sign-out immediately removes editing and closes detail/link editors before awaiting the SDK. Mutation handlers recheck current owner permission so stale controls cannot modify the fallback cache after logout. Delayed initial hydration and OTP responses cannot replace a newer identity. Non-owners retain public read-only access.

Development validation: `npm ci --ignore-scripts` and `npm test`; tests use local fake Auth/database fixtures only. Deployment remains the existing main-branch GitHub Pages process. See `docs/validation/email-otp-2026-09-11.md` for acceptance and recovery evidence.
