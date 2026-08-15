const SUPABASE_URL = 'https://fzydsnxxcdllkjxwdiwn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wpnShrpWOLV94EEUA86vVg_zRQbbW2W';
const OWNER_EMAIL = 'blackeirose@gmail.com';
const STORAGE_KEYS = [
  'ysu-tool-development-tracker-v13',
  'ysu-tool-development-tracker-v12',
  'ysu-tool-development-tracker-v11',
  'ysu-tool-development-tracker-v10',
  'ysu-tool-development-tracker-v9'
];
const LOCAL_CACHE_KEY = STORAGE_KEYS[0];
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let tools = [];
let session = null;
let source = 'local';
let cloudWasEmpty = false;
let sortState = { key: null, dir: 1 };
let currentView = localStorage.getItem('ysu-tracker-view-v13') || localStorage.getItem('ysu-tracker-view-v10') || 'table';
let editingLinksIndex = null;
let detailIndex = null;

const statusOrder = { Active: 1, Planning: 2, Future: 3, Idea: 4, Paused: 5, Complete: 6 };
const priorityOrder = { High: 1, Medium: 2, Low: 3 };
const githubOrder = { Required: 1, Optional: 2, No: 3 };
const codexOrder = { XS: 1, S: 2, M: 3, L: 4, XL: 5 };

const rows = document.getElementById('rows');
const search = document.getElementById('search');
const priorityFilter = document.getElementById('priorityFilter');
const resourceFilter = document.getElementById('resourceFilter');
const statusFilter = document.getElementById('statusFilter');
const githubFilter = document.getElementById('githubFilter');
const syncStatus = document.getElementById('syncStatus');
const migrateBtn = document.getElementById('migrateBtn');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authEmail = document.getElementById('authEmail');
const authState = document.getElementById('authState');

