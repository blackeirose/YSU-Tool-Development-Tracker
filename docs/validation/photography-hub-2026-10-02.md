# Photography Hub status release — 2026-10-02 America/Los_Angeles

Source: independently read-back canonical Drive Registry, file ID 1g6Io9lD4YwkDaX5_OUqssvrcEyuCF-1P. Registry bytes: 94,987; SHA-256 69f64b5c50164f1fdcc08c390d2a7fd011475b4e771591bd35203ccc1477eb5f.

| Skill | Hub state | Bubble ID | Package | Image validation |
|---|---|---|---|---|
| 018 | Published to Hub | b_19c636ee-5f0d-4af7-aed0-f0a4d950f5fc | 0.2.0 / public-r1 | Untested |
| 029 | Published to Hub | b_9e42f112-1ae1-470f-b490-52743a829f28 | 1.0.0 / public-r2 | Untested |

Hub: https://hub.ycsu.cc/ → search 攝影 → Explore. Parent b_5c9ab19c-b7fd-4208-a053-8135ca2a9c27. Main and 018 remain row_version=2. 029 was published via normal CMS at 2026-10-03T06:13:48.926974Z, row_version=1. Original 22 Hub records, prior media and order remain identical.

Actual functional download verification: anonymous HTTP obtained full ZIPs; sizes, complete hashes, CRC, extraction and seven required documents passed. Actual Owner/Admin Hub Launch opened the correct Drive sharing pages and downloaded complete matching ZIPs locally; browser download-event API timed out but downloaded files were independently read and validated. This does not establish ordinary Member UI or isolated anonymous Google browser experience. Ordinary Member UI: NOT VERIFIED (no suitable session; no new account or role change).

Guest Hub: Sign in to Launch opened the account panel; refresh retained Guest and no release URL appeared. Anonymous protected-launch table reads requesting only tool_id returned 401/permission denied, with no private value requested or returned. 029 Detail actual desktop 891×615 and IAB 390×844 / 320×740 had no horizontal overflow; bilingual text order, wrapping, Tags, Close and Guest sign-in control were checked. Chrome viewport override did not change actual size, so no 1440px claim is made. Canvas pan is independent of Detail overflow.

Tracker preparation: existing generator produced 30 registered + 1 pending, 18 explicit metadata. Comparing full entries against production base bf5fa9a1bb6cc8aab9e078ae6a1607961f2d0c69 changed only 018/029 (next action/platform notes), leaving the other 29 identical. No release ZIP URL or file ID entered public source/index. Existing thumbnail manifest and all application files are unchanged.

Executed: `node --test tests/owner-otp.test.cjs tests/skill-taxonomy.test.cjs tests/skills-index.test.cjs tests/skills-mode.test.cjs`: 37 PASS, 0 FAIL, 0 skipped, exit 0. Existing Node v24.19.0/jsdom30.0.1 and fixtures were used in an isolated temporary checkout. spawn EPERM was traced to sandbox child-process restrictions; approved normal host test execution required no Windows Admin, installation, IT-policy bypass or production data change.

Owner explicitly authorized one necessary Tracker production status release. Main/root GitHub Pages automatically publishes this commit. Production readback must confirm this generated index after push; private Hub closeout records retain the observed readback and rollback evidence. No Hub deployment was performed. Restore only this release's source/index and scoped management notes; retain concurrent unrelated work. Restoring old 029 hold metadata would also require separately rolling back actual Hub content through Owner CMS.
