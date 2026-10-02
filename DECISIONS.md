# DECISIONS.md

## Decision Index

| ID | Title | Status |
|---|---|---|
| DEC-001 | Use Supabase for cross-device Tracker data | ACTIVE |
| DEC-002 | Keep GitHub as code source of truth | LOCKED |
| DEC-003 | Keep GitHub Pages for current hosting | ACTIVE |
| DEC-004 | Public read, owner-authenticated write | LOCKED |
| DEC-005 | Preserve localStorage as migration/fallback safety copy | LOCKED |
| DEC-006 | Match MAIN owner sign-in and authorize by fixed Supabase user ID | LOCKED |
| DEC-007 | Six-digit email OTP in the original browser | ACTIVE |
| DEC-008 | Tracker has two modes: Tasks and Skills | ACTIVE |
| DEC-009 | Skills data is generated from the Drive registry, not a database | LOCKED |
| DEC-010 | Explicit Tracker Metadata beats derived values | ACTIVE |
| DEC-011 | 00_PENDING has a processing contract, and nothing has been processed | ACTIVE |

---

## DEC-001 — Use Supabase for cross-device Tracker data

**Status:** ACTIVE  
**Date:** 2026-08-15  
**Scope:** Architecture / Data

### Decision

Move Tracker project data from browser-only `localStorage` to Supabase Postgres so the same Tracker state can be accessed across devices and by connected development workflows.

### Context

The original Tracker was useful but data existed only in one browser profile. That prevented reliable cross-device use and direct cloud updates.

### Reasoning

Cross-device synchronization is a real product requirement, so cloud persistence is justified under the YSU AI Core architecture rules.

### Consequences

Supabase is the canonical runtime Tracker data store, while GitHub remains the canonical source for code and durable project documentation.

---

## DEC-002 — Keep GitHub as code source of truth

**Status:** LOCKED  
**Date:** 2026-08-15  
**Scope:** Source Control

### Decision

GitHub remains the canonical source for Tracker code, configuration, and project documentation.

### Consequences

Supabase stores runtime Tracker data but does not replace GitHub's source-control role.

---

## DEC-003 — Keep GitHub Pages for current hosting

**Status:** ACTIVE  
**Date:** 2026-08-15  
**Scope:** Deployment

### Decision

Continue deploying the current static Tracker from the `main` branch root through GitHub Pages at `tracker.ycsu.cc`.

### Reasoning

The current static application does not require a hosting migration merely because cloud data has been added. Supabase provides persistence; it does not require changing the web host.

### Change Conditions

Revisit only if future requirements require capabilities GitHub Pages cannot cleanly provide.

---

## DEC-004 — Public read, owner-authenticated write

**Status:** LOCKED  
**Date:** 2026-08-15  
**Updated:** 2026-09-11  
**Scope:** Security / Access

### Decision

Tracker cloud data remains publicly readable. Insert, update, and delete operations require the authorized owner Supabase session.

The database authorization boundary is the owner's stable Supabase Auth user ID, not merely an email string in the client.

### Reasoning

This preserves convenient public viewing while preventing anonymous or other authenticated users from modifying Tracker data.

### Consequences

Row Level Security must remain enabled. Public users may SELECT. Only the authorized owner UUID may INSERT / UPDATE / DELETE unless the user explicitly changes the collaboration model.

---

## DEC-005 — Preserve localStorage as migration/fallback safety copy

**Status:** LOCKED  
**Date:** 2026-08-15  
**Updated:** 2026-09-11  
**Scope:** Data Migration / Recovery

### Decision

Keep the existing browser `localStorage` Tracker cache as a safety/fallback copy after cloud migration.

Supabase is now the canonical runtime data source. localStorage must not silently replace newer cloud state.

### Reasoning

The local copy remains useful for resilience and recovery while the cloud Tracker is the shared cross-device source of truth.

### Consequences

Local fallback may display cached data during cloud failure, but public visitors remain read-only even in fallback mode. Editing still requires the authorized owner session.

