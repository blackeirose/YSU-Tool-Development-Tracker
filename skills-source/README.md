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

The export in this repo was refreshed on 2026-10-01 from the updated canonical
Drive registry (47,605 bytes). SSF-B02 adds six approved profiles and two revision drafts.

## Explicit Tracker Metadata (contract v1)

Source of the contract: **YSU Skills — Tracker Metadata Schema v1**, Google Doc
`1xtTW76ksdd3pgWgB6sDGy7302tRhRzHjamYYxsv5CVo` in `AI Works / 06_Skills`.

A Skill section may carry a plain-Markdown block. The registry stays a readable
management document — this is **not** a conversion to JSON or YAML, and the
long-form verification prose around it stays exactly as it is.

```
Tracker Metadata:
- Category: FILM
- Lifecycle: Approved
- Validation: Partial
- Version: 0.2.0
- Graphic References: 6
- Drive: ARCHIVED
- ChatGPT: NOT_INSTALLED
- Codex: NOT_INSTALLED
- Origin Project: 建築敘事影片專案專用
- Origin Conversation: 建築敘事影片構想
- Origin Conversation URL:
- Locator Status: PROJECT_TITLE_ONLY
- Next Action: Run SFDOT live pilot
- Canonical Drive: https://drive.google.com/drive/folders/...
```

### Precedence

1. **Explicit** value in the Skill's own `Tracker Metadata:` block
2. **Deterministic legacy parser** (the tables below)
3. **null / Unknown**

An explicit value is never overwritten by a heuristic. A key left blank means
"not stated" and falls through to the parser — it does not clear a known value.
Every field records which layer won in `metadata_source`, and
`has_explicit_metadata` says whether a Skill has been normalized yet.

### Allowed values

| Field | Values |
|---|---|
| `Lifecycle` | `Candidate` · `Draft` · `Approved` · `Retired` |
| `Validation` | `Untested` · `Partial` · `Validated` |
| `Locator Status` | `DIRECT_LINK` · `PROJECT_TITLE_ONLY` · `UNLOCATED` |
| `Drive` / `ChatGPT` / `Codex` | `ARCHIVED` · `INSTALLED` · `INSTALLED_RECORDED` · `NOT_INSTALLED` · `NOT_PUBLISHED` · `UNVERIFIED` · `UNKNOWN` |
| `Version` | a version number such as `0.2.0` |
| `Graphic References` | a non-negative integer |
| `Origin Conversation URL` / `Canonical Drive` | an `http(s)` URL, or blank |

Lifecycle, Validation and platform availability stay **independent**.
`Approved + Partial`, `Candidate + Partial` and `Approved + Validated` are all
valid.

### When an explicit value is wrong

A value outside the contract is **rejected with a warning and the derived value
is kept**, so `skills.json` can never carry an out-of-contract token. Warnings
are printed by the generator and collected in the index's `warnings` array.

`DIRECT_LINK` additionally requires a real `Origin Conversation URL`. A block
that claims `DIRECT_LINK` without one is downgraded and warned about. **No
conversation URL is ever constructed.**

### Normalization status

**Fifteen entries carry explicit metadata**: the 14 SSF-B02/B03/WC records plus YSU-SKILL-012, approved by the owner on 2026-10-02 based on the SFDOT character board. The other original records and existing pending candidate retain derived fields. `counts.with_explicit_metadata` is `15`. Normalize only in the canonical Drive registry, then export and regenerate. Synthetic parser coverage remains in `tests/fixtures/registry-explicit.md`.

## What the generator reads

When no explicit block is present, `tools/generate-skills-index.mjs` falls back
to the deterministic parser below. It is deliberately tolerant. Anything it
cannot read confidently becomes `null` and the UI shows **Unknown**. It never
guesses a version, a URL or an install state.

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
- Reference images are private Drive files and are never read by the generator.
  Visual view shows an owner-supplied cover thumbnail where
  `skill-thumbnails.json` lists one (DEC-012); otherwise it draws a generated
  cover tile with the reference count.
- Both tables that begin rows with a Skill ID are handled: the registry table is
  the document's first table and wins; the later packaging table is read only
  for ids.


### Purpose/style taxonomy v1 (2026-10-01)

Assignments come from the `## Skill Taxonomy v1` Markdown table in Drive.
Columns: `Skill ID | Domain ID | Area | Style Family ID | Medium | Tags`.
Use `—` for an absent field and `;` between tags. Controlled domain/family IDs
and bilingual labels are in `tools/skill-taxonomy.mjs`; unknown IDs warn and are
ignored, missing taxonomy falls back to the legacy category. This is a separate
additive contract, not a change to the existing Tracker Metadata v1 statuses.
The latest owner authorization permits publishing the batch index and six
original-reference cover derivatives to this public Tracker. Full packages and
reference sets retain their existing private Drive permissions.
