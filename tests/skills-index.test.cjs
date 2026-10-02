const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

// Phase 2: the generator must prefer explicit Tracker Metadata, fall back to the
// deterministic legacy parser, and never let an out-of-contract or invented
// value reach skills.json. The fixture registry exercises one branch per Skill.
function generate(source){
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'skills-index-')),'skills.json');
 execFileSync(process.execPath,['tools/generate-skills-index.mjs',source,out],{stdio:'pipe'});
 return JSON.parse(fs.readFileSync(out,'utf8'));
}
const fixture=generate('tests/fixtures/registry-explicit.md');
const live=JSON.parse(fs.readFileSync('skills.json','utf8'));
const byId=(index,id)=>index.skills.find(s=>s.id===id);
const LIFECYCLES=['Candidate','Draft','Approved','Retired'];
const VALIDATIONS=['Untested','Partial','Validated'];

const legacy=byId(fixture,'YSU-SKILL-001');   // no metadata block at all
const explicit=byId(fixture,'YSU-SKILL-002'); // every field stated, contradicting the derivation
const locator=byId(fixture,'YSU-SKILL-003');  // explicit locator, no URL
const broken=byId(fixture,'YSU-SKILL-004');   // every field out of contract
const pending=byId(fixture,'YSU-PENDING-001');

test('explicit Lifecycle overrides the derived lifecycle',()=>{
 // v1.2.3 would derive Approved; the block says Candidate.
 assert.equal(explicit.lifecycle,'Candidate');
 assert.equal(explicit.metadata_source.lifecycle,'explicit');
 assert.equal(legacy.lifecycle,'Approved');
 assert.equal(legacy.metadata_source.lifecycle,'derived');
});

test('explicit Validation overrides the heuristic validation',()=>{
 // The row carries both 通過 and 未驗證, which derives Partial.
 assert.equal(explicit.validation,'Validated');
 assert.equal(explicit.metadata_source.validation,'explicit');
 assert.equal(legacy.validation,'Partial');
});

test('explicit Category overrides category inference',()=>{
 // "Film Helper／電影敘事" infers FILM; the block says STYLE.
 assert.equal(explicit.category,'STYLE');
 assert.equal(explicit.metadata_source.category,'explicit');
 assert.equal(legacy.category,'ENGINEERING / SIMULATION');
});

test('explicit Version overrides semver extraction',()=>{
 assert.equal(explicit.version,'0.4.0');
 assert.equal(explicit.metadata_source.version,'explicit');
 assert.match(explicit.version_note,/1\.2\.3/,'the raw registry cell is still preserved');
 assert.equal(legacy.version,'1.1.0');
});

test('explicit Graphic References parses as a count',()=>{
 assert.equal(explicit.graphic_reference_count,7);
 assert.equal(explicit.metadata_source.graphic_reference_count,'explicit');
 assert.equal(pending.graphic_reference_count,2);
});

test('explicit platform states override the derived ones',()=>{
 assert.deepEqual(explicit.platform,{drive:'ARCHIVED',chatgpt:'INSTALLED',codex:'INSTALLED_RECORDED'});
 assert.equal(explicit.metadata_source['platform.chatgpt'],'explicit');
 assert.deepEqual(legacy.platform,{drive:'ARCHIVED',chatgpt:'UNVERIFIED',codex:'UNVERIFIED'});
});

test('explicit Origin Project and Origin Conversation parse',()=>{
 assert.equal(explicit.origin_project,'建築敘事影片專案專用');
 assert.equal(explicit.origin_conversation,'建築敘事影片構想');
 assert.equal(legacy.origin_conversation,null);
});

test('a real conversation URL produces DIRECT_LINK',()=>{
 assert.equal(explicit.origin_conversation_url,'https://chatgpt.com/c/fixture-conversation-0002');
 assert.equal(explicit.locator_status,'DIRECT_LINK');
});

test('a missing URL never produces a fake DIRECT_LINK',()=>{
 // The block claims DIRECT_LINK but states no URL: it must be downgraded.
 assert.equal(broken.origin_conversation_url,null);
 assert.notEqual(broken.locator_status,'DIRECT_LINK');
 assert.equal(broken.locator_status,'UNLOCATED');
 assert.ok(fixture.warnings.some(w=>w.includes('DIRECT_LINK has no Origin Conversation URL')));
 for(const skill of [...fixture.skills,...live.skills])
  if(skill.locator_status==='DIRECT_LINK') assert.ok(skill.origin_conversation_url,`${skill.id} claims DIRECT_LINK without a URL`);
});

