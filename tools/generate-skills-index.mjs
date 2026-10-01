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
import { readTaxonomy, domains, families } from './skill-taxonomy.mjs';

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

// --- explicit Tracker Metadata ---------------------------------------------
//
// Phase 2 contract (YSU Skills — Tracker Metadata Schema v1). A Skill section
// may carry a human-readable block:
//
//   Tracker Metadata:
//   - Category: FILM
//   - Lifecycle: Approved
//   - Validation: Partial
//   ...
//
// Precedence is explicit → deterministic legacy parser → null/Unknown. An
// explicit value is never overwritten by a heuristic. An explicit value that
// is outside the contract is rejected with a warning and the derived value is
// kept, so skills.json can never carry an out-of-contract token.

const warnings = [];
const warn = (id, message) => warnings.push(`${id}: ${message}`);

const LIFECYCLES = ['Candidate', 'Draft', 'Approved', 'Retired'];
const VALIDATIONS = ['Untested', 'Partial', 'Validated'];
const LOCATORS = ['DIRECT_LINK', 'PROJECT_TITLE_ONLY', 'UNLOCATED'];
const PLATFORM_STATES = ['ARCHIVED', 'INSTALLED', 'INSTALLED_RECORDED', 'NOT_INSTALLED', 'NOT_PUBLISHED', 'UNVERIFIED', 'UNKNOWN'];

const METADATA_KEYS = {
  category: 'category', lifecycle: 'lifecycle', validation: 'validation', version: 'version',
  'graphic references': 'graphic_reference_count', drive: 'drive', chatgpt: 'chatgpt', codex: 'codex',
  'origin project': 'origin_project', 'origin conversation': 'origin_conversation',
  'origin conversation url': 'origin_conversation_url', 'locator status': 'locator_status',
  'next action': 'next_action', 'canonical drive': 'canonical_drive'
};

