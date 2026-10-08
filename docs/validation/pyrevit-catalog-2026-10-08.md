# pyRevit cards in Skills Mode

Date: 2026-10-08 America/Los_Angeles.
Core: `57a69136b7473718dfcf26311ae801f033696f05` (AGENTS, AI_CORE,
Services, Communication, Development Workflow, Gate Standard, Small Project UI v1).
Tracker base: `afb7cc80dee37c8f42cf1371b60df5391a97c38c`.
Gate Lite: bounded read-only UI/catalog addition in the existing architecture.

## Scope

Four tools under BIM / pyRevit, visual covers, bilingual purpose, tool-specific
details, filters, direct category shortcut and `#skills-pyrevit` entry.
Original package icons copied byte-for-byte from public source commit
`fda39086c0cba127a325ca8fa5136100dc9bb11c`. No generated screenshots.
Three v1.0.1 packages retain published/package-verified status; native runtime
and version matrix not reverified. Color Legend candidate release is authorized,
packaging pending, native validation unverified. Owner no longer blocks publication
on their own test; this task does not publish its ZIP.

## Preservation

Drive registry/index, existing thumbnails and taxonomy, Tasks records, Auth/RLS,
HUB/MAIN, pyRevit source/releases, installed extensions and models are unchanged.
Native tool metadata is a separate GitHub file, not fabricated AI Skill records.
All public download actions route through HUB. Source/README links use a fixed
public source commit; no privileged URLs, local paths or secrets are added.

## Verification

- 43 Node/jsdom tests PASS in the integrated run; the added direct-entry test
  also passes in the subsequent 18-test Skills suite (44 distinct cases total).
- `node --check skills.js` and `git diff --check` PASS.
- New tests cover exact four cards/covers, preserved Skill counts, category shortcut,
  filters, candidate wording, HUB/source links, safe text/cover handling, degraded
  catalog loads and keyboard detail opening/closing.
- Source/package metadata read from actual repository README/manifests. No new
  binary download or Revit execution claimed by this task.
- Local visual browser unavailable: the cloud browser cannot reach executor
  localhost; the executor browser download returned an invalid archive. jsdom
  checks are DOM tests, not rendered-browser evidence.
- Production browser readback is performed after the single Pages release and
  recorded in the PR completion evidence; do not infer mobile rendering from jsdom.

## Recovery

Revert this bounded catalog/UI commit via GitHub and the normal Pages release.
There is no database migration or content rewrite to undo. Keep Tasks and all
previous Skill assets/data; reverting this feature must not roll back newer work.
