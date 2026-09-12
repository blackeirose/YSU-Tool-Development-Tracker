const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const owner={access_token:'test-owner-token',user:{id:'38531f7e-e05e-473a-a587-500b1d3aebe5',email:'owner@example.invalid',email_confirmed_at:'2026-01-01',is_anonymous:false}};
const other={access_token:'test-other-token',user:{id:'other-user',email:'owner@example.invalid',email_confirmed_at:'2026-01-01'}};
const tick=()=>new Promise(r=>setTimeout(r,20));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
function fixture(options={}){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://tracker.example.invalid/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 let listeners=[],sent=[],verified=[],writes=[],clock=0;
 w.Date.now=()=>clock;w.confirm=()=>true;w.alert=()=>{};
 const record={id:'fixture-row',name:'Fixture tool',status:'Planning',priority:'Medium',github:'Required',resource:'Manual',progress:0,links:[],sort_order:10};
 const auth={getSession:()=>options.hydration?.promise??Promise.resolve({data:{session:options.initial??null}}),onAuthStateChange:cb=>{listeners.push(cb);return {data:{subscription:{unsubscribe(){}}}}},signInWithOtp:async input=>{sent.push(input);return options.sendResult??{error:null}},verifyOtp:async input=>{verified.push(input);if(options.verify)return options.verify(emit);emit('SIGNED_IN',options.identity??owner);return {data:{session:options.identity??owner},error:null}},signOut:async()=>{if(options.logout)return options.logout.promise;emit('SIGNED_OUT',null);return {error:null}}};
 function emit(event,value){for(const cb of listeners)cb(event,value)}
 w.supabase={createClient:()=>({auth,from:()=>({select:()=>({order:()=>({order:async()=>options.offline?{error:new Error('fixture offline')}:{data:[{...record}],error:null}})}),update:payload=>{writes.push(payload);return {eq:()=>({select:()=>({single:async()=>({data:{...record,...payload},error:null})})})}},insert:payload=>{writes.push(payload);return {select:()=>({single:async()=>({data:{...record,...payload},error:null})})}},delete:()=>{writes.push('delete');return {eq:async()=>({error:null})}}})})};
 if(options.offline){w.console.error=()=>{};w.localStorage.setItem('ysu-tool-development-tracker-v13',JSON.stringify([record]));}
 for(const file of ['app.js','email-otp.js','owner-ui.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
 const get=id=>d.getElementById(id),submit=id=>get(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 return {dom,w,d,get,submit,emit,sent,verified,writes,setClock:n=>clock=n,close:()=>w.close(),request:async()=>{get('ownerAccess').click();get('owner-email').value='owner@example.invalid';submit('owner-form');await tick();}};
}

test('guest read-only, one six-digit request, leading-zero paste and owner capabilities',async()=>{
 const f=fixture();try{await tick();assert.equal(f.d.querySelectorAll('#rows tr').length,1);assert.equal(f.w.eval('canEdit()'),false);assert.equal(f.d.querySelectorAll('[contenteditable="true"]').length,0);
 await f.request();assert.equal(f.sent.length,1);assert.deepEqual(JSON.parse(JSON.stringify(f.sent[0])),{email:'owner@example.invalid',options:{shouldCreateUser:false,emailRedirectTo:'https://tracker.example.invalid/'}});
 const code=f.get('owner-code');assert.equal(code.maxLength,6);assert.equal(code.inputMode,'numeric');assert.equal(code.autocomplete,'one-time-code');assert.equal(f.get('owner-resend').disabled,true);
 f.submit('owner-form');assert.equal(f.sent.length,1);
 const paste=new f.w.Event('paste',{cancelable:true});Object.defineProperty(paste,'clipboardData',{value:{getData:()=> ' 012 345 '}});code.dispatchEvent(paste);assert.equal(code.value,'012345');f.submit('owner-code-form');await tick();
 assert.equal(f.verified[0].token,'012345');assert.equal(f.verified[0].type,'email');assert.equal(f.get('ownerDialog').open,false);assert.equal(f.w.eval('canEdit()'),true);assert.equal(f.get('ownerModeState').textContent,'Owner edit mode');
 f.get('cardViewBtn').click();assert.equal(f.d.querySelectorAll('.task-card[draggable="true"]').length,1);f.get('tableViewBtn').click();const name=f.d.querySelector('[data-key="name"][contenteditable]');name.textContent='Edited fixture';name.dispatchEvent(new f.w.Event('blur'));await tick();assert.equal(f.writes.length,1);assert.equal(f.writes[0].name,'Edited fixture');
 }finally{f.close()}
});

test('newer sign-out beats initial session hydration and closes stale editors immediately',async()=>{
 const h=deferred(),f=fixture({hydration:h});try{f.emit('SIGNED_OUT',null);h.resolve({data:{session:owner}});await tick();assert.equal(f.w.eval('canEdit()'),false);
 f.emit('SIGNED_IN',owner);await tick();f.w.eval('openDetail(0);openLinksEditor(0)');const stale=f.d.querySelector('[data-detail-key="name"]');assert.equal(stale.disabled,false);
 f.emit('SIGNED_OUT',null);assert.equal(f.get('detailBackdrop').classList.contains('open'),false);assert.equal(f.get('linksModal').classList.contains('open'),false);stale.value='Unauthorized';stale.dispatchEvent(new f.w.Event('change'));stale.dispatchEvent(new f.w.Event('blur'));f.get('saveLinks').click();await tick();assert.equal(f.writes.length,0);assert.equal(f.w.eval('tools[0].name'),'Fixture tool');assert.equal(f.d.querySelectorAll('[contenteditable="true"]').length,0);
 }finally{f.close()}
});

test('logout revokes before pending network and late OTP never resurrects owner',async()=>{
 const verification=deferred(),logout=deferred(),f=fixture({verify:emit=>{emit('SIGNED_IN',owner);return verification.promise},logout});try{await tick();await f.request();f.get('owner-code').value='012345';f.submit('owner-code-form');await tick();assert.equal(f.w.eval('canEdit()'),true);
 f.get('ownerAccess').click();assert.equal(f.w.eval('canEdit()'),false);assert.equal(f.get('ownerModeState').textContent,'Public read-only');f.emit('TOKEN_REFRESHED',owner);assert.equal(f.w.eval('canEdit()'),false);verification.resolve({data:{session:owner},error:null});await tick();assert.equal(f.w.eval('canEdit()'),false);logout.resolve({error:null});await tick();
 }finally{f.close()}
});

test('non-owner identity cannot edit even with owner email or local fallback',async()=>{
 const f=fixture({offline:true,identity:other});try{await tick();assert.equal(f.w.eval('source'),'local');assert.equal(f.w.eval('canEdit()'),false);await f.request();f.get('owner-code').value='012345';f.submit('owner-code-form');await tick();assert.equal(f.w.eval('canEdit()'),false);assert.match(f.get('owner-message').textContent,/does not have owner access/);await f.w.eval('persistIndex(0);deleteIndex(0)');assert.equal(f.writes.length,0);assert.equal(f.w.eval('tools.length'),1);
 }finally{f.close()}
});

test('bad/expired codes, rate limits, network and resend cooldown stay recoverable',async()=>{
 for(const error of [{status:400},{code:'otp_expired'},{status:429},new Error('network')]){const f=fixture({verify:async()=>({error})});try{await tick();await f.request();f.get('owner-code').value='12345';f.submit('owner-code-form');assert.equal(f.verified.length,0);f.get('owner-code').value='123456';f.submit('owner-code-form');await tick();assert.equal(f.w.eval('canEdit()'),false);assert.equal(f.get('owner-code').value,'');assert.ok(f.get('owner-message').textContent);assert.equal(f.get('owner-verify').disabled,false);f.get('owner-change-email').click();assert.equal(f.get('owner-code-form').hidden,true);assert.equal(f.get('owner-send').disabled,true);f.setClock(60000);await new Promise(r=>setTimeout(r,1050));assert.equal(f.get('owner-send').disabled,false);}finally{f.close()}}
});

test('owner hydration persists, close clears code and legacy sign-in uses same no-signup flow',async()=>{
 const f=fixture({initial:owner});try{await tick();assert.equal(f.w.eval('canEdit()'),true);assert.equal(f.get('ownerModeState').textContent,'Owner edit mode');f.emit('SIGNED_OUT',null);f.get('signInBtn').click();assert.equal(f.get('ownerDialog').open,true);f.get('owner-email').value='owner@example.invalid';f.submit('owner-form');await tick();assert.equal(f.sent[0].options.shouldCreateUser,false);f.get('owner-code').value='123456';f.get('owner-close').click();assert.equal(f.get('owner-code').value,'');assert.equal(f.get('owner-email').value,'');assert.equal(f.verified.length,0);}finally{f.close()}
});


test('delayed guest hydration keeps an already-open OTP form intact',async()=>{
 const h=deferred(),f=fixture({hydration:h});try{f.get('ownerAccess').click();f.get('owner-email').value='owner@example.invalid';h.resolve({data:{session:null}});await tick();assert.equal(f.get('ownerDialog').open,true);assert.equal(f.get('owner-email').value,'owner@example.invalid');f.emit('INITIAL_SESSION',null);assert.equal(f.get('ownerDialog').open,true);assert.equal(f.get('owner-email').value,'owner@example.invalid');}finally{f.close()}
});