---

## DEC-006 — Match MAIN owner sign-in and authorize by fixed Supabase user ID

**Status:** LOCKED  
**Date:** 2026-09-11  
**Scope:** Authentication / UX / Security

### Decision

Tracker owner access follows the same interaction model as `main.ycsu.cc`:

`Public read-only → Owner sign in → email magic link → verified owner session → edit mode`

The authorized owner is Supabase Auth user ID:

`38531f7e-e05e-473a-a587-500b1d3aebe5`

Current email for that account: `blackeirose@gmail.com`.

The UI may use the email address to initiate passwordless sign-in, but authorization must ultimately depend on the stable owner user ID and RLS.

### Reasoning

Using the same owner identity and interaction pattern across MAIN and Tracker reduces friction and makes access behavior predictable. A stable user ID is a stronger authorization boundary than trusting a client-side email comparison or user-editable metadata.

### Consequences

- Public visitors see a clean read-only Tracker.
- Owner-only edit controls are hidden until the verified owner session is active.
- `shouldCreateUser` remains false for owner sign-in, so the owner UI cannot create arbitrary new Auth users.
- Tracker RLS write policies use `auth.uid()` against the fixed owner UUID.
- Do not authorize via `user_metadata`, display name, or a client-supplied role.


## DEC-007 — Six-digit email OTP in the original browser

**Status:** ACTIVE
**Date:** 2026-09-11
**Scope:** Authentication UX

YuCheng requested the same email OTP improvement released for MAIN. Tracker now uses signInWithOtp with shouldCreateUser:false, then verifyOtp with email/token/type=email. A single six-digit field supports numeric keyboards, one-time-code autofill, leading-zero paste and Enter. Resend cooldown is 60 seconds; invalid/expired/used, rate-limit and network errors remain retryable.

This updates the Magic Link-only UX in DEC-006 while retaining its exact owner UUID and all DEC-004 RLS boundaries. The existing Supabase project, Resend settings, shared email template and allowed redirects are reused without modification. No new authentication service or account-registration path is introduced. SDK session persistence and Magic Link compatibility remain.

One app.js Auth lifecycle owns session updates; owner-ui consumes the current state. Logout revokes editing synchronously and closes stale editors. Client permission checks protect both cloud interaction and local fallback; database RLS remains authoritative. Pin the existing Supabase SDK at 2.116.0 so reviewed and deployed behavior remain reproducible.


## DEC-008 — Tracker has two modes: Tasks and Skills

**Status:** ACTIVE
**Date:** 2026-09-26
**Scope:** Product / Information Architecture

### Decision

`tracker.ycsu.cc` is one product with two top-level modes, `TASKS` and `SKILLS`.
Tasks keeps its existing Supabase architecture, data model, RLS, owner sign-in
and Table/Card views unchanged. Skills is a new read-only management view over
the YSU Skills registry.

No separate site, subdomain or login is created for Skills. No further top-level
modes (MAIN, Projects, Media Library, Hub, Mind Map) are part of this decision.

### Consequences

- Each mode remembers its own last-used view independently: Tasks in
  `ysu-tracker-view-v13`, Skills in `ysu-skills-view-v1`, the active mode in
  `ysu-tracker-mode-v1`.
- Tasks defaults to Table; Skills defaults to List, because Skills is a
  management interface rather than a gallery.
- The owner sign-in shell is shared. Skills Mode stays read-only even for the
  owner; a Skill is edited in Drive, not in the Tracker.

---

## DEC-009 — Skills data is generated from the Drive registry, not a database

**Status:** LOCKED
**Date:** 2026-09-26
**Scope:** Architecture / Data

### Decision

The canonical Skill index is
`Google Drive / AI Works / 06_Skills / 00_SKILL_REGISTRY.md`
(file id `1g6Io9lD4YwkDaX5_OUqssvrcEyuCF-1P`).

