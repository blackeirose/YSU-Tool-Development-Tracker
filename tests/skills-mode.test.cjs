const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,20));
const index=JSON.parse(fs.readFileSync('skills.json','utf8'));
const nativeTools=JSON.parse(fs.readFileSync('tool-catalog.json','utf8')).tools;
const catalog=[...index.skills,...nativeTools];
const thumbnails=JSON.parse(fs.readFileSync('skill-thumbnails.json','utf8'));

// Skills Mode is a read-only view over skills.json. The fixture gives it the
// real generated index and a Supabase stub, so Tasks still boots exactly as it
// does in production.
function fixture(options={}){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:options.url??'https://tracker.example.invalid/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.confirm=()=>true;w.alert=()=>{};
 const auth={getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithOtp:async()=>({error:null}),verifyOtp:async()=>({error:null}),signOut:async()=>({error:null})};
 w.supabase={createClient:()=>({auth,from:()=>({select:()=>({order:()=>({order:async()=>({data:[],error:null})})})})})};
 let fetched=[];
 w.fetch=async url=>{fetched.push(String(url));
  if(String(url).includes('tool-catalog.json')){
   if(options.failTools)return {ok:false,status:500};
   return {ok:true,json:async()=>({schema_version:1,tools:options.nativeTools??nativeTools})};
  }
  if(String(url).includes('skill-thumbnails.json')){
   if(options.failThumbs)return {ok:false,status:404,json:async()=>({})};
   return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(options.thumbnails??thumbnails))};
  }
  if(options.failFetch)return {ok:false,status:500,json:async()=>({})};
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(index))}};
 for(const key of Object.keys(options.storage??{}))w.localStorage.setItem(key,options.storage[key]);
 w.console.error=()=>{};
 for(const file of ['app.js','email-otp.js','owner-ui.js','skills.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
 const get=id=>d.getElementById(id);
 return {w,d,get,fetched,rows:()=>[...d.querySelectorAll('#skRows tr[data-skill]')],
  toSkills:async()=>{get('skillsModeBtn').click();await tick();await tick();},
  close:()=>w.close()};
}

test('mode switch shows Skills, keeps Tasks intact and defaults to List',async()=>{
 const f=fixture();try{
  await tick();
  assert.equal(f.get('tasksMode').classList.contains('hidden'),false);
  assert.equal(f.get('skillsMode').classList.contains('hidden'),true);
  assert.equal(f.fetched.length,0,'Skills index and thumbnails are not fetched until Skills mode opens');
  await f.toSkills();
  assert.equal(f.get('tasksMode').classList.contains('hidden'),true);
  assert.equal(f.get('skillsMode').classList.contains('hidden'),false);
  assert.equal(f.get('skListView').classList.contains('hidden'),false,'List is the Skills default');
  assert.equal(f.get('skVisualView').classList.contains('hidden'),true);
  // Tasks DOM is untouched, only hidden.
  assert.ok(f.get('tableView'));assert.ok(f.get('cardView'));assert.equal(f.w.eval('typeof tools'),'object');
 }finally{f.close()}
});

test('every registered Skill appears with lifecycle, validation, version, refs and Drive link',async()=>{
 const f=fixture();try{
  await f.toSkills();
  assert.equal(f.rows().length,catalog.length);
  assert.equal(index.skills.filter(s=>s.registered).length,39,'all 39 registered Skills are indexed');
  const text=f.get('skRows').textContent;
  for(const s of index.skills){
   assert.ok(text.includes(s.name),`${s.id} name shown`);
   assert.ok(text.includes(s.id),`${s.id} id shown`);
   assert.ok(text.includes(s.lifecycle),`${s.id} lifecycle shown`);
   assert.ok(text.includes(s.validation),`${s.id} validation shown`);
  }
  const simulator=f.rows().find(r=>r.dataset.skill==='YSU-SKILL-001');
  assert.ok(simulator.textContent.includes('1.1.1'),'version shown');
  const inkframe=f.rows().find(r=>r.dataset.skill==='YSU-SKILL-012');
  assert.ok(inkframe.textContent.includes('11'),'graphic reference count shown');
  const links=[...f.get('skRows').querySelectorAll('a')].map(a=>a.href);
  assert.ok(links.some(href=>href.includes('drive.google.com/drive/folders/')),'canonical Drive can be opened');
  assert.equal(Number(f.get('skCount').textContent),catalog.length);
 }finally{f.close()}
});

test('search and every MVP filter narrow the list',async()=>{
 const f=fixture();try{
  await f.toSkills();
  const all=f.rows().length;
  f.get('skSearch').value='revit';f.get('skSearch').dispatchEvent(new f.w.Event('input'));
  assert.equal(f.rows().length,5);
  assert.ok(f.rows().some(r=>r.dataset.skill==='YSU-SKILL-002'));
  assert.equal(f.rows().filter(r=>r.dataset.skill.startsWith('YSU-TOOL-')).length,4);
  f.get('skSearch').value='';f.get('skSearch').dispatchEvent(new f.w.Event('input'));
  assert.equal(f.rows().length,all);

  const narrows=(id,value,check)=>{
   const el=f.get(id);
   if(el.type==='checkbox')el.checked=value;else el.value=value;
   el.dispatchEvent(new f.w.Event('input'));
   const got=f.rows().map(r=>catalog.find(s=>s.id===r.dataset.skill));
   assert.ok(got.length>0&&got.length<all,`${id}=${value} narrows the list (${got.length}/${all})`);
   got.forEach(s=>assert.ok(check(s),`${id}=${value} kept ${s.id} wrongly`));
   if(el.type==='checkbox')el.checked=false;else el.value='';
   el.dispatchEvent(new f.w.Event('input'));
  };
  narrows('skCategory','FILM',s=>s.category==='FILM');
  narrows('skLifecycle','Approved',s=>s.lifecycle==='Approved');
  narrows('skValidation','Partial',s=>s.validation==='Partial');
  // Availability includes archived Skills-page packages; this does not claim installation.
  narrows('skPlatform','chatgpt',s=>['ARCHIVED','INSTALLED','INSTALLED_RECORDED'].includes(s.platform.chatgpt));
  narrows('skHasGraphic',true,s=>s.graphic_reference_count>0);

  // No Skill has a direct conversation URL yet, so this filter must empty the
  // list rather than silently pass everything through.
  f.get('skHasConversation').checked=true;f.get('skHasConversation').dispatchEvent(new f.w.Event('input'));
  assert.equal(f.rows().length,index.skills.filter(s=>s.locator_status==='DIRECT_LINK').length);
 }finally{f.close()}
});

test('Visual view groups by category, collapses and opens detail',async()=>{
 const f=fixture();try{
  await f.toSkills();
  f.get('skVisualBtn').click();
  assert.equal(f.get('skVisualView').classList.contains('hidden'),false);
  assert.equal(f.get('skListView').classList.contains('hidden'),true);
  const groups=[...f.d.querySelectorAll('#skVisualView [data-group]')];
  const categories=[...new Set(catalog.map(s=>s.taxonomy?.domain || s.category))];
  assert.equal(groups.length,categories.length);
  assert.ok(groups.length>1,'more than one category group');
  const first=groups[0];
  assert.equal(first.getAttribute('aria-expanded'),'true');
  first.click();
  const reopened=f.d.querySelector(`#skVisualView [data-group="${first.dataset.group}"]`);
  assert.equal(reopened.getAttribute('aria-expanded'),'false','group collapses');
  assert.equal(reopened.parentElement.querySelector('.sk-group-content').classList.contains('hidden'),true);
  reopened.click();
  assert.equal(f.d.querySelector(`#skVisualView [data-group="${first.dataset.group}"]`).getAttribute('aria-expanded'),'true');

  f.d.querySelector('#skVisualView [data-card="YSU-SKILL-001"]').click();
  assert.equal(f.get('skDetailBackdrop').classList.contains('open'),true);
  const body=f.get('skDetailBody').textContent;
  for(const label of ['Lifecycle','Validation','Locator status','Next action','Canonical Drive','Platform / availability'])
   assert.ok(body.includes(label),`${label} in detail`);
  f.get('skDetailClose').click();
  assert.equal(f.get('skDetailBackdrop').classList.contains('open'),false);
 }finally{f.close()}
});

test('a Skill with no conversation link shows its locator status instead of a fake link',async()=>{
 const f=fixture();try{
  await f.toSkills();
  const unlocated=index.skills.find(s=>s.locator_status==='UNLOCATED');
  f.rows().find(r=>r.dataset.skill===unlocated.id).click();
  const body=f.get('skDetailBody');
  assert.ok(body.textContent.includes('Unlocated'));
  assert.equal([...body.querySelectorAll('a')].some(a=>a.href.includes('chatgpt.com/c/')),false,'no invented conversation URL');
  const titled=index.skills.find(s=>s.locator_status==='PROJECT_TITLE_ONLY');
  f.get('skDetailClose').click();
  f.rows().find(r=>r.dataset.skill===titled.id).click();
  assert.ok(f.get('skDetailBody').textContent.includes('Project title only'));
  assert.ok(f.get('skDetailBody').textContent.includes(titled.origin_project));
 }finally{f.close()}
});

test('Tasks and Skills remember their view mode independently',async()=>{
 const f=fixture();try{
  await f.toSkills();
  f.get('skVisualBtn').click();
  f.get('tasksModeBtn').click();
  f.get('cardViewBtn').click();
  assert.equal(f.w.localStorage.getItem('ysu-skills-view-v1'),'visual');
  assert.equal(f.w.localStorage.getItem('ysu-tracker-view-v13'),'card');
  assert.equal(f.w.localStorage.getItem('ysu-tracker-mode-v1'),'tasks');
 }finally{f.close()}

 const back=fixture({storage:{'ysu-tracker-mode-v1':'skills','ysu-skills-view-v1':'visual','ysu-tracker-view-v13':'table'}});
 try{
  await tick();await tick();
  assert.equal(back.get('skillsMode').classList.contains('hidden'),false,'mode restored on refresh');
  assert.equal(back.get('skVisualView').classList.contains('hidden'),false,'Skills view restored');
  assert.equal(back.get('tableViewBtn').classList.contains('active'),true,'Tasks view restored separately');
 }finally{back.close()}
});

test('a failed index load reports it instead of rendering an empty list silently',async()=>{
 const f=fixture({failFetch:true});try{
  await f.toSkills();
  assert.match(f.get('skRows').textContent,/could not be loaded/);
 }finally{f.close()}
});

test('the generated index never invents data and stays in the documented shape',()=>{
 assert.equal(index.counts.registered,39);
 assert.ok(index.source.file.includes('00_SKILL_REGISTRY.md'));
 for(const s of index.skills){
  assert.match(s.id,/^YSU-(SKILL|PENDING)-\d{3}$/);
  assert.ok(['Candidate','Draft','Approved','Retired'].includes(s.lifecycle),`${s.id} lifecycle`);
  assert.ok(['Untested','Partial','Validated'].includes(s.validation),`${s.id} validation`);
  assert.ok(['DIRECT_LINK','PROJECT_TITLE_ONLY','UNLOCATED'].includes(s.locator_status),`${s.id} locator`);
  assert.ok(Number.isInteger(s.graphic_reference_count)&&s.graphic_reference_count>=0);
  // Lifecycle and Validation are independent dimensions, never merged.
  assert.notEqual(s.lifecycle,s.validation);
  if(s.origin_conversation_url===null)assert.notEqual(s.locator_status,'DIRECT_LINK');
  if(s.version)assert.match(s.version,/^\d+\.\d+\.\d+$/);
 }
 const inkframe=index.skills.find(s=>s.id==='YSU-SKILL-012');
 assert.equal(inkframe.lifecycle,'Approved');
 assert.equal(inkframe.validation,'Partial');
});

test('Visual cards show curated cover thumbnails and keep the tile for the rest',async()=>{
 const f=fixture({storage:{'ysu-skills-view-v1':'visual'}});try{
  await f.toSkills();
  const card=id=>f.d.querySelector(`[data-card="${id}"]`);
  for(const [id,path] of Object.entries(thumbnails)){
   assert.ok(fs.existsSync(path),`${path} is committed`);
   assert.equal(card(id).querySelector('.sk-cover img').getAttribute('src'),path,`${id} cover`);
  }
  const bare=index.skills.filter(s=>!thumbnails[s.id]);
  assert.ok(bare.length>0);
  for(const s of bare){
   assert.equal(card(s.id).querySelector('.sk-cover img'),null,`${s.id} has no cover image`);
   assert.ok(card(s.id).querySelector('.sk-cover-mark'),`${s.id} keeps the generated tile`);
  }
  card('YSU-SKILL-012').click();
  assert.equal(f.get('skDetailBody').querySelector('.sk-detail-thumb img').getAttribute('src'),thumbnails['YSU-SKILL-012']);
 }finally{f.close()}
});

test('a missing or unsafe thumbnail manifest never breaks Skills and never injects a URL',async()=>{
 const missing=fixture({failThumbs:true,storage:{'ysu-skills-view-v1':'visual'}});try{
  await missing.toSkills();
  assert.equal(missing.rows().length,catalog.length,'list still renders');
  assert.equal(missing.d.querySelectorAll('.sk-cover-img:not(.sk-tool-cover) img').length,0);
 }finally{missing.close()}
 const unsafe=fixture({thumbnails:{'YSU-SKILL-001':'https://evil.example/x.png','YSU-SKILL-002':'javascript:alert(1)','YSU-SKILL-003':'assets/skill-thumbs/../../x.webp'},storage:{'ysu-skills-view-v1':'visual'}});try{
  await unsafe.toSkills();
  assert.equal(unsafe.d.querySelectorAll('.sk-cover-img:not(.sk-tool-cover) img').length,0,'only local assets/skill-thumbs paths are used');
 }finally{unsafe.close()}
});

test('taxonomy separates purpose from style and keeps paper styles together',async()=>{
 const f=fixture();try{
  await f.toSkills();
  f.get('skFamily').value='紙藝與纖維 / Paper & Fiber';f.get('skFamily').dispatchEvent(new f.w.Event('input'));
  assert.deepEqual(f.rows().map(r=>r.dataset.skill).sort(),['YSU-SKILL-015','YSU-SKILL-016','YSU-SKILL-021','YSU-SKILL-022','YSU-SKILL-036']);
  f.get('skDomain').value='建築與空間 / Architecture & Space';f.get('skDomain').dispatchEvent(new f.w.Event('input'));
  assert.equal(f.rows().length,0,'independent filters intersect; no invented architecture support');
  f.get('skFamily').value='';f.get('skFamily').dispatchEvent(new f.w.Event('input'));
  assert.deepEqual(f.rows().map(r=>r.dataset.skill).sort(),['YSU-SKILL-002']);
  f.get('skDomain').value='影片與動畫 / Film & Animation';f.get('skDomain').dispatchEvent(new f.w.Event('input'));
  assert.ok(f.rows().some(r=>r.dataset.skill==='YSU-SKILL-003'),'site/construction film stays in the already-published film domain');
  assert.ok(!f.rows().some(r=>r.dataset.skill==='YSU-SKILL-002'));
  f.get('skDomain').value='圖像與風格 / Image & Style';f.get('skDomain').dispatchEvent(new f.w.Event('input'));
  f.get('skVisualBtn').click();
  assert.equal(f.d.querySelectorAll('.sk-family-head').length,3,'image/style Skills still use only three style families');
  const card=f.d.querySelector('[data-card="YSU-SKILL-015"]');
  assert.ok(card.querySelector('.sk-description').textContent.includes('留白'));
  card.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(f.get('skDetailBackdrop').classList.contains('open'),true,'keyboard opens style detail');
  assert.ok(f.get('skDetailBody').textContent.includes('紙藝與纖維'));
 }finally{f.close()}
});

test('pyRevit shortcut resets stale filters and shows exactly four covered tools',async()=>{
 const f=fixture();try{
  await f.toSkills();
  f.get('skSearch').value='unrelated';f.get('skHasGraphic').checked=true;f.get('skPlatform').value='chatgpt';
  f.get('skPyrevitBtn').click();
  assert.equal(f.get('skCategory').value,'BIM / pyRevit');
  assert.equal(f.get('skVisualView').classList.contains('hidden'),false);
  assert.equal(f.rows().length,4);
  const cards=[...f.d.querySelectorAll('[data-card]')];
  assert.equal(cards.length,4);
  for(const tool of nativeTools){
   const card=cards.find(c=>c.dataset.card===tool.id);
   assert.ok(card);assert.equal(card.querySelector('img').getAttribute('src'),tool.cover);
   assert.ok(fs.existsSync(tool.cover));assert.match(card.textContent,/pyRevit 工具/);
  }
  assert.ok(!f.get('skVisualView').textContent.match(/PLUMBING|LEVEL MIGRATE/i));
  f.get('skListBtn').click();assert.equal(f.rows().length,4);
 }finally{f.close()}
});

test('tool details distinguish package publication from native validation and route downloads to HUB',async()=>{
 const f=fixture();try{
  await f.toSkills();f.get('skPyrevitBtn').click();
  for(const tool of nativeTools){
   const card=f.d.querySelector(`[data-card="${tool.id}"]`);card.focus();
   card.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
   const body=f.get('skDetailBody');
   assert.ok(body.textContent.includes(tool.version));
   assert.ok(body.textContent.includes(tool.validation_note));
   assert.ok(body.textContent.includes(tool.task_id));
   assert.ok(!body.textContent.includes('Registered Skill'));
   const links=[...body.querySelectorAll('a')];
   assert.ok(links.some(a=>a.href==='https://hub.ycsu.cc/'));
   assert.ok(!links.some(a=>a.href.includes('/releases/download/')),'no protected download URL exposed');
   if(tool.lifecycle==='Candidate'){
    assert.match(body.textContent,/不再等待本人原生驗收/);
    assert.match(body.textContent,/下載入口尚待完成/);
    assert.ok(!links.some(a=>a.href.endsWith('.zip')));
   }
   assert.equal(f.d.activeElement,f.get('skDetailClose'));
   f.d.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   assert.equal(f.get('skDetailBackdrop').getAttribute('aria-hidden'),'true');
   assert.equal(f.d.activeElement,card);
  }
 }finally{f.close()}
});

test('native Revit platform is independent of ChatGPT/Codex installation',async()=>{
 const f=fixture();try{
  await f.toSkills();
  f.get('skPlatform').value='revit';f.get('skPlatform').dispatchEvent(new f.w.Event('input'));
  assert.equal(f.rows().length,4);
  f.get('skPlatform').value='codex';f.get('skPlatform').dispatchEvent(new f.w.Event('input'));
  assert.ok(f.rows().every(r=>!r.dataset.skill.startsWith('YSU-TOOL-')));
 }finally{f.close()}
});

test('failed or invalid native catalog reports failure without losing the Skill registry',async()=>{
 for(const opts of [{failTools:true},{nativeTools:[{id:'YSU-SKILL-001',kind:'pyrevit-tool'}]}]){
  const f=fixture(opts);try{
   await f.toSkills();assert.equal(f.rows().length,index.skills.length);
   assert.match(f.get('skSourceNote').textContent,/工具清單暫時無法載入/);
  }finally{f.close()}
 }
});

test('tool metadata is escaped and external cover injection is rejected',async()=>{
 const tool={...nativeTools[0],name:'<img src=x onerror=alert(1)>',description:'<script>alert(1)</script>',cover:'https://evil.invalid/x.png',links:[{label:'bad',url:'javascript:alert(1)'}]};
 const f=fixture({nativeTools:[tool]});try{
  await f.toSkills();f.get('skPyrevitBtn').click();
  const card=f.d.querySelector(`[data-card="${tool.id}"]`);
  assert.equal(card.querySelector('img'),null);assert.equal(card.querySelector('script'),null);
  assert.ok(card.textContent.includes('<img'));
  card.click();assert.equal(f.get('skDetailBody').querySelector('script'),null);
  assert.equal(f.get('skDetailBody').querySelector('a'),null);
 }finally{f.close()}
});

test('tool catalog does not alter canonical Skill IDs, counts or references',()=>{
 assert.equal(nativeTools.length,4);assert.equal(index.skills.length,40);
 assert.equal(index.counts.registered,39);
 assert.ok(nativeTools.every(t=>t.kind==='pyrevit-tool'&&t.id.startsWith('YSU-TOOL-')));
 assert.equal(new Set(nativeTools.map(t=>t.task_id)).size,4);
 assert.equal(nativeTools.filter(t=>t.version==='1.0.1').length,3);
 assert.equal(nativeTools.filter(t=>t.version==='0.2.0-candidate').length,1);
});

test('direct pyRevit entry opens all four cards despite stored Tasks mode',async()=>{
 const f=fixture({url:'https://tracker.example.invalid/#skills-pyrevit',storage:{'ysu-tracker-mode-v1':'tasks'}});try{
  await tick();await tick();
  assert.equal(f.get('skillsMode').classList.contains('hidden'),false);
  assert.equal(f.get('skVisualView').classList.contains('hidden'),false);
  assert.equal(f.rows().length,4);
  assert.equal(f.get('skCategory').value,'BIM / pyRevit');
 }finally{f.close()}
});