function esc(v){
  return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function normalizeCodexLoad(v){
  if(['XS','S','M','L','XL'].includes(v)) return v;
  const n = Number(v); if(!Number.isFinite(n) || n <= 1) return 'XS'; if(n <= 2) return 'S'; if(n <= 3) return 'M'; if(n <= 5) return 'L'; return 'XL';
}
function normalizeTools(list){
  return (Array.isArray(list) ? list : []).map(t => ({
    id: t.id || null,
    name: t.name || 'Untitled Tool', category: t.category || '', platform: t.platform || '',
    github: ['Required','Optional','No'].includes(t.github) ? t.github : 'Required',
    status: ['Active','Planning','Future','Idea','Paused','Complete'].includes(t.status) ? t.status : 'Planning',
    progress: Math.max(0,Math.min(100,num(t.progress))),
    priority: ['High','Medium','Low'].includes(t.priority) ? t.priority : 'Medium',
    current: t.current ?? t.current_state ?? '', next: t.next ?? t.next_step ?? '',
    resource: t.resource || 'Manual', codex: normalizeCodexLoad(t.codex ?? t.codex_load),
    image2: Math.max(0,num(t.image2)), hours: Math.max(0,num(t.hours)), notes: t.notes || '',
    readiness: t.readiness || 'Needs definition', links: Array.isArray(t.links) ? t.links : []
  }));
}
function loadLocalTools(){
  for(const key of STORAGE_KEYS){
    try{
      const raw = localStorage.getItem(key);
      if(raw){ const parsed = JSON.parse(raw); if(Array.isArray(parsed)) return normalizeTools(parsed); }
    }catch(_){ }
  }
  return [];
}
function saveLocalCache(){
  try{ localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(tools)); }catch(_){ }
}
function dbToTool(r){ return normalizeTools([r])[0]; }
function toolToDb(t, order=0){
  return {
    name:t.name, category:t.category, platform:t.platform, github:t.github, status:t.status,
    progress:num(t.progress), priority:t.priority, current_state:t.current, next_step:t.next,
    resource:t.resource, codex_load:t.codex, image2:num(t.image2), hours:num(t.hours),
    notes:t.notes, readiness:t.readiness, links:Array.isArray(t.links)?t.links:[], sort_order:order
  };
}
function isOwner(){ return !!session && String(session.user?.email || '').toLowerCase() === OWNER_EMAIL; }
function canEdit(){ return source === 'local' || isOwner(); }
function setSync(text, kind=''){
  syncStatus.textContent = text;
  syncStatus.className = 'sync' + (kind ? ' ' + kind : '');
}
function updateAuthUI(){
  const email = session?.user?.email || '';
  authState.textContent = email ? `Signed in: ${email}` : 'Public read · sign in to edit cloud data';
  authEmail.classList.toggle('hidden', !!session);
  signInBtn.classList.toggle('hidden', !!session);
  signOutBtn.classList.toggle('hidden', !session);
  migrateBtn.classList.toggle('hidden', !(isOwner() && source === 'local' && cloudWasEmpty && tools.length));
}
async function fetchCloud(){
  const { data, error } = await db.from('tracker_items').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true});
  if(error) throw error;
  return (data || []).map(dbToTool);
}
async function refreshFromCloud(){
  try{
    setSync('Loading cloud…');
    const cloud = await fetchCloud();
    cloudWasEmpty = cloud.length === 0;
    if(cloud.length){
      tools = cloud; source = 'cloud'; saveLocalCache(); setSync('Cloud synced', 'ok');
    }else{
      const local = loadLocalTools();
      tools = local; source = 'local';
      setSync(local.length ? 'Local data ready · sign in to migrate' : 'Cloud empty · no local data found', 'warn');
    }
  }catch(err){
    tools = loadLocalTools(); source = 'local'; cloudWasEmpty = false;
    setSync('Cloud unavailable · using local cache', 'error'); console.error(err);
  }
  updateAuthUI(); render();
}
async function persistIndex(index){
  const t = tools[index]; if(!t){ return; }
  saveLocalCache();
  if(source !== 'cloud'){
    setSync('Saved locally · cloud migration pending', 'warn'); updateMetrics(); return;
  }
  if(!isOwner()){
    setSync('Read-only cloud view · sign in to edit', 'warn'); return;
  }
  setSync('Saving…');
  const payload = toolToDb(t,index);
  let result;
  if(t.id) result = await db.from('tracker_items').update(payload).eq('id',t.id).select().single();
  else result = await db.from('tracker_items').insert(payload).select().single();
  if(result.error){ setSync('Save failed', 'error'); console.error(result.error); return; }
  tools[index] = dbToTool(result.data); saveLocalCache(); setSync('Saved to Supabase', 'ok'); updateMetrics();
}
async function deleteIndex(index){
  const t = tools[index]; if(!t) return;
  if(source === 'cloud'){
    if(!isOwner()){ setSync('Sign in to delete', 'warn'); return; }
    if(t.id){ const { error } = await db.from('tracker_items').delete().eq('id',t.id); if(error){ setSync('Delete failed','error'); console.error(error); return; } }
  }
  tools.splice(index,1); saveLocalCache(); setSync(source === 'cloud' ? 'Deleted from Supabase' : 'Deleted locally','ok'); render();
}
async function migrateLocalToCloud(){
  if(!isOwner() || source !== 'local' || !cloudWasEmpty || !tools.length) return;
  if(!confirm(`Upload ${tools.length} local Tracker items to Supabase? Your local copy will be kept as a backup.`)) return;
  setSync('Migrating local data to cloud…'); migrateBtn.disabled = true;
  const payload = tools.map((t,i)=>toolToDb(t,i));
  const { error } = await db.from('tracker_items').insert(payload);
  if(error){ setSync('Migration failed · local data kept safe','error'); migrateBtn.disabled=false; console.error(error); return; }
  await refreshFromCloud(); setSync('Migration complete · cloud is now source of truth','ok');
}

async function sendSignInLink(){
  const email = authEmail.value.trim().toLowerCase();
  if(email !== OWNER_EMAIL){ alert(`Use ${OWNER_EMAIL} for Tracker editing.`); return; }
  signInBtn.disabled = true; setSync('Sending sign-in link…');
  const { error } = await db.auth.signInWithOtp({ email, options:{ shouldCreateUser:true, emailRedirectTo: window.location.origin + window.location.pathname } });
  signInBtn.disabled = false;
  if(error){ setSync('Could not send sign-in link','error'); alert(error.message); return; }
  setSync('Check your email for the Supabase sign-in link','ok');
}
async function signOut(){ await db.auth.signOut(); session=null; updateAuthUI(); await refreshFromCloud(); }

