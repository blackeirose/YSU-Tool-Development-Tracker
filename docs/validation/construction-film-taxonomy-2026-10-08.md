# Construction Film taxonomy and three-Skill HUB handoff

Date: 2026-10-08 America/Los_Angeles. Core: `57a69136b7473718dfcf26311ae801f033696f05`.

Owner requests moving Construction Film to Film & Animation in Tracker, then handing three Skills to Codex for HUB publication. The Tracker change is Gate Lite content-only work; HUB publication has not been executed in this task.

## Tracker change

- Canonical Drive registry `1g6Io9lD4YwkDaX5_OUqssvrcEyuCF-1P`: change only YSU-SKILL-003 taxonomy domain from `architecture-space` to `film-animation`, plus registry updated date. Preserve purpose area, tags, version, evidence and cover.
- Read back canonical content and confirm exact expected change. Export retains the same seven existing protected/private link omissions, then run the existing index generator.
- 19 affected index/taxonomy tests PASS. Semantic before/after comparison: only 003's taxonomy changes; other 39 entries unchanged, total 39 registered + 1 pending. Tool catalog, thumbnails, app, Tasks, auth and database unchanged.
- Existing main base: `2ddac134a95f141542fac93665ac5b502ce29168`. One Pages content release. Post-release evidence goes in the PR to avoid a documentation-only redeploy.
- Recovery: change only 003's domain back in the fresh canonical registry, preserving concurrent edits; regenerate using the same omissions. Do not restore a stale entire registry.

## Codex scope: publish these three Skills to HUB

| Stable ID | Skill | Known version | Category |
|---|---|---|---|
| YSU-SKILL-001 | YSU Scientific Interactive Simulator Skill | 1.1.1 | Engineering & Science |
| YSU-SKILL-002 | Revit Vehicle Family Builder | installed 1.0.1 / source 1.0.0 recorded; reconcile actual source | Architecture & Space / BIM & components |
| YSU-SKILL-003 | YSU Site & Construction Film | 1.0.0 | Film & Animation |

Source of truth is the fresh Drive registry, not this historical handoff. All three retain current Approved / Partial status; packaging is not new runtime validation.

### Confirmed source leads

- 001: canonical folder `1HpDA1z6_2YIEzcSezC5PvA-GdUgNgFUc`; registry documents complete 12-file v1.1.1 ZIP and SHA-256. Read and verify actual files before publishing.
- 002: canonical folder `11Qpu4WY94zEMBqSFg6ycD9kZ8oLrRF6Q`; fresh folder listing currently contains only SOURCE_VERIFICATION_2026-09-21.md. Complete package is not present there. Existing source leads: `C:/Users/ysu/OneDrive - DLR Group/Codex/Skills/revit-vehicle-family-builder` and `C:/Users/ysu/.agents/skills/revit-vehicle-family-builder`. Inspect source and installed trees without overwriting either; do not substitute the different `revit-family-builder` package. Search current canonical sources if paths moved; missing files block only this Skill's download publication.
- 003: canonical folder `1mgO1gN0uleu5pGJUDEgVo5caR7dtGprh`; the registry's 2026-09-24 source-recovery section supersedes older missing-source text. It records the complete original 19-file v1.0.0 ZIP, commit `1d05934e10de9698999040319c1e171247ba517d`, and six-image supplement separately. Verify actual package; do not rerun paid film generation or include private film/project media blindly.

### Publication requirements

Read current Core and HUB project rules, current Production state and existing bubble mappings first. Use normal authorized CMS content paths; idempotently reuse actual matching Bubble IDs and appropriate existing parents, never duplicate cards by name alone. No frontend/schema/Auth/RLS/MIND changes are needed by default.

Reuse approved Tracker covers from `skill-thumbnails.json`; preserve aspect ratio and existing media. Detail text is concise bilingual Chinese-first: purpose, input, output, start instructions and one necessary validation limitation. Full methods remain in the download package. Use exact current versions and truthful evidence. Do not advertise a prebuilt Revit family library or an already-deployed simulator as the Skill deliverable.

Create distribution-safe packages from real source with README, manifest, actual version and SHA-256. Preserve original canonical archives, private material and existing sharing rules. Inspect secrets, local paths, client/third-party media and dependencies before any public release. Use the established HUB download mechanism and protected Launch boundary; don't expose protected URLs in public Tracker records. No automatic Skill installation, Revit execution, paid generation or new services.

Verify complete downloaded ZIPs, CRC, extraction and hashes; normal Owner Launch and Guest boundary; ordinary Member only when an authorized session exists. Verify desktop and narrow Detail, image loading and persistence/readback. Distinguish HTTP download checks from browser-completed downloads. Save precise before/after IDs and field-level recovery. Preserve all unrelated Bubbles, pyRevit native cards and source data.

After each actual successful publication, update the canonical registry and regenerate Tracker status, without upgrading Partial to Validated or claiming installation. If only one package is blocked, complete the other ready items. Return actual URLs, versions, Bubble IDs, package checksums, evidence limits and a durable HUB handoff. MAIN is out of scope.
