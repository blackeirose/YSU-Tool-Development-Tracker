# PROJECT_CONTEXT.md

## Project Identity

**Name:** YSU Tool Development Tracker  
**Repository:** `blackeirose/YSU-Tool-Development-Tracker`  
**Type:** Lightweight web application / development dashboard  
**Status:** Active — Supabase cloud Tracker live; Skills Mode added 2026-09-26; Skills metadata contract v1 added 2026-09-27

## Purpose

One product, two top-level modes (DEC-008):

- **Tasks** — track YSU software/tool ideas, active development, priorities, progress, resources, workload, launch links, current state, and next steps in a Table / Kanban interface.
- **Skills** — browse, search and locate the registered YSU Skills, read-only, from the registry maintained in Google Drive.

Primary user: YuCheng Su.

## Current Product State

### Tasks Mode

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

### Skills Mode

Read-only management view over the YSU Skills registry:

- List view (default) and Visual view, grouped by purpose domain with collapsible groups and style-family subgroups
- search, plus Category / Lifecycle / Validation / Platform / Has-graphic-reference / Has-conversation-link filters
- Skill detail drawer reusing the existing modal pattern
- Lifecycle (Candidate / Draft / Approved / Retired) and Validation (Untested / Partial / Validated) shown as independent dimensions
- conversation locator (`DIRECT_LINK` / `PROJECT_TITLE_ONLY` / `UNLOCATED`) and platform availability (Drive / ChatGPT / Codex)
- graphic-reference counts; the reference images themselves stay private in Drive
- owner-curated cover thumbnails on Visual cards and in the detail drawer
  (`skill-thumbnails.json` + `assets/skill-thumbs/`, DEC-012); Skills without
  one keep the generated tile
- per-field provenance: whether a value is explicit registry metadata or derived by the parser

Skills Mode is read-only for everyone including the owner. A Skill is added or
changed in the Drive registry, never in the Tracker. It is not a Skills CMS and
has no install/uninstall management.

## Architecture

Pattern: authenticated cloud application with public read access, plus a
generated static index for Skills.

Current flow:

`Tasks:  Browser UI → Supabase JavaScript client → Supabase Postgres`

`Skills: Google Drive 00_SKILL_REGISTRY.md → generated skills.json → Browser UI`

Skills Mode does not touch Supabase (DEC-009).

Source code and deployment remain separate from application data:

`GitHub → GitHub Pages → tracker.ycsu.cc`

## Technology

- Static HTML / CSS / JavaScript
- Node script `tools/generate-skills-index.mjs` (build-time only, no runtime dependency)
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

### Skills data

Canonical registry: `Google Drive / AI Works / 06_Skills / 00_SKILL_REGISTRY.md`
(file id `1g6Io9lD4YwkDaX5_OUqssvrcEyuCF-1P`). Cloud staging for unprocessed
material: `AI Works / 06_Skills / 00_PENDING`
(id `1vsF8Wd7gvGoCwKz2zBXOBBDHqvOVOStW`).

`skills.json` is generated from an export of that registry held in
`skills-source/`. Both are disposable and must never be hand-maintained; see
`skills-source/README.md` for the refresh procedure, the explicit Tracker
Metadata contract and the parser's fallback assumptions. No Supabase table,
database or backend service exists for Skills.

Field resolution is explicit metadata -> deterministic legacy parser -> null
(DEC-010). SSF-B02 added eight explicit metadata entries on 2026-10-01: six Approved / Partial
profiles and two Draft / Partial profiles requiring revision. The original 13
registered entries and existing pending candidate keep their prior derived values.

Cloud staging `00_PENDING` is governed by a processing contract mirrored at
`skills-source/PENDING_CONTRACT.md` (DEC-011). The first owner-authorized batch, SSF-B02, was processed on 2026-10-01; six
profiles were approved and archived, and two remain pending correction. There is
no automated batch processor.

`C:\Users\ysu\OneDrive - DLR Group\Codex\Skills` is a local Skill staging /
development source only. It is not mirrored to Drive and there is no automatic
synchronisation in either direction.

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

Skills Mode shipped as a small MVP: browse, search, locate. Skill metadata
editing and install management are deliberately out of scope until there is a
concrete need. Cover thumbnails were added 2026-09-27 at the owner's request
(DEC-012).

Phase 2 added the explicit metadata contract and the Pending processing
contract. The next step is incremental registry normalization, then — only on
explicit owner authorisation — the first Pending batch.

## Next Likely Milestone

Improve shared YSU owner/admin interaction patterns only when there is a concrete usability need; do not add a new framework or authentication system for consistency alone.

## Agent Entry Summary

This is a lightweight static Tracker deployed with GitHub Pages at `tracker.ycsu.cc`, with two modes: Tasks and Skills. GitHub is the code source of truth; Supabase is the cloud data source for Tasks; Google Drive is the canonical source for Skills and `skills.json` is generated from it. Public access is read-only. Owner editing uses the same Supabase owner identity as MAIN and is protected by RLS using the fixed owner UUID. Read `DECISIONS.md` before making durable architecture, access, or service changes.