function getFilteredSorted(){
  const q=search.value.toLowerCase().trim(), p=priorityFilter.value, r=resourceFilter.value, s=statusFilter.value, g=githubFilter.value;
  let data=tools.map((t,index)=>({...t,_index:index})).filter(t=>(!q||Object.values(t).join(' ').toLowerCase().includes(q))&&(!p||t.priority===p)&&(!r||t.resource===r)&&(!s||t.status===s)&&(!g||t.github===g));
  if(sortState.key){ const k=sortState.key,dir=sortState.dir; data.sort((a,b)=>{ let av=a[k],bv=b[k]; if(k==='status'){av=statusOrder[av]??999;bv=statusOrder[bv]??999}else if(k==='priority'){av=priorityOrder[av]??999;bv=priorityOrder[bv]??999}else if(k==='github'){av=githubOrder[av]??999;bv=githubOrder[bv]??999}else if(k==='codex'){av=codexOrder[av]??999;bv=codexOrder[bv]??999}else if(['progress','image2','hours'].includes(k)){av=num(av);bv=num(bv)}else{av=String(av??'').toLowerCase();bv=String(bv??'').toLowerCase()} if(av<bv)return-dir;if(av>bv)return dir;return a._index-b._index;}); }
  return data;
}
function editableCell(value,key,index,cls=''){ return `<td class="${cls}" ${canEdit()?'contenteditable="true"':''} data-index="${index}" data-key="${key}">${esc(value)}</td>`; }
function selectColorClass(key,value){
  if(key==='status') return {Active:'status-active',Planning:'status-planning',Future:'status-future',Idea:'status-idea',Paused:'status-paused',Complete:'status-complete'}[value]||'';
  if(key==='priority') return {High:'priority-high',Medium:'priority-medium',Low:'priority-low'}[value]||'';
  if(key==='github') return {Required:'github-required',Optional:'github-optional',No:'github-no'}[value]||'';
  if(key==='codex') return {XS:'codex-xs',S:'codex-s',M:'codex-m',L:'codex-l',XL:'codex-xl'}[value]||''; return '';
}
function selectCell(value,key,index,options,cls=''){ return `<td class="${cls}"><select class="cell-select ${selectColorClass(key,value)}" data-index="${index}" data-key="${key}" ${canEdit()?'':'disabled'}>${options.map(o=>`<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></td>`; }
function safeUrl(url){ const u=String(url||'').trim(); return /^(https?:\/\/|codex:\/\/)/.test(u)?u:'#'; }
function renderLinks(links,index){ const arr=Array.isArray(links)?links:[]; return `<div class="launch-wrap">${arr.map(l=>{const href=safeUrl(l.url),ext=href.startsWith('http')?' target="_blank" rel="noopener noreferrer"':'';return `<a class="launch-link" href="${esc(href)}"${ext}>${esc(l.label||'Open')} ↗</a>`}).join('')}${canEdit()?`<button class="edit-links" type="button" data-edit-links="${index}">Edit</button>`:''}</div>`; }
function pillClass(kind,value){ return selectColorClass(kind,value); }
function cardLaunchLinks(links){ const arr=Array.isArray(links)?links:[]; return arr.length?`<div class="card-launch">${arr.map(l=>{const h=safeUrl(l.url),e=h.startsWith('http')?' target="_blank" rel="noopener noreferrer"':'';return `<a class="launch-link" href="${esc(h)}"${e} onclick="event.stopPropagation()">${esc(l.label||'Open')} ↗</a>`}).join('')}</div>`:''; }

function renderCards(){
  const cardView=document.getElementById('cardView'), statuses=['Active','Planning','Future','Idea','Paused','Complete'], filtered=getFilteredSorted();
  cardView.innerHTML=`<div class="kanban">${statuses.map(status=>{const items=filtered.filter(t=>t.status===status);return `<section class="kanban-col" data-status="${status}"><div class="kanban-head"><span>${status}</span><span class="kanban-count">${items.length}</span></div><div>${items.map(t=>`<article class="task-card" ${canEdit()?'draggable="true"':''} data-card-index="${t._index}"><div class="task-meta"><span class="mini-pill ${pillClass('priority',t.priority)}">${esc(t.priority)}</span><span class="mini-pill ${pillClass('github',t.github)}">GitHub ${esc(t.github)}</span><span class="mini-pill ${pillClass('codex',t.codex)}">Codex ${esc(t.codex)}</span></div><h3>${esc(t.name)}</h3><div class="card-sub">${esc(t.category)} · ${esc(t.platform)}</div><div class="card-next"><b>Next:</b> ${esc(t.next)}</div>${cardLaunchLinks(t.links)}<div class="card-footer"><span>${esc(t.progress)}%</span><div class="progress-mini"><span style="width:${Math.max(0,Math.min(100,num(t.progress)))}%"></span></div><span>${esc(t.hours)}h</span></div></article>`).join('')}</div></section>`}).join('')}</div>`;
  document.querySelectorAll('.task-card').forEach(card=>{card.addEventListener('click',()=>openDetail(Number(card.dataset.cardIndex))); if(canEdit()){card.addEventListener('dragstart',e=>{card.classList.add('dragging');e.dataTransfer.setData('text/plain',card.dataset.cardIndex)});card.addEventListener('dragend',()=>card.classList.remove('dragging'));}});
  if(canEdit()) document.querySelectorAll('.kanban-col').forEach(col=>{col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('drop-target')});col.addEventListener('dragleave',()=>col.classList.remove('drop-target'));col.addEventListener('drop',async e=>{e.preventDefault();col.classList.remove('drop-target');const i=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(i)&&tools[i]){tools[i].status=col.dataset.status;await persistIndex(i);render();}})});
}
function render(){
  const data=getFilteredSorted();
  rows.innerHTML=data.map(t=>`<tr><td><input class="rowSelect" type="checkbox" data-select="${t._index}" ${canEdit()?'':'disabled'}></td>${editableCell(t.name,'name',t._index,'name')}<td>${renderLinks(t.links,t._index)}</td>${editableCell(t.category,'category',t._index,'smallcol')}${editableCell(t.platform,'platform',t._index,'smallcol')}${selectCell(t.github,'github',t._index,['Required','Optional','No'],'smallcol')}${selectCell(t.status,'status',t._index,['Active','Planning','Future','Idea','Paused','Complete'],'smallcol')}<td class="num" ${canEdit()?'contenteditable="true"':''} data-index="${t._index}" data-key="progress">${esc(t.progress)}<div class="bar" contenteditable="false"><span style="width:${Math.max(0,Math.min(100,num(t.progress)))}%"></span></div></td>${selectCell(t.priority,'priority',t._index,['High','Medium','Low'],'smallcol')}${editableCell(t.current,'current',t._index,'long')}${editableCell(t.next,'next',t._index,'long')}${editableCell(t.resource,'resource',t._index,'smallcol')}${selectCell(t.codex,'codex',t._index,['XS','S','M','L','XL'],'smallcol')}${editableCell(t.image2,'image2',t._index,'num')}${editableCell(t.hours,'hours',t._index,'num')}${editableCell(t.notes,'notes',t._index,'long')}${editableCell(t.readiness,'readiness',t._index,'smallcol')}<td>${canEdit()?`<button class="remove" data-remove="${t._index}">×</button>`:''}</td></tr>`).join('');
  document.querySelectorAll('td[contenteditable=true]').forEach(td=>{td.addEventListener('blur',handleEdit);td.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();td.blur()}})});
  document.querySelectorAll('.cell-select').forEach(sel=>sel.addEventListener('change',async e=>{const s=e.currentTarget,i=Number(s.dataset.index);tools[i][s.dataset.key]=s.value;await persistIndex(i);render()}));
  document.querySelectorAll('[data-edit-links]').forEach(b=>b.addEventListener('click',()=>openLinksEditor(Number(b.dataset.editLinks))));
  document.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',async()=>{const i=Number(b.dataset.remove);if(confirm(`Delete "${tools[i].name}"?`)) await deleteIndex(i)}));
  updateMetrics(); updateSortIndicators(); applyView(); updateAuthUI();
}
async function handleEdit(e){
  const td=e.currentTarget,i=Number(td.dataset.index),key=td.dataset.key; let value;
  if(key==='progress') value=[...td.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim(); else value=td.textContent.trim();
  if(['progress','image2','hours'].includes(key)){value=num(value);if(key==='progress')value=Math.max(0,Math.min(100,value));}
  tools[i][key]=value; await persistIndex(i); render();
}
function updateMetrics(){
  document.getElementById('active').textContent=tools.filter(t=>t.status==='Active').length;
  document.getElementById('high').textContent=tools.filter(t=>t.priority==='High').length;
  document.getElementById('githubRequired').textContent=tools.filter(t=>t.github==='Required').length;
  document.getElementById('codex').textContent=tools.filter(t=>['L','XL'].includes(t.codex)).length+' L/XL tasks';
  document.getElementById('images').textContent=tools.reduce((a,t)=>a+num(t.image2),0);
}
function updateSortIndicators(){document.querySelectorAll('th[data-key]').forEach(th=>{const span=th.querySelector('.sort');span.textContent=th.dataset.key===sortState.key?(sortState.dir===1?'▲':'▼'):''})}
function applyView(){const table=document.getElementById('tableView'),card=document.getElementById('cardView'),tb=document.getElementById('tableViewBtn'),cb=document.getElementById('cardViewBtn'),isCard=currentView==='card';table.classList.toggle('hidden',isCard);card.classList.toggle('hidden',!isCard);tb.classList.toggle('active',!isCard);cb.classList.toggle('active',isCard);if(isCard)renderCards();}

function openLinksEditor(index){ editingLinksIndex=index;document.getElementById('linksEditor').value=(tools[index].links||[]).map(l=>`${l.label} | ${l.url}`).join('\n');document.getElementById('linksModal').classList.add('open'); }
function closeLinksEditor(){document.getElementById('linksModal').classList.remove('open');editingLinksIndex=null;}
function parseLinks(text){return text.split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.indexOf('|');return p<0?{label:'Open',url:line}:{label:line.slice(0,p).trim()||'Open',url:line.slice(p+1).trim()}}).filter(l=>l.url)}
function openDetail(index){
  detailIndex=index;const t=tools[index];if(!t)return;document.getElementById('detailTitle').textContent=t.name;
  const disabled=canEdit()?'':'disabled';const inp=(k,v,type='text')=>`<input class="detail-input" data-detail-key="${k}" type="${type}" value="${esc(v)}" ${disabled}>`;const ta=(k,v)=>`<textarea class="detail-textarea" data-detail-key="${k}" ${disabled}>${esc(v)}</textarea>`;const sel=(k,v,opts)=>`<select class="detail-select" data-detail-key="${k}" ${disabled}>${opts.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  const fields=[['Tool Name',inp('name',t.name),'wide'],['Status',sel('status',t.status,['Active','Planning','Future','Idea','Paused','Complete'])],['Priority',sel('priority',t.priority,['High','Medium','Low'])],['Category',inp('category',t.category)],['Platform',inp('platform',t.platform)],['GitHub',sel('github',t.github,['Required','Optional','No'])],['Codex Load',sel('codex',t.codex,['XS','S','M','L','XL'])],['Progress',inp('progress',t.progress,'number')],['Hours',inp('hours',t.hours,'number')],['Image2',inp('image2',t.image2,'number')],['Resource',inp('resource',t.resource)],['Readiness',inp('readiness',t.readiness)],['Current State',ta('current',t.current),'wide'],['Next Step',ta('next',t.next),'wide'],['Notes',ta('notes',t.notes),'wide']];
  document.getElementById('detailBody').innerHTML=fields.map(([l,c,w])=>`<div class="detail-field ${w?'detail-wide':''}"><label>${l}</label>${c}</div>`).join('')+`<div class="detail-field detail-wide"><label>Launch Links</label><div class="detail-links">${(t.links||[]).map(l=>`<a class="launch-link" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>`).join('')||'<span class="small">No links</span>'}</div>${canEdit()?'<button class="edit-links" id="detailEditLinks">Edit Launch Links</button>':''}</div>`;
  if(canEdit()) document.querySelectorAll('[data-detail-key]').forEach(el=>{const fn=async()=>{let v=el.value;if(['progress','hours','image2'].includes(el.dataset.detailKey))v=num(v);tools[index][el.dataset.detailKey]=v;await persistIndex(index);document.getElementById('detailTitle').textContent=tools[index].name;render()};el.addEventListener('change',fn);if(['TEXTAREA','INPUT'].includes(el.tagName))el.addEventListener('blur',fn)});
  document.getElementById('detailEditLinks')?.addEventListener('click',()=>openLinksEditor(index));document.getElementById('detailBackdrop').classList.add('open');
}
function closeDetail(){document.getElementById('detailBackdrop').classList.remove('open');detailIndex=null;}

async function addItem(){
  if(!canEdit()){setSync('Sign in to add items','warn');return;}
  const item={id:null,name:'New Tool',category:'',platform:'',github:'Required',status:'Planning',progress:0,priority:'Medium',current:'',next:'',resource:'Manual',codex:'XS',image2:0,hours:0,notes:'',readiness:'Needs definition',links:[]};
  tools.push(item);const i=tools.length-1;await persistIndex(i);sortState={key:null,dir:1};render();
}
async function deleteSelected(){
  if(!canEdit())return;const indexes=[...document.querySelectorAll('.rowSelect:checked')].map(c=>Number(c.dataset.select)).sort((a,b)=>b-a);if(!indexes.length){alert('Select one or more items first.');return;}if(!confirm(`Delete ${indexes.length} selected item(s)?`))return;for(const i of indexes) await deleteIndex(i);
}

async function init(){
  const { data:{ session:s } } = await db.auth.getSession(); session=s;
  db.auth.onAuthStateChange((_event,newSession)=>{session=newSession;updateAuthUI();if(newSession)setTimeout(refreshFromCloud,0)});
  authEmail.value=OWNER_EMAIL; updateAuthUI(); await refreshFromCloud();
}

document.querySelectorAll('th[data-key]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.key;if(sortState.key===k)sortState.dir*=-1;else sortState={key:k,dir:1};render()}));
[search,priorityFilter,resourceFilter,statusFilter,githubFilter].forEach(el=>el.addEventListener('input',render));
document.getElementById('addRow').addEventListener('click',addItem);
document.getElementById('deleteSelected').addEventListener('click',deleteSelected);
document.getElementById('selectAll').addEventListener('change',e=>document.querySelectorAll('.rowSelect').forEach(c=>{if(!c.disabled)c.checked=e.target.checked}));
document.getElementById('tableViewBtn').addEventListener('click',()=>{currentView='table';localStorage.setItem('ysu-tracker-view-v13',currentView);applyView()});
document.getElementById('cardViewBtn').addEventListener('click',()=>{currentView='card';localStorage.setItem('ysu-tracker-view-v13',currentView);applyView()});
signInBtn.addEventListener('click',sendSignInLink);signOutBtn.addEventListener('click',signOut);migrateBtn.addEventListener('click',migrateLocalToCloud);
document.getElementById('saveLinks').addEventListener('click',async()=>{if(editingLinksIndex===null)return;tools[editingLinksIndex].links=parseLinks(document.getElementById('linksEditor').value);await persistIndex(editingLinksIndex);closeLinksEditor();render();if(detailIndex!==null)openDetail(detailIndex)});
document.getElementById('cancelLinks').addEventListener('click',closeLinksEditor);document.getElementById('linksModal').addEventListener('click',e=>{if(e.target.id==='linksModal')closeLinksEditor()});
document.getElementById('detailClose').addEventListener('click',closeDetail);document.getElementById('detailBackdrop').addEventListener('click',e=>{if(e.target.id==='detailBackdrop')closeDetail()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDetail();closeLinksEditor()}});

init();