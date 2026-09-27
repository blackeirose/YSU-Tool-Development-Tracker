# skills-source — generator input, not a source of truth

`00_SKILL_REGISTRY.md` in this folder is an **export** of the canonical registry:

> Google Drive / My Drive / AI Works / 06_Skills / **00_SKILL_REGISTRY.md**
> file id `1g6Io9lD4YwkDaX5_OUqssvrcEyuCF-1P`

The Drive copy is the only place a Skill is added, edited or retired. This
export exists so `skills.json` can be regenerated reproducibly. **Never edit
either file here.** Editing them creates a second source of truth, which is
exactly what the Skills pipeline is designed to prevent.

Data flow:

```
Google Drive 00_SKILL_REGISTRY.md   (canonical, human-maintained)
        ↓  export
skills-source/00_SKILL_REGISTRY.md  (disposable copy)
        ↓  npm run skills:index
skills.json                         (generated, disposable)
        ↓
Tracker Skills Mode
```

## Refreshing after the registry changes

1. Export `00_SKILL_REGISTRY.md` from Drive over `skills-source/00_SKILL_REGISTRY.md`.
2. `npm run skills:index`
3. `npm test`
4. Commit both files together and push; GitHub Pages redeploys.

The export in this repo was taken on 2026-09-26 (registry `最新更新：2026-09-26`)
and is byte-identical to the Drive file at 29,199 bytes.

## What the generator reads

`tools/generate-skills-index.mjs` is deliberately tolerant. Anything it cannot
read confidently becomes `null` and the UI shows **Unknown**. It never guesses a
version, a URL or an install state.

| Field | Where it comes from |
|---|---|
| `id`, `name`, `description` | the `## 已登錄 Skills` table; the name is split on `；` into name + purpose |
| `version` | highest semver found in the 最新已知版本 cell (`installed v1.0.1 / source v1.0.0` → `1.0.1`); `version_note` keeps the raw cell |
| `slug` | `Skill ID：` / `Slug：` in the Skill's own section, else the packaging table |
| `canonical_drive`, `links` | the first Drive folder URL in the Skill's own section, else the packaging table's folder / SKILL / ZIP ids |
| `graphic_reference_count` | `N Graphic`, `N 張…圖`, `N 圖` — read **only** from the Skill's own row and own headed section, so shared paragraphs such as "29 個個別圖檔" are never misattributed |
| `platform.drive / chatgpt / codex` | the Drive 歸檔 / ChatGPT Plugins／分享 / 本機安裝 columns |
| `next_action` | the first `下一步：` line in the Skill's own section |
| `origin_project` | a `「…」Project` mention in the Skill's own section |

### Derived fields

The registry does not carry explicit Lifecycle or Validation columns, so both
are derived by fixed rules. They are **independent dimensions** and are never
merged.

**Lifecycle**

| Rule | Result |
|---|---|
| id is `YSU-PENDING-*` | `Candidate` |
| text says 已退役 / retired | `Retired` |
| no version found | `Draft` |
| version major ≥ 1 | `Approved` |
| version 0.x | `Candidate` |

**Validation** — over every passage in the registry that mentions the Skill:

| Positive evidence (通過 / 一致 / 已回下載驗證 / 全通過) | Outstanding (未核實 / 未驗證 / 待驗證 / 待完成 / unvalidated) | Result |
|---|---|---|
| yes | yes | `Partial` |
| yes | no | `Validated` |
| no | — | `Untested` |

**Category** — first rule that matches:
`Revit` → ARCHITECTURE / REVIT · `Simulator`/模擬器 → ENGINEERING / SIMULATION ·
registry type `optional-style-addon` → STYLE · listed under the film system's
`skills/` table → FILM · 角色/character → GAME / CHARACTER · 風格/style → STYLE ·
教學/科學/視覺化 → EDUCATION / SCIENCE · otherwise UNCATEGORIZED.

**Locator status** — `DIRECT_LINK` only when a real conversation URL is present
in the registry, `PROJECT_TITLE_ONLY` when a project name is, `UNLOCATED`
otherwise. No conversation URL is ever constructed. Today no Skill has a direct
conversation link, so `UNLOCATED` is the honest majority answer and the
"Has conversation link" filter correctly returns nothing.

## Known limitations

- The registry-wide management conversation (`YSU Skills 管理中心`) is exposed as
  registry metadata, not copied onto each Skill as its origin conversation.
- Reference images are private Drive files, so Visual view draws a generated
  cover tile with the reference count instead of a thumbnail.
- Both tables that begin rows with a Skill ID are handled: the registry table is
  the document's first table and wins; the later packaging table is read only
  for ids.
