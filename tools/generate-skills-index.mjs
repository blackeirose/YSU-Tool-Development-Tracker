#!/usr/bin/env node
// Generates skills.json from the canonical YSU Skills registry Markdown.
//
// Canonical source of truth:
//   Google Drive / My Drive / AI Works / 06_Skills / 00_SKILL_REGISTRY.md
//   file id 1g6Io9lD4YwkDaX5_OUqssvrcEyuCF-1P
//
// skills.json is GENERATED and DISPOSABLE. Never hand-edit it, and never treat
// it (or the exported Markdown under skills-source/) as a second source of
// truth. To refresh: export the registry from Drive over
// skills-source/00_SKILL_REGISTRY.md, then run `npm run skills:index`.
//
// Parsing assumptions are documented in skills-source/README.md. The parser is
// deliberately tolerant: anything it cannot read confidently is emitted as null
// and rendered as "Unknown" in the UI. It never invents a value.

import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';

const SOURCE = argv[2] || 'skills-source/00_SKILL_REGISTRY.md';
const OUT = argv[3] || 'skills.json';

// --- helpers ---------------------------------------------------------------

// Some Drive/connector exports escape Markdown punctuation. Strip that so the
// parser behaves identically on a raw export and an escaped one.
const unescapeMd = text => text.replace(/\\([#\-_*`[\]()])/g, '$1');

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const firstMatch = (text, re) => { const m = text.match(re); return m ? clean(m[1]) : null; };
const allMatches = (text, re) => [...text.matchAll(re)].map(m => m[1]);

function highestSemver(text) {
  const found = allMatches(text, /v?(\d+\.\d+\.\d+)/g);
  if (!found.length) return null;
  const rank = v => v.split('.').map(Number).reduce((a, n) => a * 1000 + n, 0);
  return found.sort((a, b) => rank(b) - rank(a))[0];
}

// Graphic-reference counts are only read from a skill's OWN row and OWN
// headed section, so shared verification paragraphs ("29 個個別圖檔") are not
// misattributed to an individual skill.
function graphicCount(text) {
  // The negative lookbehind keeps an identifier such as "YSU-SKILL-011 圖像"
  // from being read as a count, and 圖像/圖片/圖表/圖檔 are excluded so only
  // "N 圖" / "N 張圖" / "N Graphic" phrasings count.
  const counts = [
    ...allMatches(text, /(?<![\d-])(\d{1,3})\s*(?:張|份|個)?\s*(?:REFERENCE_ONLY\s*)?Graphic/gi),
    ...allMatches(text, /(?<![\d-])(\d{1,3})\s*張[^|\n]{0,24}?圖(?![像片表檔])/g),
    ...allMatches(text, /(?<![\d-])(\d{1,3})\s*圖(?![像片表檔])/g)
  ].map(Number).filter(Number.isFinite);
  return counts.length ? Math.max(...counts) : 0;
}

const POSITIVE = /通過|一致|已回下載驗證|回下載核對|驗證通過|全通過/;
const OUTSTANDING = /未核實|未驗證|待驗證|待完成|待測試|未取得|未重驗|unvalidated/i;

function validationOf(evidence) {
  const good = POSITIVE.test(evidence);
  const open = OUTSTANDING.test(evidence);
  if (good && open) return 'Partial';
  if (good) return 'Validated';
  return 'Untested';
}

function lifecycleOf({ id, version, evidence }) {
  if (id.startsWith('YSU-PENDING')) return 'Candidate';
  if (/已退役|retired/i.test(evidence)) return 'Retired';
  if (!version) return 'Draft';
  return Number(version.split('.')[0]) >= 1 ? 'Approved' : 'Candidate';
}

function localInstallOf(cell) {
  if (/未安裝/.test(cell)) return 'NOT_INSTALLED';
  if (/已安裝|installed/i.test(cell)) return 'INSTALLED_RECORDED';
  if (/未核實/.test(cell)) return 'UNVERIFIED';
  return 'UNKNOWN';
}

function chatgptOf(cell) {
  if (/未安裝/.test(cell)) return 'NOT_INSTALLED';
  if (/已安裝/.test(cell)) return 'INSTALLED';
  if (/未發布/.test(cell)) return 'NOT_PUBLISHED';
  if (/未核實/.test(cell)) return 'UNVERIFIED';
  return 'UNKNOWN';
}

function driveOf(cell) {
  return /已歸檔|已上傳|已回下載|ZIP|已存/.test(cell) ? 'ARCHIVED' : 'UNKNOWN';
}

// --- read + slice ----------------------------------------------------------

const raw = unescapeMd(readFileSync(SOURCE, 'utf8'));
const lines = raw.split(/\r?\n/);

// Split on level-2 headings; each section keeps its heading and body.
const sections = [];
let current = { heading: '(preamble)', body: [] };
for (const line of lines) {
  if (/^##\s+(?!#)/.test(line)) { sections.push(current); current = { heading: line.replace(/^##\s+/, '').trim(), body: [] }; }
  else current.body.push(line);
}
sections.push(current);
const sectionText = s => `${s.heading}\n${s.body.join('\n')}`;

// Registry-level metadata.
const registry = {
  title: clean(lines[0].replace(/^#\s*/, '')),
  recorded: firstMatch(raw, /紀錄日期：([0-9-]+)/),
  updated: firstMatch(raw, /最新更新：([0-9-]+)/),
  owner: firstMatch(raw, /Owner：([^\n。]+)/),
  management_conversation: firstMatch(raw, /管理對話：([^\n（(]+)/),
  drive_folder: firstMatch(raw, /資料夾：(https:\/\/drive\.google\.com\/drive\/folders\/\S+)/),
  pending_folder_note: 'AI Works / 06_Skills / 00_PENDING is the cloud staging area for unprocessed material.'
};

// Main registry table: | ID | name／purpose | version | drive | local | chatgpt |
const rows = new Map();
for (const line of lines) {
  const m = line.match(/^\|\s*(YSU-SKILL-\d{3})\s*\|(.*)$/);
  // The later packaging table starts its rows with the same ID; the registry
  // table is the first table in the document, so first row wins and any
  // backticked-slug row is skipped outright.
  if (!m || rows.has(m[1]) || /^\|\s*`/.test(m[2])) continue;
  const cells = m[2].split('|').map(clean);
  if (cells.length < 5) continue;
  rows.set(m[1], { raw: clean(line), name: cells[0], version: cells[1], drive: cells[2], local: cells[3], chatgpt: cells[4] });
}

// Packaging table: | ID | `slug` | folder id | SKILL file id | ZIP file id |
const packaging = new Map();
for (const line of lines) {
  const m = line.match(/^\|\s*(YSU-SKILL-\d{3})\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`/);
  if (!m) continue;
  const driveId = id => (/^1[\w-]{20,}$/.test(id) ? id : null);
  packaging.set(m[1], { slug: m[2], folderId: driveId(m[3]), skillFileId: driveId(m[4]), zipFileId: driveId(m[5]) });
}

// Film-system membership table (2026-09-23) — used for category grouping.
const filmSystem = new Set();
for (const line of lines) {
  const m = line.match(/^\|[^|]*\|\s*`skills\/([a-z0-9-]+)\/`\s*\|/);
  if (m) filmSystem.add(m[1]);
}
filmSystem.add('ysu-narrative-film-system');

function categoryOf({ slug, name, description, filmMember, type }) {
  const text = `${slug ?? ''} ${name} ${description ?? ''}`;
  if (/Revit/i.test(text)) return 'ARCHITECTURE / REVIT';
  if (/Simulator|模擬器/i.test(text)) return 'ENGINEERING / SIMULATION';
  // The registry types an add-on explicitly; that beats folder membership.
  if (/style-addon/i.test(type ?? '')) return 'STYLE';
  if (filmMember || /film|電影|敘事|storyboard|cinematic/i.test(text)) return 'FILM';
  if (/角色|character/i.test(text)) return 'GAME / CHARACTER';
  if (/風格|style|墨格|inkframe/i.test(text)) return 'STYLE';
  if (/教學|科學|視覺化/.test(text)) return 'EDUCATION / SCIENCE';
  return 'UNCATEGORIZED';
}

// --- build entries ---------------------------------------------------------

function buildRegistered(id) {
  const row = rows.get(id);
  const pack = packaging.get(id) ?? {};
  // ownText: the skill's own row plus sections whose HEADING names it.
  const owned = sections.filter(s => s.heading.includes(id)).map(sectionText);
  const ownText = [row.raw, ...owned].join('\n');
  // evidence: everything that mentions the skill anywhere, for validation only.
  const evidence = [row.raw, ...sections.filter(s => sectionText(s).includes(id)).map(sectionText)].join('\n');

  const [namePart, ...purposeParts] = row.name.split('；');
  const purpose = clean(purposeParts.join('；')) || null;
  const slug = firstMatch(ownText, /(?:Skill ID|Slug)[：:]\s*`?([a-z0-9][a-z0-9-]+)`?/) ?? pack.slug ?? null;
  const version = highestSemver(row.version);
  const folderId = firstMatch(ownText, /drive\.google\.com\/drive\/folders\/([\w-]+)/) ?? pack.folderId ?? null;
  const goal = firstMatch(ownText, /(?:目標|核心目標|用途)[：:]\s*([^\n]+)/);
  const filmMember = (slug && filmSystem.has(slug)) || /ysu-narrative-film-system\/skills\//.test(ownText);
  const type = firstMatch(ownText, /類型[：:]\s*`([^`]+)`/);

  const links = [];
  if (folderId) links.push({ label: 'Canonical Drive folder', url: `https://drive.google.com/drive/folders/${folderId}` });
  if (pack.skillFileId) links.push({ label: 'SKILL.md', url: `https://drive.google.com/file/d/${pack.skillFileId}/view` });
  if (pack.zipFileId) links.push({ label: 'Package ZIP', url: `https://drive.google.com/file/d/${pack.zipFileId}/view` });
  const chatgptSkillUrl = firstMatch(ownText, /(https:\/\/chatgpt\.com\/skills\?skill_id=\w+)/);
  if (chatgptSkillUrl) links.push({ label: 'ChatGPT Skill', url: chatgptSkillUrl });

  const originProject = firstMatch(ownText, /「([^」]+)」\s*Project/);
  const conversationUrl = firstMatch(ownText, /(https:\/\/chatgpt\.com\/(?:c|g)\/\S+)/);

  return {
    id,
    name: clean(namePart),
    slug,
    category: categoryOf({ slug, name: row.name, description: purpose ?? goal, filmMember, type }),
    lifecycle: lifecycleOf({ id, version, evidence }),
    validation: validationOf(evidence),
    version,
    version_note: row.version,
    description: purpose ?? goal ?? null,
    graphic_reference_count: graphicCount(ownText),
    platform: { drive: driveOf(row.drive), chatgpt: chatgptOf(row.chatgpt), codex: localInstallOf(row.local) },
    platform_notes: { drive: row.drive, chatgpt: row.chatgpt, codex: row.local },
    origin_project: originProject,
    origin_conversation: null,
    origin_conversation_url: conversationUrl,
    locator_status: conversationUrl ? 'DIRECT_LINK' : originProject ? 'PROJECT_TITLE_ONLY' : 'UNLOCATED',
    related_conversations: [],
    next_action: firstMatch(ownText, /下一步[：:]\s*([^\n]+)/),
    canonical_drive: folderId ? `https://drive.google.com/drive/folders/${folderId}` : null,
    links,
    registered: true
  };
}

function buildPending() {
  const out = [];
  const text = raw;
  const re = /^###\s+(YSU-PENDING-\d{3})\s+—\s+(.+)$/gm;
  for (const m of text.matchAll(re)) {
    const id = m[1];
    const start = m.index;
    const nextIdx = text.indexOf('\n## ', start);
    const body = text.slice(start, nextIdx === -1 ? undefined : nextIdx);
    const goal = firstMatch(body, /核心目標[：:]\s*([^\n]+)/);
    const originProject = firstMatch(body, /「([^」]+)」\s*Project/);
    out.push({
      id,
      name: clean(m[2]),
      slug: null,
      category: categoryOf({ slug: null, name: m[2], description: goal, filmMember: false }),
      lifecycle: 'Candidate',
      validation: 'Untested',
      version: null,
      version_note: firstMatch(body, /(暫無正式版本[^\n。]*)/) ?? '未建立正式版本',
      description: goal,
      graphic_reference_count: 0,
      platform: { drive: 'UNKNOWN', chatgpt: 'NOT_INSTALLED', codex: 'NOT_INSTALLED' },
      platform_notes: { drive: '未建立套件', chatgpt: '未安裝', codex: '未安裝' },
      origin_project: originProject,
      origin_conversation: null,
      origin_conversation_url: firstMatch(body, /(https:\/\/chatgpt\.com\/(?:c|g)\/\S+)/),
      locator_status: originProject ? 'PROJECT_TITLE_ONLY' : 'UNLOCATED',
      related_conversations: [],
      next_action: firstMatch(body, /下一步[：:]\s*([^\n]+)/),
      canonical_drive: null,
      links: allMatches(body, /(https?:\/\/[^\s)]+)/g)
        .filter(u => !u.includes('drive.google.com'))
        .map(url => ({ label: 'Reference', url })),
      registered: false
    });
  }
  return out;
}

const skills = [...[...rows.keys()].sort().map(buildRegistered), ...buildPending()];

const index = {
  $comment: 'GENERATED FILE — do not edit by hand. Source: Google Drive AI Works/06_Skills/00_SKILL_REGISTRY.md. Regenerate with `npm run skills:index`.',
  generated_at: new Date().toISOString(),
  source: { file: SOURCE, drive_file_id: '1g6Io9lD4YwkDaX5_OUqssvrcEyuCF-1P', registry_updated: registry.updated },
  registry,
  counts: {
    total: skills.length,
    registered: skills.filter(s => s.registered).length,
    pending: skills.filter(s => !s.registered).length
  },
  skills
};

writeFileSync(OUT, `${JSON.stringify(index, null, 2)}\n`);
console.log(`${OUT}: ${index.counts.registered} registered + ${index.counts.pending} pending from ${SOURCE}`);