## Email OTP maintenance

The shared Supabase project already uses the owner's Resend Custom SMTP, six-digit email OTP (3600-second expiry) and a passwordless email containing both Token and ConfirmationURL, verified during MAIN v1.4 maintenance. Tracker reuses that configuration and explicitly redirects compatible email links to its own origin. No shared Auth settings, RLS, other app or Tracker records were changed in this frontend task.

Sign-out immediately removes editing and closes detail/link editors before awaiting the SDK. Mutation handlers recheck current owner permission so stale controls cannot modify the fallback cache after logout. Delayed initial hydration and OTP responses cannot replace a newer identity. Non-owners retain public read-only access.

Development validation: `npm ci --ignore-scripts` and `npm test`; tests use local fake Auth/database fixtures only. Deployment remains the existing main-branch GitHub Pages process. See `docs/validation/email-otp-2026-09-11.md` for acceptance and recovery evidence.

## SSF-B02 registry refresh — 2026-10-01

The owner approved cases 01, 02, 03, 04, 07 and 08; 05 and 06 require additional correction. The registry now has 21 registered entries plus the existing pending candidate. Six selected reference-derived cover thumbnails are prepared locally. The owner explicitly authorized public GitHub/Tracker synchronization on 2026-10-01, resolving the earlier automatic-review block; full reference sets and packages retain private Drive permissions. No Hub publication or runtime Skill installation occurred.


Purpose/style taxonomy v1 is generated from the Drive registry (DEC-014): six purpose domains, three currently used style families, and medium/subject tags. All 22 entries have taxonomy; 8 entries have the separate full Tracker Metadata block. The existing category filter remains as a compatibility filter.


## Style 05 instruction revision — 2026-10-02 UTC

YSU-SKILL-018 v0.2.0 now describes personal-photo framing and a quiet person–environment relationship. Rules/archive are Approved; current-version image validation is Untested. The prior two unsuitable targets remain historical. Case 06 stays Draft for deeper analysis. No new image cover, UI behavior, runtime Skill installation or Hub publication is part of this metadata refresh.


## Latest SSF-B02 state — 2026-10-02 UTC

All eight instruction/reference packages have owner-approved rules and Drive archives. Six profiles retain v1.0.0 / Partial validation. Styles 05 and 06 are v0.2.0 / Untested after substantive revisions, with testing explicitly deferred. Style 06 is now 懷舊手繪動畫敘事海報 / Nostalgic Hand-Painted Anime Narrative Poster under Painting & Illustration; medium describes opaque painted color. Earlier pending-correction notes are historical. New source images or public thumbnails are not part of this metadata refresh. No runtime installation or Hub publication.


## Style 05/06 covers — 2026-10-02 UTC

Complete all eight SSF-B02 original-reference covers under DEC-017. Style 05 uses P05-015; Style 06 uses P06-020. Existing UI consumes the two new manifest entries and local WebP assets; no runtime behavior or task data changes. Both profiles remain Approved / Untested. Drive source/final folders were reorganized with stable IDs and links, and PENDING is now empty; batch records live in the archive.


## WC-A/B package refresh — 2026-10-02

The canonical registry now lists 27 registered Skills plus the existing pending candidate. 026/027 are watercolor instruction/reference packages, Approved / Untested v1.0.0, with original-reference thumbnails and direct instruction/package links. No runtime installations or Hub entries were created. Style 13 and WC-C remain on hold outside the registered-Skill count. See DEC-021 and the private source packages for evidence limits.


## Cinematic Inkframe approval — 2026-10-02

YSU-SKILL-012 is now Approved / Partial based on the owner's acceptance of the existing SFDOT character board. Version 0.1.0 and the SFDOT thumbnail are preserved. This overrides the previous derived Candidate state, not the outstanding motion/cross-project validation limits. The catalog still contains 27 registered Skills plus one pending item; 15 entries now have explicit metadata. See DEC-022. No Hub content or runtime installation changes.

## Sprite production catalog refresh — 2026-10-02

YSU-SKILL-028 Sprite Animation Production / 逐格角色動畫製作 v1.0.0 is added from the canonical Drive registry, Approved / Untested. It belongs to existing Character Design and uses the selected original method diagram as its public 720px cover. Counts become 28 registered + 1 pending; 16 have explicit metadata. Direct SKILL.md, ZIP and canonical-folder links are available. All preexisting catalog records are preserved. See DEC-023 and docs/validation/sprite-2026-10-02.md. The animation method itself remains untested in production; Tracker publication does not install it or publish it to Hub.


## Sculptural Scroll Couture catalog refresh — 2026-10-02

YSU-SKILL-029 v1.0.0 adds the owner's requested photographic couture style under the existing Photography & Realism family. Counts become 29 registered + 1 pending, 17 explicit metadata entries. Approved refers to instruction/reference packaging; current-prompt visual validation remains Untested. The original R01 cover and direct SKILL/ZIP links accompany the registry-derived entry. Previous catalog records remain unchanged. See DEC-024 and docs/validation/couture-2026-10-02.md.