Skills Mode reads a generated static `skills.json`, produced from that registry
by `tools/generate-skills-index.mjs`. **Skills Mode does not use Supabase.**
No Skills table, database, backend service or second registry is created.

`skills.json` and `skills-source/00_SKILL_REGISTRY.md` are generated/disposable
artefacts. Neither may be hand-maintained.

### Reasoning

The registry is already a working human-maintained management document, and the
Tracker only needs to read it. Under the YSU AI Core architecture rules there is
no product requirement that justifies a second database.

### Consequences

- Cloud staging for unprocessed material is one folder,
  `AI Works / 06_Skills / 00_PENDING` (created 2026-09-26, id
  `1vsF8Wd7gvGoCwKz2zBXOBBDHqvOVOStW`). Lifecycle state lives in registry and
  Tracker metadata, not in a chain of physical folders.
- `C:\Users\ysu\OneDrive - DLR Group\Codex\Skills` remains a local staging /
  development source. It is not mirrored, synchronised or reorganised, and no
  automatic local-to-cloud sync exists.
- Lifecycle (Candidate / Draft / Approved / Retired) and Validation (Untested /
  Partial / Validated) are independent dimensions derived by documented rules in
  `skills-source/README.md`. Unknown is recorded as unknown; no value is
  invented, and no conversation URL is ever constructed.

---

## DEC-010 — Explicit Tracker Metadata beats derived values

**Status:** ACTIVE
**Date:** 2026-09-27
**Scope:** Data / Skills index

### Decision

A Skill section in `00_SKILL_REGISTRY.md` may carry a plain-Markdown
`Tracker Metadata:` block, defined by *YSU Skills — Tracker Metadata Schema v1*
(Google Doc `1xtTW76ksdd3pgWgB6sDGy7302tRhRzHjamYYxsv5CVo`).

The generator resolves every field in this order:

1. explicit value in that block
2. deterministic legacy parser
3. `null` / Unknown

**An explicit value is never overwritten by a heuristic.** A value outside the
contract is rejected with a warning and the derived value is kept, so
`skills.json` cannot carry an out-of-contract token. `DIRECT_LINK` additionally
requires a real conversation URL; a claim without one is downgraded. No URL,
version, validation state or platform availability is ever invented.

The registry remains a human-readable management document. It is **not**
converted to JSON or YAML, and it is not rewritten around a machine schema.

### Consequences

- Lifecycle, Validation and platform availability stay independent dimensions.
- Normalization is incremental: a Skill gains its block when it is next touched,
  reviewed or processed. **No Skill has been normalized yet** — all 13 registered
  Skills and the pending candidate are still fully derived.
- Each entry carries `metadata_source` and `has_explicit_metadata` so
  normalization progress is visible in the Tracker without a new screen.
- The parser branch is covered by `tests/fixtures/registry-explicit.md`, a
  synthetic registry that nothing reads at runtime.

---

## DEC-011 — 00_PENDING has a processing contract, and nothing has been processed

**Status:** ACTIVE
**Date:** 2026-09-27
**Scope:** Process / Skills intake

### Decision

`AI Works / 06_Skills / 00_PENDING` (id `1vsF8Wd7gvGoCwKz2zBXOBBDHqvOVOStW`) is
governed by *00_PENDING — Processing Contract* (Google Doc
`1JpvOtAKAjBgw4Tj4fZHtpPltkiLop6k8zYXmH4Re--g`), mirrored in the repository at
`skills-source/PENDING_CONTRACT.md`.

Once the owner authorises a batch, each item resolves to exactly one of
`NEW_SKILL`, `MERGE_EXISTING`, `KEEP_PENDING` or `NO_ACTION`.

### Current state

**Preparation only. No Pending content has been processed.** No file inside
`00_PENDING` has been read, analysed, classified, moved, merged, promoted,
rejected, installed or published, and no canonical Skill has been changed from
Pending material. The batch intake record is a document, not a database, and no
automated batch processor exists.

### Consequences