// Reads the block if present. An empty value means "not stated" and falls
// through to the legacy parser rather than clearing a known value.
function parseTrackerMetadata(text) {
  const start = text.search(/^[ \t]*Tracker Metadata[：:]/m);
  if (start === -1) return null;
  const out = {};
  for (const line of text.slice(start).split('\n').slice(1)) {
    const item = line.match(/^[ \t]*[-*][ \t]*([A-Za-z][A-Za-z ]*?)[ \t]*[：:][ \t]*(.*)$/);
    if (!item) { if (!line.trim()) continue; break; }
    const key = METADATA_KEYS[clean(item[1]).toLowerCase()];
    const value = clean(item[2]);
    if (key && value) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

function oneOf(id, field, value, allowed) {
  const match = allowed.find(a => a.toLowerCase() === value.toLowerCase());
  if (!match) { warn(id, `${field} "${value}" is not one of ${allowed.join(' / ')}; kept the derived value`); return null; }
  return match;
}

// Applies the explicit block over a derived record and reports, per field,
// which layer won.
function applyExplicit(derived, explicit) {
  const id = derived.id;
  const source = Object.fromEntries(Object.keys(derived).map(k => [k, 'derived']));
  const take = (field, value) => { if (value !== null && value !== undefined) { derived[field] = value; source[field] = 'explicit'; } };

  if (explicit) {
    if (explicit.category) take('category', explicit.category);
    if (explicit.lifecycle) take('lifecycle', oneOf(id, 'Lifecycle', explicit.lifecycle, LIFECYCLES));
    if (explicit.validation) take('validation', oneOf(id, 'Validation', explicit.validation, VALIDATIONS));
    if (explicit.version) {
      const version = explicit.version.match(/^v?(\d+\.\d+(?:\.\d+)?)$/);
      if (version) take('version', version[1]);
      else warn(id, `Version "${explicit.version}" is not a version number; kept the derived value`);
    }
    if (explicit.graphic_reference_count !== undefined) {
      const count = Number(explicit.graphic_reference_count);
      if (Number.isInteger(count) && count >= 0) take('graphic_reference_count', count);
      else warn(id, `Graphic References "${explicit.graphic_reference_count}" is not a non-negative integer; kept the derived value`);
    }
    for (const key of ['drive', 'chatgpt', 'codex']) {
      if (!explicit[key]) continue;
      const state = oneOf(id, key, explicit[key], PLATFORM_STATES);
      if (state) { derived.platform[key] = state; source[`platform.${key}`] = 'explicit'; }
    }
    if (explicit.origin_project) take('origin_project', explicit.origin_project);
    if (explicit.origin_conversation) take('origin_conversation', explicit.origin_conversation);
    if (explicit.origin_conversation_url) {
      if (/^https?:\/\//.test(explicit.origin_conversation_url)) take('origin_conversation_url', explicit.origin_conversation_url);
      else warn(id, `Origin Conversation URL "${explicit.origin_conversation_url}" is not a URL; ignored`);
    }
    if (explicit.next_action) take('next_action', explicit.next_action);
    if (explicit.canonical_drive) {
      if (/^https?:\/\//.test(explicit.canonical_drive)) take('canonical_drive', explicit.canonical_drive);
      else warn(id, `Canonical Drive "${explicit.canonical_drive}" is not a URL; ignored`);
    }
    if (explicit.locator_status) take('locator_status', oneOf(id, 'Locator Status', explicit.locator_status, LOCATORS));
  }

  // A real verified URL is the only thing that can produce DIRECT_LINK — an
  // explicit claim without one is downgraded rather than trusted.
  if (derived.locator_status === 'DIRECT_LINK' && !derived.origin_conversation_url) {
    warn(id, 'Locator Status DIRECT_LINK has no Origin Conversation URL; downgraded');
    derived.locator_status = derived.origin_project || derived.origin_conversation ? 'PROJECT_TITLE_ONLY' : 'UNLOCATED';
    source.locator_status = 'derived';
  }
  if (derived.origin_conversation_url && derived.locator_status !== 'DIRECT_LINK' && source.locator_status !== 'explicit') {
    derived.locator_status = 'DIRECT_LINK';
  }

  if (derived.canonical_drive) {
    const already = derived.links.some(l => l.url === derived.canonical_drive);
    if (!already) derived.links.unshift({ label: 'Canonical Drive folder', url: derived.canonical_drive });
  }

  derived.metadata_source = source;
  derived.has_explicit_metadata = Boolean(explicit);
  return derived;
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

  return applyExplicit({
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
  }, parseTrackerMetadata(ownText));
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
    out.push(applyExplicit({
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
    }, parseTrackerMetadata(body)));
  }
  return out;
}

const skills = [...[...rows.keys()].sort().map(buildRegistered), ...buildPending()];

const taxonomy = readTaxonomy(raw, warn);
for (const skill of skills) skill.taxonomy = taxonomy.get(skill.id) || null;

const index = {
  taxonomy_contract: { version: '1.0', domains, style_families: families, source: 'Skill Taxonomy v1 table in canonical Drive registry' },
  $comment: 'GENERATED FILE — do not edit by hand. Source: Google Drive AI Works/06_Skills/00_SKILL_REGISTRY.md. Regenerate with `npm run skills:index`.',
  generated_at: new Date().toISOString(),
  source: { file: SOURCE, drive_file_id: '1g6Io9lD4YwkDaX5_OUqssvrcEyuCF-1P', registry_updated: registry.updated },
  registry,
  metadata_contract: {
    version: 'v1',
    schema_doc_id: '1xtTW76ksdd3pgWgB6sDGy7302tRhRzHjamYYxsv5CVo',
    precedence: ['explicit Tracker Metadata block', 'deterministic legacy parser', 'null / Unknown']
  },
  counts: {
    total: skills.length,
    registered: skills.filter(s => s.registered).length,
    pending: skills.filter(s => !s.registered).length,
    with_explicit_metadata: skills.filter(s => s.has_explicit_metadata).length
  },
  warnings,
  skills
};

writeFileSync(OUT, `${JSON.stringify(index, null, 2)}\n`);
console.log(`${OUT}: ${index.counts.registered} registered + ${index.counts.pending} pending from ${SOURCE} (${index.counts.with_explicit_metadata} with explicit metadata)`);
for (const message of warnings) console.warn(`  warning — ${message}`);
