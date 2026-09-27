# 00_PENDING — Processing Contract (repository copy)

Canonical document: **00_PENDING — Processing Contract**, Google Doc
`1JpvOtAKAjBgw4Tj4fZHtpPltkiLop6k8zYXmH4Re--g`, in
`AI Works / 06_Skills / 00_PENDING`.

This copy exists so the repository is self-describing. The Drive document is
authoritative; if the two disagree, the Drive document wins.

> **Nothing in `00_PENDING` has been processed.** No file inside it has been
> read, analysed, classified, moved, merged, promoted, rejected, installed or
> published, and no canonical Skill has been modified from Pending material.
> Batch processing begins only on an explicit instruction from the owner.

## What 00_PENDING is

The single cloud staging area for unprocessed Skill-related material under
`AI Works / 06_Skills` (folder id `1vsF8Wd7gvGoCwKz2zBXOBBDHqvOVOStW`). ZIP
packages, prompts, reference images, old Skill folders, Gem/GPT instructions,
source fragments, notes and example files may all be dropped here before review.

It is **not** the canonical Skill archive, an Approved folder, an install queue,
a publishing queue, or a database, and it does not mirror the local Codex Skills
folder. Lifecycle state lives in registry and Tracker metadata, never in a chain
of physical folders — so no Incoming / Processing / Draft / Approved / Archive
hierarchy is created.

## Local boundary

`C:\Users\ysu\OneDrive - DLR Group\Codex\Skills` remains a local staging /
development source. It is not moved, renamed, deleted, reorganised or
automatically synchronised as part of Pending processing. The owner moves
material to `00_PENDING` selectively, by hand.

```
Local Codex Skills  →  (owner selectively moves)  →  06_Skills / 00_PENDING
                    →  (future authorised batch)  →  canonical Skill folder
                    →  00_SKILL_REGISTRY.md  →  skills.json  →  Tracker
```

## Allowed outcomes per item

Once the owner authorises a batch, each item results in exactly one outcome:

| Outcome | Meaning |
|---|---|
| `NEW_SKILL` | create a new canonical Skill package and registry entry |
| `MERGE_EXISTING` | integrate useful material into an existing Skill, with no duplicate Skill |
| `KEEP_PENDING` | insufficient evidence, or an owner decision is needed — leave it pending |
| `NO_ACTION` | not useful to the Skill system; preserve or delete only under explicit owner direction |

## Processing rules

- Preserve the original material until the result is verified.
- Never auto-install, auto-publish or auto-share a Skill.
- Never create a second registry.
- Never invent a source conversation URL, version, validation status or owner.
- A package existing is not a reason to call a Skill `Approved` or `Validated`.
- Lifecycle, Validation, platform availability and Locator Status stay separate.
- Accepted metadata goes into the canonical `00_SKILL_REGISTRY.md`, in the
  Tracker Metadata format documented in [README.md](README.md).
- References stay with the canonical Skill folder when an item is promoted.

## Batch intake record

When processing does begin, record per candidate, where available:

| Field | |
|---|---|
| source item name | the file or folder as it sits in `00_PENDING` |
| source location | its path within the Pending folder |
| relationship | candidate / new / existing |
| target or proposed Skill ID | `YSU-SKILL-0NN`, or a proposed id |
| origin project | source Project name, when known |
| origin conversation | source conversation title, when known |
| locator status | `DIRECT_LINK` / `PROJECT_TITLE_ONLY` / `UNLOCATED` |
| reference count | number of graphic / reference files |
| proposed lifecycle | `Candidate` / `Draft` / `Approved` / `Retired` |
| proposed validation | `Untested` / `Partial` / `Validated` |
| recommended action | one of the four outcomes above |
| evidence / notes | what the recommendation rests on |

This record is a document, not a database. No table, service or automated batch
processor is created for it.
