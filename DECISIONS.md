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
