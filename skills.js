// Skills Mode — read-only management view over the generated skills index.
//
// The canonical Skill registry lives in Google Drive
// (AI Works / 06_Skills / 00_SKILL_REGISTRY.md). skills.json is generated from
// it by tools/generate-skills-index.mjs. Nothing here writes, and Skills Mode
// never touches Supabase or the Tasks state.
//
// Wrapped in an IIFE: app.js is a classic script sharing the global scope, so
// names like `search` and `render` must not leak.
(() => {
  const MODE_KEY = 'ysu-tracker-mode-v1';
  const VIEW_KEY = 'ysu-skills-view-v1';
  const UNKNOWN = 'Unknown';

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const safeUrl = url => (/^https?:\/\//.test(String(url || '').trim()) ? String(url).trim() : null);
  const read = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) { /* private mode */ } };

  const PLATFORM_LABEL = {
    ARCHIVED: 'Archived', INSTALLED: 'Installed', INSTALLED_RECORDED: 'Installed (recorded)',
    NOT_INSTALLED: 'Not installed', NOT_PUBLISHED: 'Not published', UNVERIFIED: 'Unverified', UNKNOWN: UNKNOWN
  };
  const PLATFORM_TONE = {
    ARCHIVED: 'ok', INSTALLED: 'ok', INSTALLED_RECORDED: 'warn',
    NOT_INSTALLED: 'off', NOT_PUBLISHED: 'off', UNVERIFIED: 'warn', UNKNOWN: 'off'
  };
  const LOCATOR_LABEL = { DIRECT_LINK: 'Direct link', PROJECT_TITLE_ONLY: 'Project title only', UNLOCATED: 'Unlocated' };

  let index = null;
  let skills = [];
  let thumbs = {};
  let view = read(VIEW_KEY) === 'visual' ? 'visual' : 'list';
  let collapsed = new Set();
  let detailId = null;

  // --- mode switch ---------------------------------------------------------

  function applyMode(mode, persist) {
    const skillsOn = mode === 'skills';
    $('tasksMode').classList.toggle('hidden', skillsOn);
    $('skillsMode').classList.toggle('hidden', !skillsOn);
    $('tasksModeBtn').classList.toggle('active', !skillsOn);
    $('skillsModeBtn').classList.toggle('active', skillsOn);
    $('tasksModeBtn').setAttribute('aria-selected', String(!skillsOn));
    $('skillsModeBtn').setAttribute('aria-selected', String(skillsOn));
    if (persist) write(MODE_KEY, skillsOn ? 'skills' : 'tasks');
    if (skillsOn) void load();
  }

  // --- data ----------------------------------------------------------------

  let loading = null;
  function load() {
    if (loading) return loading;
    if (typeof fetch !== 'function') { fail('This browser cannot load the Skills index.'); return Promise.resolve(); }
    // Cover thumbnails are optional: a missing or broken manifest only means
    // every card falls back to the generated tile.
    const thumbsLoad = fetch('skill-thumbnails.json', { cache: 'no-cache' })
      .then(response => (response.ok ? response.json() : {}))
      .catch(() => ({}));
    loading = fetch('skills.json', { cache: 'no-cache' })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(data => thumbsLoad.then(map => {
        thumbs = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
        return data;
      }))
      .then(data => {
        index = data;
        skills = Array.isArray(data.skills) ? data.skills : [];
        buildFilterOptions();
        render();
      })
      .catch(error => { fail('Skills index could not be loaded. Run `npm run skills:index` and redeploy.'); console.error(error); });
    return loading;
  }

  function fail(message) {
    $('skRows').innerHTML = `<tr><td colspan="10" class="small">${esc(message)}</td></tr>`;
    $('skVisualView').innerHTML = `<p class="small">${esc(message)}</p>`;
  }

  const groupOf = s => s.taxonomy?.domain || s.category;
  const familyOf = s => s.taxonomy?.style_family || '';
  const classification = s => [groupOf(s), familyOf(s), s.taxonomy?.medium || s.taxonomy?.area].filter(Boolean).join(' · ');

  function buildFilterOptions() {
    const options = (id, label, values) => { $(id).innerHTML = `<option value="">${label}</option>${[...new Set(values.filter(Boolean))].sort().map(v => `<option>${esc(v)}</option>`).join('')}`; };
    options('skDomain', '全部用途 / All domains', skills.map(groupOf));
    options('skFamily', '全部風格 / All style families', skills.map(familyOf));
    const categories = [...new Set(skills.map(s => s.category))].sort();
    $('skCategory').innerHTML = `<option value="">All categories</option>${categories.map(c => `<option>${esc(c)}</option>`).join('')}`;
    const normalized = index.counts.with_explicit_metadata ?? 0;
    $('skSourceNote').innerHTML = `Source of truth: <a class="launch-link" href="${esc(index.registry.drive_folder)}" target="_blank" rel="noopener noreferrer">00_SKILL_REGISTRY.md in Drive ↗</a> · registry updated ${esc(index.registry.updated ?? UNKNOWN)} · index generated ${esc((index.generated_at || '').slice(0, 10))} · ${index.counts.registered} registered + ${index.counts.pending} pending · ${normalized} of ${index.counts.total} normalized to Tracker Metadata ${esc(index.metadata_contract?.version ?? '')}. skills.json is generated; edit the registry in Drive, never this page.`;
  }

  // --- filtering -----------------------------------------------------------

  function filtered() {
    const q = $('skSearch').value.toLowerCase().trim();
    const category = $('skCategory').value, lifecycle = $('skLifecycle').value;
    const validation = $('skValidation').value, platform = $('skPlatform').value;
    const needGraphic = $('skHasGraphic').checked, needConversation = $('skHasConversation').checked;
    return skills.filter(s => {
      if (q) {
        const hay = [s.id, s.name, s.slug, s.description, s.category, s.next_action, s.origin_project, classification(s), ...(s.taxonomy?.tags || [])].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if ($('skDomain').value && groupOf(s) !== $('skDomain').value) return false;
      if ($('skFamily').value && familyOf(s) !== $('skFamily').value) return false;
      if (category && s.category !== category) return false;
      if (lifecycle && s.lifecycle !== lifecycle) return false;
      if (validation && s.validation !== validation) return false;
      if (platform) {
        const state = s.platform[platform];
        if (!(state === 'ARCHIVED' || state === 'INSTALLED' || state === 'INSTALLED_RECORDED')) return false;
      }
      if (needGraphic && !s.graphic_reference_count) return false;
      if (needConversation && s.locator_status !== 'DIRECT_LINK') return false;
      return true;
    });
  }

  // --- rendering -----------------------------------------------------------

  const pill = (text, cls) => `<span class="mini-pill ${cls}">${esc(text)}</span>`;
  const lifecyclePill = v => pill(v, `life-${String(v).toLowerCase()}`);
  const validationPill = v => pill(v, `valid-${String(v).toLowerCase()}`);
  const platformBadges = p => ['drive', 'chatgpt', 'codex']
    .map(key => `<span class="sk-plat sk-plat-${PLATFORM_TONE[p[key]] || 'off'}" title="${esc(key)}: ${esc(PLATFORM_LABEL[p[key]] || UNKNOWN)}">${key === 'drive' ? 'Drive' : key === 'chatgpt' ? 'GPT' : 'Codex'}</span>`)
    .join('');

  function render() {
    if (!index) return;
    const data = filtered().sort((a, b) => groupOf(a).localeCompare(groupOf(b)) || familyOf(a).localeCompare(familyOf(b)) || (a.taxonomy?.medium || '').localeCompare(b.taxonomy?.medium || '') || a.id.localeCompare(b.id));
    $('skCount').textContent = data.length;
    $('skApproved').textContent = data.filter(s => s.lifecycle === 'Approved').length;
    $('skPartial').textContent = data.filter(s => s.validation !== 'Untested').length;
    $('skRefs').textContent = data.reduce((sum, s) => sum + (s.graphic_reference_count || 0), 0);

    $('skRows').innerHTML = data.length ? data.map(s => `<tr data-skill="${esc(s.id)}" tabindex="0">
      <td class="name"><b>${esc(s.name)}</b>${s.slug ? `<div class="small">${esc(s.slug)}</div>` : ''}</td>
      <td class="smallcol">${esc(s.id)}</td>
      <td class="smallcol">${esc(classification(s))}</td>
      <td class="smallcol">${lifecyclePill(s.lifecycle)}</td>
      <td class="smallcol">${validationPill(s.validation)}</td>
      <td class="num">${esc(s.version ?? '—')}</td>
      <td class="num">${s.graphic_reference_count || 0}</td>
      <td class="smallcol">${platformBadges(s.platform)}</td>
      <td class="smallcol">${esc(s.origin_project ?? '—')}<div class="small">${esc(LOCATOR_LABEL[s.locator_status] || s.locator_status)}</div></td>
      <td class="long">${esc(s.next_action ?? '—')}</td>
      <td class="smallcol">${s.canonical_drive ? `<a class="launch-link" href="${esc(s.canonical_drive)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Drive ↗</a>` : '<span class="small">—</span>'}</td>
    </tr>`).join('') : '<tr><td colspan="11" class="small">No Skill matches these filters.</td></tr>';

    document.querySelectorAll('#skRows tr[data-skill]').forEach(row => {
      row.addEventListener('click', () => openDetail(row.dataset.skill));
      row.addEventListener('keydown', event => { if (event.key === 'Enter') openDetail(row.dataset.skill); });
    });

    renderVisual(data);
    applyView();
  }

  function renderVisual(data) {
    const groups = new Map();
    for (const skill of data) {
      const group = groupOf(skill);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(skill);
    }
    const host = $('skVisualView');
    if (!groups.size) { host.innerHTML = '<p class="small">No Skill matches these filters.</p>'; return; }
    host.innerHTML = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([category, items]) => {
      const isOpen = !collapsed.has(category);
      const families = new Map();
      for (const s of items) { const key = familyOf(s); if (!families.has(key)) families.set(key, []); families.get(key).push(s); }
      const contents = [...families].map(([family, members]) => `${family ? `<h4 class="sk-family-head">${esc(family)} · ${members.length}</h4>` : ''}<div class="sk-cards">${members.map(cardHtml).join('')}</div>`).join('');
      return `<section class="sk-group">
        <button class="sk-group-head" type="button" data-group="${esc(category)}" aria-expanded="${isOpen}">
          <span class="sk-caret">${isOpen ? '▾' : '▸'}</span><span>${esc(category)}</span><span class="kanban-count">${items.length}</span>
        </button>
        <div class="sk-group-content${isOpen ? '' : ' hidden'}">${contents}</div>
      </section>`;
    }).join('');
    host.querySelectorAll('[data-group]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.group;
      if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key);
      renderVisual(filtered());
    }));
    host.querySelectorAll('[data-card]').forEach(card => {
      card.addEventListener('click', () => openDetail(card.dataset.card));
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail(card.dataset.card); } });
    });
  }

  // Cover thumbnails are owner-curated repo assets listed in
  // skill-thumbnails.json (DEC-012). They are not the private Drive graphic
  // references. Only a relative path inside assets/skill-thumbs/ is accepted.
  function thumbFor(s) {
    const path = typeof thumbs[s.id] === 'string' ? thumbs[s.id].trim() : '';
    return /^assets\/skill-thumbs\/[\w.-]+\.(webp|png|jpe?g)$/i.test(path) ? path : null;
  }

  // Skills without a thumbnail keep the generated tile, which still shows
  // whether a Skill has visual references and how many.
  function cardHtml(s) {
    const refs = s.graphic_reference_count || 0;
    const thumb = thumbFor(s);
    const cover = thumb
      ? `<div class="sk-cover sk-cover-img"><img src="${esc(thumb)}" alt="" loading="lazy" decoding="async"></div>`
      : `<div class="sk-cover${refs ? ' sk-cover-has' : ''}"><span class="sk-cover-mark">${refs ? `${refs} ref${refs === 1 ? '' : 's'}` : 'no reference'}</span></div>`;
    return `<article class="task-card sk-card" data-card="${esc(s.id)}" tabindex="0">
      ${cover}
      <h3>${esc(s.name)}</h3>
      <div class="card-sub">${esc(s.taxonomy?.medium || s.taxonomy?.area || s.category)}</div>
      ${s.description ? `<p class="sk-description">${esc(s.description)}</p>` : ''}
      <div class="task-meta">${lifecyclePill(s.lifecycle)}${validationPill(s.validation)}</div>
      <div class="card-footer"><span>${esc(s.version ?? 'no version')}</span><span>·</span><span>${refs} ref${refs === 1 ? '' : 's'}</span></div>
    </article>`;
  }

  // --- detail --------------------------------------------------------------

  // Says where this Skill's metadata came from, so normalization progress is
  // visible without adding a screen.
  function provenance(s) {
    if (!s.metadata_source) return '';
    const values = Object.values(s.metadata_source);
    const explicit = values.filter(v => v === 'explicit').length;
    return s.has_explicit_metadata
      ? `Tracker Metadata in the registry: ${explicit} field${explicit === 1 ? '' : 's'} explicit, ${values.length - explicit} still derived by the parser.`
      : 'Not yet normalized — every field is derived from the registry prose by the parser.';
  }

  function field(label, value, wide) {
    return `<div class="detail-field ${wide ? 'detail-wide' : ''}"><label>${esc(label)}</label><div class="sk-value">${value}</div></div>`;
  }

  function openDetail(id) {
    const s = skills.find(item => item.id === id);
    if (!s) return;
    detailId = id;
    $('skDetailTitle').textContent = s.name;
    // The canonical folder has its own field; don't list it twice.
    const links = (s.links || []).filter(l => l.url !== s.canonical_drive)
      .map(l => { const url = safeUrl(l.url); return url ? `<a class="launch-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>` : ''; }).join('');
    const platformRows = ['drive', 'chatgpt', 'codex'].map(key =>
      `<div class="sk-plat-row"><b>${key === 'chatgpt' ? 'ChatGPT' : key === 'codex' ? 'Codex' : 'Drive'}</b> ${esc(PLATFORM_LABEL[s.platform[key]] || UNKNOWN)}<div class="small">${esc(s.platform_notes?.[key] ?? '')}</div></div>`).join('');
    const thumb = thumbFor(s);
    $('skDetailBody').innerHTML = [
      thumb ? `<div class="detail-field detail-wide sk-detail-thumb"><img src="${esc(thumb)}" alt="${esc(s.name)} cover thumbnail" decoding="async"></div>` : '',
      field('Skill name', esc(s.name), true),
      field('ID', esc(s.id)),
      field('Slug', esc(s.slug ?? UNKNOWN)),
      field('用途 / Domain', esc(groupOf(s))),
      field('用途子類 / Area', esc(s.taxonomy?.area || UNKNOWN)),
      field('風格大類 / Style family', esc(familyOf(s) || '—')),
      field('媒材 / Medium', esc(s.taxonomy?.medium || '—')),
      field('標籤 / Tags', esc((s.taxonomy?.tags || []).join(' · ') || '—')),
      field('Legacy category', esc(s.category)),
      field('Lifecycle', lifecyclePill(s.lifecycle)),
      field('Validation', validationPill(s.validation)),
      field('Version', `${esc(s.version ?? UNKNOWN)}<div class="small">${esc(s.version_note ?? '')}</div>`),
      field('Description / purpose', esc(s.description ?? UNKNOWN), true),
      field('Graphic references', `${s.graphic_reference_count || 0}<div class="small">Reference images are private Drive files; open the canonical folder to view them.</div>`),
      field('Platform / availability', platformRows, true),
      field('Origin project', esc(s.origin_project ?? UNKNOWN)),
      field('Origin conversation', s.origin_conversation_url ? `<a class="launch-link" href="${esc(safeUrl(s.origin_conversation_url) || '#')}" target="_blank" rel="noopener noreferrer">Open conversation ↗</a>` : esc(s.origin_conversation ?? UNKNOWN)),
      field('Locator status', esc(LOCATOR_LABEL[s.locator_status] || s.locator_status)),
      field('Related conversations', (s.related_conversations || []).length ? esc((s.related_conversations || []).join(', ')) : '<span class="small">None recorded</span>'),
      field('Next action', esc(s.next_action ?? UNKNOWN), true),
      field('Canonical Drive', s.canonical_drive ? `<a class="launch-link" href="${esc(s.canonical_drive)}" target="_blank" rel="noopener noreferrer">Open folder ↗</a>` : esc(UNKNOWN)),
      field('Reference / package links', links || '<span class="small">None recorded</span>', true),
      field('Registry entry', `${s.registered ? 'Registered Skill' : 'Pending candidate — not a released Skill'}<div class="small">${provenance(s)}</div>`, true)
    ].join('');
    $('skDetailBackdrop').classList.add('open');
  }

  function closeDetail() { $('skDetailBackdrop').classList.remove('open'); detailId = null; }

  // --- view ----------------------------------------------------------------

  function applyView() {
    const visual = view === 'visual';
    $('skListView').classList.toggle('hidden', visual);
    $('skVisualView').classList.toggle('hidden', !visual);
    $('skListBtn').classList.toggle('active', !visual);
    $('skVisualBtn').classList.toggle('active', visual);
  }

  function setView(next) { view = next; write(VIEW_KEY, next); applyView(); }

  // --- wiring --------------------------------------------------------------

  $('tasksModeBtn').addEventListener('click', () => applyMode('tasks', true));
  $('skillsModeBtn').addEventListener('click', () => applyMode('skills', true));
  $('skListBtn').addEventListener('click', () => setView('list'));
  $('skVisualBtn').addEventListener('click', () => setView('visual'));
  ['skSearch', 'skDomain', 'skFamily', 'skCategory', 'skLifecycle', 'skValidation', 'skPlatform', 'skHasGraphic', 'skHasConversation']
    .forEach(id => $(id).addEventListener('input', render));
  $('skDetailClose').addEventListener('click', closeDetail);
  $('skDetailBackdrop').addEventListener('click', event => { if (event.target.id === 'skDetailBackdrop') closeDetail(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && detailId !== null) closeDetail(); });

  applyView();
  applyMode(read(MODE_KEY) === 'skills' ? 'skills' : 'tasks', false);
})();