test('an explicit Locator Status without a URL is respected as written',()=>{
 assert.equal(locator.locator_status,'PROJECT_TITLE_ONLY');
 assert.equal(locator.metadata_source.locator_status,'explicit');
 assert.equal(locator.origin_conversation_url,null);
});

test('Canonical Drive is parsed and beats the derived folder',()=>{
 assert.equal(explicit.canonical_drive,'https://drive.google.com/drive/folders/1FixtureExplicitFolderIdAaaaaa');
 assert.ok(explicit.links.some(l=>l.url===explicit.canonical_drive),'canonical folder is linkable');
 assert.equal(legacy.canonical_drive,'https://drive.google.com/drive/folders/1FixtureLegacyFolderIdAaaaaaaaaa');
});

test('explicit Next Action beats the legacy 下一步 line',()=>{
 assert.equal(explicit.next_action,'Run the SFDOT live pilot');
 assert.equal(legacy.next_action,'保留為 legacy 解析案例。');
});

test('out-of-contract explicit values are rejected, warned about and never written',()=>{
 assert.ok(LIFECYCLES.includes(broken.lifecycle));
 assert.ok(VALIDATIONS.includes(broken.validation));
 assert.equal(broken.version,'0.9.0','invalid Version fell back to the registry cell');
 assert.equal(broken.graphic_reference_count,0);
 assert.equal(broken.platform.codex,'NOT_INSTALLED');
 assert.equal(broken.canonical_drive,null);
 for(const field of ['Lifecycle','Validation','Version','Graphic References','Origin Conversation URL','Canonical Drive'])
  assert.ok(fixture.warnings.some(w=>w.includes(field)),`warned about ${field}`);
 assert.equal(broken.metadata_source.lifecycle,'derived');
});

test('a pending candidate reads explicit metadata too',()=>{
 assert.equal(pending.registered,false);
 assert.equal(pending.lifecycle,'Draft');
 assert.equal(pending.validation,'Partial');
 assert.equal(pending.next_action,'等待使用者授權開始 Pending 批次處理');
 assert.equal(pending.has_explicit_metadata,true);
});

test('legacy entries with no metadata block still parse completely',()=>{
 assert.equal(legacy.has_explicit_metadata,false);
 assert.ok(Object.values(legacy.metadata_source).every(v=>v==='derived'));
 for(const field of ['name','slug','category','lifecycle','validation','version','canonical_drive'])
  assert.ok(legacy[field],`${field} still derived`);
});

test('the live index includes the SSF-B02 rules approval independently from image validation',()=>{
 assert.equal(live.counts.registered,21);
 assert.equal(live.counts.pending,1);
 assert.equal(live.counts.total,22);
 // SSF-B02 has explicit metadata; the original 13 entries remain derived.
 assert.equal(live.counts.with_explicit_metadata,8);
 assert.deepEqual(live.warnings,[]);
 for(const id of ['014','015','016','017','020','021']){
  const s=live.skills.find(s=>s.id==='YSU-SKILL-'+id);
  assert.equal(s.lifecycle,'Approved');assert.equal(s.validation,'Partial');assert.equal(s.version,'1.0.0');
 }
 for(const id of ['019']){
  const s=live.skills.find(s=>s.id==='YSU-SKILL-'+id);
  assert.equal(s.lifecycle,'Draft');assert.equal(s.validation,'Partial');
 }
 const revised=byId(live,'YSU-SKILL-018');
 assert.equal(revised.lifecycle,'Approved');assert.equal(revised.validation,'Untested');assert.equal(revised.version,'0.2.0');
 assert.match(revised.name,/靜觀人境攝影/);
 assert.equal(live.metadata_contract.version,'v1');
 assert.deepEqual(live.metadata_contract.precedence,
  ['explicit Tracker Metadata block','deterministic legacy parser','null / Unknown']);
 for(const s of live.skills){
  assert.ok(LIFECYCLES.includes(s.lifecycle),`${s.id} lifecycle`);
  assert.ok(VALIDATIONS.includes(s.validation),`${s.id} validation`);
  assert.equal(s.has_explicit_metadata,/^YSU-SKILL-(014|015|016|017|018|019|020|021)$/.test(s.id));
 }
});

test('regenerating the live index from its committed source is reproducible',()=>{
 const again=generate('skills-source/00_SKILL_REGISTRY.md');
 const strip=i=>JSON.stringify({...i,generated_at:null,source:{...i.source,file:null}});
 assert.equal(strip(again),strip(live),'skills.json matches a fresh run of the generator');
});