- The Pending workflow must not be described as operational until a batch has
  actually been processed under explicit owner authorisation.
- `C:\Users\ysu\OneDrive - DLR Group\Codex\Skills` remains local staging only,
  with no automatic synchronisation in either direction.
- No additional physical folder lifecycle is created; state lives in metadata.

---

## DEC-012 — Skill cover thumbnails are owner-curated public repo assets

**Status:** ACTIVE
**Date:** 2026-09-27
**Scope:** UI / Skills Mode

### Decision

At the owner's explicit request, Skills Mode shows one cover thumbnail per Skill
on Visual cards and at the top of the detail drawer.

- Images live in `assets/skill-thumbs/<slug>.webp` (720 px wide, WebP,
  metadata stripped) and are mapped by Skill ID in `skill-thumbnails.json`.
- Unlike `skills.json`, this manifest is **hand-maintained**: the owner chooses
  each cover. The generator does not read or write it, and it is not derived
  from the private Drive graphic references.
- The frontend accepts only relative `assets/skill-thumbs/` paths; anything else
  is ignored. A missing or broken manifest falls back to the generated tile.
- Covers are public once deployed, because the Tracker is publicly readable.
  Only add an image the owner has chosen to publish.

### Consequences

- The first set (2026-09-27) covers YSU-SKILL-001, 002, 003, 005, 006, 008, 009,
  012 and 013. YSU-SKILL-004, 007, 010, 011 and YSU-PENDING-001 keep the tile.
- To add or replace a cover: save the image under `assets/skill-thumbs/`, add or
  update its ID in `skill-thumbnails.json`, run `npm test`.


## DEC-013 — SSF-B02 owner review and registry refresh

**Status:** ACTIVE
**Date:** 2026-10-01
**Scope:** Skills content only

The owner authorized processing eight Drive style folders and approved all except cases 05 and 06. Register 014–021 with explicit metadata: 014/015/016/017/020/021 are Approved + Partial at v1.0.0; 018/019 are Draft + Partial, with revision required. This supersedes the preparation-only current-state statement in DEC-011 for this batch; no automated processor is introduced.

Case 02 is 裂紙浮空 / Floating Torn-Paper Worlds, preserving contemplative negative space where the content target permits. Registry export and generated index remain disposable. Prepare the six owner-selected 720px covers under DEC-012. On 2026-10-01 the owner explicitly authorized public Tracker synchronization (「你更新到TRACKER上吧 同意同步」), including the previously disclosed names, descriptions, states and six original-reference cover derivatives. The prior disclosure block is resolved. Task data, auth, application behavior and hosting are unchanged.


## DEC-014 — Compact purpose and style taxonomy

**Status:** ACTIVE
**Date:** 2026-10-01

The owner requested grouping related styles and Skills under a small number of reusable categories, including interior/exterior architecture and watercolor styles. Each Skill has one primary purpose domain, a purpose area, an optional style family and medium, and multiple tags. These are independent dimensions: a generic style is not duplicated for each subject.

Six purpose domains cover the current inventory. Architectural interiors, exteriors/landscape and BIM/components are subareas of Architecture & Space. The eight SSF-B02 styles share three families: Painting & Illustration (01/04/06/07), Paper & Fiber (02/03/08), Photography & Realism (05). Watercolor belongs under Painting & Illustration; Gouache remains a distinct medium. Palette, mood, era, composition and subject use tags, not new top-level groups. Prefer 3–5 style families; add only for a recurring distinction not covered by an existing family. Do not create empty groups or infer tested capabilities from a subject tag.

The human-readable `Skill Taxonomy v1` table in the canonical Drive registry owns assignments. `tools/skill-taxonomy.mjs` defines stable IDs/labels and validates assignments; generated `skills.json` carries them as `taxonomy`. Visual mode groups by purpose then style family; filters/search/list/detail use the same data. Existing `category` and v1 provenance are retained for compatibility; taxonomy has its own explicit source. Hub handoff maps `domain_id`, `area`, `style_family_id`, `medium`, `tags` without flattening them into more categories. No Hub publication is implied.


