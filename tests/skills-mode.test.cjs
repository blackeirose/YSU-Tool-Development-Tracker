const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,20));
const index=JSON.parse(fs.readFileSync('skills.json','utf8'));

// Skills Mode is a read-only view over skills.json. The fixture gives it the
// real generated index and a Supabase stub, so Tasks still boots exactly as it
// does in production.
function fixture(options={}){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://tracker.example.invalid/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.confirm=()=>true;w.alert=()=>{};
 const auth={getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithOtp:async()=>({error:null}),verifyOtp:async()=>({error:null}),signOut:async()=>({error:null})};
 w.supabase={createClient:()=>({auth,from:()=>({select:()=>({order:()=>({order:async()=>({data:[],error:null})})})})})};
 let fetched=[];
 w.fetch=async url=>{fetched.push(String(url));
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
  assert.equal(f.fetched.length,0,'Skills index is not fetched until Skills mode opens');
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
  assert.equal(f.rows().length,index.skills.length);
  assert.equal(index.skills.filter(s=>s.registered).length,13,'all 13 registered Skills are indexed');
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
  assert.equal(Number(f.get('skCount').textContent),index.skills.length);
 }finally{f.close()}
});

test('search and every MVP filter narrow the list',async()=>{
 const f=fixture();try{
  await f.toSkills();
  const all=f.rows().length;
  f.get('skSearch').value='revit';f.get('skSearch').dispatchEvent(new f.w.Event('input'));
  assert.equal(f.rows().length,1);
  assert.equal(f.rows()[0].dataset.skill,'YSU-SKILL-002');
  f.get('skSearch').value='';f.get('skSearch').dispatchEvent(new f.w.Event('input'));
  assert.equal(f.rows().length,all);

  const narrows=(id,value,check)=>{
   const el=f.get(id);
   if(el.type==='checkbox')el.checked=value;else el.value=value;
   el.dispatchEvent(new f.w.Event('input'));
   const got=f.rows().map(r=>index.skills.find(s=>s.id===r.dataset.skill));
   assert.ok(got.length>0&&got.length<all,`${id}=${value} narrows the list (${got.length}/${all})`);
   got.forEach(s=>assert.ok(check(s),`${id}=${value} kept ${s.id} wrongly`));
   if(el.type==='checkbox')el.checked=false;else el.value='';
   el.dispatchEvent(new f.w.Event('input'));
  };
  narrows('skCategory','FILM',s=>s.category==='FILM');
  narrows('skLifecycle','Approved',s=>s.lifecycle==='Approved');
  narrows('skValidation','Partial',s=>s.validation==='Partial');
  narrows('skPlatform','chatgpt',s=>s.platform.chatgpt==='INSTALLED');
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
  const categories=[...new Set(index.skills.map(s=>s.category))];
  assert.equal(groups.length,categories.length);
  assert.ok(groups.length>1,'more than one category group');
  const first=groups[0];
  assert.equal(first.getAttribute('aria-expanded'),'true');
  first.click();
  const reopened=f.d.querySelector(`#skVisualView [data-group="${first.dataset.group}"]`);
  assert.equal(reopened.getAttribute('aria-expanded'),'false','group collapses');
  assert.equal(reopened.parentElement.querySelector('.sk-cards').classList.contains('hidden'),true);
  reopened.click();
  assert.equal(f.d.querySelector(`#skVisualView [data-group="${first.dataset.group}"]`).getAttribute('aria-expanded'),'true');

  f.d.querySelector('#skVisualView [data-card]').click();
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
 assert.equal(index.counts.registered,13);
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
 assert.equal(inkframe.lifecycle,'Candidate');
 assert.equal(inkframe.validation,'Partial');
});
