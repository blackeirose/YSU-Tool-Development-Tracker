/** Supabase verifies codes; this UI never stores them or grants owner access. */
function setupEmailOtp({dialog,loadClient,validateSession,now=()=>Date.now()}) {
 const form=document.getElementById('owner-form'),codeForm=document.getElementById('owner-code-form');
 const email=document.getElementById('owner-email'),code=document.getElementById('owner-code');
 const sentEmail=document.getElementById('owner-sent-email'),message=document.getElementById('owner-message');
 const send=document.getElementById('owner-send'),verify=document.getElementById('owner-verify');
 const resend=document.getElementById('owner-resend'),change=document.getElementById('owner-change-email');
 let pendingEmail='',busy=false,generation=0,resendAt=0,timer;
 const remaining=()=>Math.max(0,Math.ceil((resendAt-now())/1000));
 function controls(){
  const seconds=remaining();
  send.disabled=busy||seconds>0;resend.disabled=busy||seconds>0;verify.disabled=busy;change.disabled=busy;email.disabled=busy;code.readOnly=busy;
  send.textContent=seconds?`Send sign-in code (${seconds}s)`:'Send sign-in code';
  resend.textContent=seconds?`Resend in ${seconds}s`:'Resend code';
 }
 function watchCooldown(){clearInterval(timer);controls();if(remaining())timer=setInterval(()=>{controls();if(!remaining())clearInterval(timer);},1000);}
 function reset(){
  ++generation;busy=false;pendingEmail='';email.value='';code.value='';sentEmail.textContent='';
  form.hidden=false;codeForm.hidden=true;message.textContent='';clearInterval(timer);controls();
 }
 function open(){reset();watchCooldown();dialog.showModal();email.focus();}
 function sendError(error){
  return error?.status===429||String(error?.code).includes('rate_limit')?'Too many requests. Please wait before trying again.':'Could not send code. Check your email address and try again.';
 }
 async function requestCode(isResend=false){
  if(busy||remaining())return;
  if(!isResend&&!email.reportValidity())return;
  const target=isResend?pendingEmail:email.value.trim();if(!target)return;
  const current=++generation;busy=true;message.textContent='Sending code…';controls();
  try{
   const c=await loadClient();
   const {error}=await c.auth.signInWithOtp({email:target,options:{shouldCreateUser:false,emailRedirectTo:location.origin+'/'}});
   if(current!==generation)return;if(error)throw error;
   pendingEmail=target;sentEmail.textContent=target;code.value='';form.hidden=true;codeForm.hidden=false;
   resendAt=now()+60000;message.textContent='Code sent. Enter it here; no email link is needed.';code.focus();
  }catch(error){
   if(current!==generation)return;
   if(error?.status===429||String(error?.code).includes('rate_limit'))resendAt=now()+60000;
   message.textContent=sendError(error);
  }finally{if(current===generation){busy=false;watchCooldown();}}
 }
 form.addEventListener('submit',event=>{event.preventDefault();void requestCode();});
 resend.addEventListener('click',()=>void requestCode(true));
 change.addEventListener('click',()=>{
  if(busy)return;++generation;pendingEmail='';code.value='';sentEmail.textContent='';form.hidden=false;codeForm.hidden=true;message.textContent='';email.focus();controls();
 });
 code.addEventListener('input',()=>{code.value=code.value.replace(/[^0-9]/g,'').slice(0,6);});
 code.addEventListener('paste',event=>{
  const text=event.clipboardData?.getData('text')??'';
  // Preserve leading zeroes; permit a copied code with surrounding spaces.
  const digits=text.replace(/\s/g,'');
  if(/^[0-9]{6}$/.test(digits)){event.preventDefault();code.value=digits;}
 });
 codeForm.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!pendingEmail)return;
  if(!/^[0-9]{6}$/.test(code.value)){message.textContent='Enter the 6-digit code.';code.focus();return;}
  const current=++generation;busy=true;message.textContent='Verifying code…';controls();
  try{
   const c=await loadClient();
   const {data,error}=await c.auth.verifyOtp({email:pendingEmail,token:code.value,type:'email'});
   if(current!==generation)return;code.value='';if(error)throw error;
   if(!data?.session)throw new Error('No session');
   const result=await validateSession(data.session);
   if(current!==generation)return;
   reset();form.hidden=true;codeForm.hidden=true;
   if(result==='stale')message.textContent='Sign-in state changed. Close and try again.';
   else if(result==='non-owner')message.textContent='This account does not have owner access.';
   else if(result!=='owner')message.textContent='Signed in, but owner access could not be confirmed. Close and refresh to try again.';
  }catch(error){
   if(current!==generation)return;
   code.value='';
   if(error?.status===429||String(error?.code).includes('rate_limit'))message.textContent='Too many attempts. Please wait before trying again.';
   else if(error?.code==='otp_expired'||error?.status===400||error?.status===403)message.textContent='Invalid or expired code. Try again or request a new code.';
   else message.textContent='Could not verify code. Check your connection and try again.';
   code.focus();
  }finally{if(current===generation){busy=false;controls();}}
 });
 dialog.addEventListener('close',reset);
 document.getElementById('owner-close').addEventListener('click',()=>dialog.close());
 return {open,reset};
}
