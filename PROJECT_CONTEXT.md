# PROJECT_CONTEXT.md

## Project Identity

**Name:** YSU Tool Development Tracker  
**Repository:** `blackeirose/YSU-Tool-Development-Tracker`  
**Type:** Lightweight web application / development dashboard  
**Status:** Active — Supabase cloud-sync migration in progress

## Purpose

Track YSU software/tool ideas, active development, priorities, progress, resources, workload, launch links, current state, and next steps in a single editable Table / Kanban interface.

Primary user: YuCheng Su.

## Current Product State

The Tracker supports:

- Table view
- Kanban / Card view
- filtering and sorting
- inline editing
- detail editing
- drag-and-drop status changes
- launch links
- workload / progress metrics
- add and delete operations

The original application stored all Tracker item data in browser `localStorage`.

A Supabase cloud-sync migration is now being implemented so Tracker data can be shared across devices and updated by connected AI/development workflows.

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

Browser localStorage remains temporarily as a migration safety copy and local fallback.

## Authentication / Access

Current intended access model:

- public users: read-only
- authenticated owner (`blackeirose@gmail.com`): insert / update / delete

Row Level Security is enabled on `tracker_items`.

The Supabase publishable key may be present in client-side code; privileged service-role credentials must never be committed to GitHub or exposed in the browser.

## Migration State

Supabase project and database schema are created.

The frontend has been updated to:

- read cloud data when available
- preserve localStorage data when cloud is empty
- support owner sign-in
- offer one-time localStorage → Supabase migration
- keep local data intact if migration fails

The first real-data migration must be performed from the browser/profile that contains the current Tracker localStorage data.

## Important Constraints

- Do not overwrite existing local Tracker data before successful migration.
- Do not seed Supabase with stale repository sample data when newer browser data may exist.
- Preserve the lightweight static architecture unless requirements justify additional complexity.
- Do not replace GitHub Pages merely because another deployment service is available.
- Keep database and UI responsibilities separated enough that the service can be replaced later if needed.

## Current Development Focus

Complete and validate the first cloud migration from existing browser localStorage into Supabase, then verify cross-device read/write behavior.

## Next Likely Milestone

After cloud migration is validated, allow ChatGPT / Codex / Gemini workflows to update Tracker records through the shared cloud data layer when appropriate.

## Agent Entry Summary

This is a lightweight static Tracker deployed with GitHub Pages at `tracker.ycsu.cc`. GitHub is the code source of truth; Supabase is the cloud data source. Preserve the existing interface and local migration safety copy. Public access is read-only; owner-authenticated access can edit. Read `DECISIONS.md` before making durable architecture or service changes.
