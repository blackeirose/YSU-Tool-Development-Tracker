# DECISIONS.md

## Decision Index

| ID | Title | Status |
|---|---|---|
| DEC-001 | Use Supabase for cross-device Tracker data | ACTIVE |
| DEC-002 | Keep GitHub as code source of truth | LOCKED |
| DEC-003 | Keep GitHub Pages for current hosting | ACTIVE |
| DEC-004 | Public read, owner-authenticated write | ACTIVE |
| DEC-005 | Preserve localStorage during migration | LOCKED |

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

Supabase becomes the canonical application-data store after migration, while GitHub remains the canonical source for code.

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

**Status:** ACTIVE  
**Date:** 2026-08-15  
**Scope:** Security / Access

### Decision

Tracker cloud data remains publicly readable, consistent with the current public Tracker, while insert/update/delete operations require Supabase authentication for `blackeirose@gmail.com`.

### Reasoning

This preserves convenient viewing while preventing anonymous visitors from modifying Tracker data.

### Consequences

Row Level Security must remain enabled and write policies must stay restricted to the owner unless the user explicitly changes the collaboration model.

---

## DEC-005 — Preserve localStorage during migration

**Status:** LOCKED  
**Date:** 2026-08-15  
**Scope:** Data Migration

### Decision

Do not delete or overwrite the existing browser `localStorage` Tracker data until the first real-data migration to Supabase has completed successfully.

Do not seed the cloud database with stale repository defaults when the user's browser may contain newer data.

### Reasoning

The browser data may contain changes that were never committed to GitHub. Protecting that data takes priority over convenience during migration.

### Consequences

The new frontend keeps local data as a fallback/safety copy and only offers migration when the cloud table is empty and the owner is authenticated.