## DEC-015 — Style 05 approved rules with deferred image testing

**Status:** ACTIVE
**Date:** 2026-10-02 UTC (2026-10-01 America/Los_Angeles)

The owner authorized writing Style 05's revised analysis into the Skill now and testing later when suitable personal photos are available. YSU-SKILL-018 v0.2.0 is 靜觀人境攝影 / Contemplative Environmental Portraiture, with Lifecycle Approved and Validation Untested. Approval covers the composition-first instructions/archive; it does not approve test outputs, individual references or runtime installation. Legacy tests do not validate this revision. Preserve the stable slug. Keep it under Photography & Realism with personal-photo/environmental-portraiture area. No new cover is published; the original reference remains private. Case 06 stays Draft pending deeper analysis. This supersedes DEC-013's earlier status for 018 only.


## DEC-016 — Style 06 approved narrative-poster rules; tests deferred

**Status:** ACTIVE
**Date:** 2026-10-01 America/Los_Angeles / 2026-10-02 UTC

The owner accepted the deeper Style 06 analysis and authorized saving the Skill now, with image testing later. YSU-SKILL-019 v0.2.0 is 懷舊手繪動畫敘事海報 / Nostalgic Hand-Painted Anime Narrative Poster. Lifecycle Approved covers instructions/archive; Validation Untested applies to this revised version. Keep stable slug ysu-nostalgic-gouache-narrative and former name as an alias. The revised workflow separates rendering-only transfer from authorized narrative reconstruction and uses opaque painted color / animation-style drawing rather than asserting Taiwanese 膠彩 as its medium. All eight SSF-B02 profiles now have approved rules; 05/06 have deferred image tests and unconfirmed per-image classification. No runtime installation, Hub publication or new public cover. This supersedes earlier draft-state notes for 019; other profiles are unchanged.


## DEC-017 — Complete Style 05/06 public reference covers

**Status:** ACTIVE
**Date:** 2026-10-01 America/Los_Angeles / 2026-10-02 UTC

The owner reported that Style 05 and 06 thumbnails were missing from Tracker and requested completing the existing original-reference covers. Publish only the chosen P05-015 and P06-020 images as metadata-stripped 720px WebP derivatives under DEC-012. This extends the prior six-cover authorization to all eight SSF-B02 styles and supersedes the no-new-public-cover limitations in DEC-015/016. The private originals/full reference collections remain private. This does not approve per-image classifications, revised image-test results, runtime installation or Hub publishing. Both revised profiles remain Approved / Untested.

Drive organization was also completed under the owner's preceding instruction: all eight canonical folders retain their IDs under three style families in 01_STYLES; original source folders are nested within each canonical folder; batch history is in 90_ARCHIVE; 00_PENDING was independently verified empty. The source registry has the current storage map. Historical preparation-only and pending-correction notes above are not current state.


## DEC-018 — Cinematic Inkframe cover uses original reference R06

**Status:** ACTIVE
**Date:** 2026-10-01 America/Los_Angeles / 2026-10-02 UTC

The owner confirmed R06 as the public Tracker cover for YSU-SKILL-012 (電影墨格 / Cinematic Inkframe), replacing the grayscale science-fiction wash collage that did not represent its canonical mixed-media comic criteria. Source: existing package reference R06.png, Drive file `1UhU4AvA3N8ZqCIAamwtUfqOyAKKTbcJf`. Publish its complete composition as a metadata-stripped 720px WebP derivative at `assets/skill-thumbs/ysu-cinematic-inkframe-r06.webp`. A new asset path avoids reusing the old cached cover URL.

Approval covers this selected public thumbnail only; it does not publish the remaining reference collection or change Skill rules, version, validation status, installation or Hub state. The Skill's canonical text and 11 reference images were consistent; this is a cover-selection correction. The previous asset remains available in Git history/current assets for recovery.
