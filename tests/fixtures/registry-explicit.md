# YSU Skills Registry — parser fixture


紀錄日期：2026-01-01；最新更新：2026-02-02。Owner：Fixture Owner。  
管理入口：Google Drive / My Drive / AI Works / 06_Skills。  
資料夾：https://drive.google.com/drive/folders/1FixtureFolderIdAaaaaaaaaaaaaaaa


Synthetic registry used only by tests/skills-index.test.cjs. It is not a Skill
registry, not an export of one, and nothing reads it at runtime. Each Skill here
exercises one branch of the Phase 2 explicit-metadata precedence rules.


## 已登錄 Skills


| ID | 名稱／用途 | 最新已知版本 | Drive 歸檔 | 本機安裝 | ChatGPT Plugins／分享 |  
|---|---|---|---|---|---|  
| YSU-SKILL-001 | Fixture Interactive Simulator；科學模擬器 | v1.1.0 | 完整套件已上傳；回下載 SHA-256 一致 | 未核實 | 未核實 |  
| YSU-SKILL-002 | Fixture Film Helper；電影敘事輔助 | 文件／參考 v1.2.3 | 3 Graphic＋ZIP 已歸檔；雜湊讀回通過 | 未安裝／未驗證 | 未發布、未改分享 |  
| YSU-SKILL-003 | Fixture Character Sheet；角色設定 | 文件／參考 v0.3.0 | ZIP 已歸檔 | 未安裝 | 未發布 |  
| YSU-SKILL-004 | Fixture Broken Metadata；壞值測試 | 文件／參考 v0.9.0 | ZIP 已歸檔；雜湊讀回通過 | 未安裝 | 未發布 |


## YSU-SKILL-001 — Fixture Interactive Simulator


Skill ID：fixture-interactive-simulator  
中央資料夾：https://drive.google.com/drive/folders/1FixtureLegacyFolderIdAaaaaaaaaa


No Tracker Metadata block. Everything about this Skill must keep coming from the
deterministic legacy parser.

下一步：保留為 legacy 解析案例。


## YSU-SKILL-002 — Fixture Film Helper


Skill ID：fixture-film-helper  
中央資料夾：https://drive.google.com/drive/folders/1FixtureDerivedFolderIdAaaaaaaa

Every explicit value below deliberately contradicts what the legacy parser would
derive, and no Locator Status is stated, so the real URL alone must produce
DIRECT_LINK.

Tracker Metadata:
- Category: STYLE
- Lifecycle: Candidate
- Validation: Validated
- Version: 0.4.0
- Graphic References: 7
- Drive: ARCHIVED
- ChatGPT: INSTALLED
- Codex: INSTALLED_RECORDED
- Origin Project: 建築敘事影片專案專用
- Origin Conversation: 建築敘事影片構想
- Origin Conversation URL: https://chatgpt.com/c/fixture-conversation-0002
- Next Action: Run the SFDOT live pilot
- Canonical Drive: https://drive.google.com/drive/folders/1FixtureExplicitFolderIdAaaaaa

下一步：這行 legacy 下一步不應覆蓋顯式 Next Action。


## YSU-SKILL-003 — Fixture Character Sheet


Skill ID：fixture-character-sheet

An explicit Locator Status with no URL is a legitimate statement and must be
respected exactly as written.

Tracker Metadata:
- Lifecycle: Approved
- Validation: Partial
- Origin Project: 角色設定專案
- Locator Status: PROJECT_TITLE_ONLY


## YSU-SKILL-004 — Fixture Broken Metadata


Skill ID：fixture-broken-metadata

Every explicit value here is outside the contract. Each must be rejected with a
warning, and the derived value kept, rather than written into skills.json.

Tracker Metadata:
- Lifecycle: Shipped
- Validation: Excellent
- Version: latest
- Graphic References: many
- Codex: PROBABLY
- Locator Status: DIRECT_LINK
- Origin Conversation URL: ask-me-later
- Canonical Drive: somewhere in Drive


## 待定 Skill 候選 — fixture

### YSU-PENDING-001 — Fixture pending candidate

- 狀態：待定／構想已登記。
- 核心目標：確認 pending 項目同樣吃顯式 metadata。

Tracker Metadata:
- Category: EDUCATION / SCIENCE
- Lifecycle: Draft
- Validation: Partial
- Graphic References: 2
- Origin Project: 分析
- Locator Status: PROJECT_TITLE_ONLY
- Next Action: 等待使用者授權開始 Pending 批次處理
