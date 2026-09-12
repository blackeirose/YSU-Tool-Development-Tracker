(() => {
  document.querySelector('.authbar')?.classList.add('legacy-authbar');
  const syncStatusEl = document.getElementById('syncStatus');
  if(syncStatusEl){
    const statusLine = document.createElement('div');
    statusLine.className = 'tracker-statusline';
    statusLine.append(syncStatusEl);
    document.querySelector('.sub')?.after(statusLine);
  }
  const footer = document.createElement('footer');
  footer.className = 'owner-footer';
  footer.innerHTML = `<span id="ownerModeState">Public read-only</span><span aria-hidden="true"> · </span><button type="button" id="ownerAccess" class="owner-button">Owner sign in</button>`;
  document.querySelector('.note')?.after(footer);
  const dialog = document.createElement('dialog');
  dialog.id = 'ownerDialog';
  dialog.className = 'owner-dialog';
  dialog.setAttribute('aria-labelledby','ownerDialogTitle');
  dialog.innerHTML = `
    <h2 id="ownerDialogTitle">Owner sign in</h2>
    <p>Sign in to edit Tracker data. Everyone can browse in read-only mode.</p>
    <form id="owner-form">
      <label for="owner-email">Email</label>
      <input id="owner-email" type="email" autocomplete="email" required />
      <div class="owner-dialog-actions"><button id="owner-send" type="submit" class="primary">Send sign-in code</button></div>
    </form>
    <form id="owner-code-form" hidden>
      <h3>Enter verification code</h3>
      <p>We sent a 6-digit code to <span id="owner-sent-email"></span>. Return here after reading your email.</p>
      <label for="owner-code">Verification code</label>
      <input id="owner-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required />
      <div class="owner-dialog-actions"><button id="owner-verify" type="submit" class="primary">Verify code</button></div>
      <div class="owner-dialog-actions"><button id="owner-resend" type="button" class="owner-button">Resend code</button><button id="owner-change-email" type="button" class="owner-button">Change email</button></div>
    </form>
    <p id="owner-message" class="owner-message" role="status" aria-live="polite"></p>
    <div class="owner-dialog-actions"><button id="owner-close" type="button" class="owner-button">Close</button></div>`;
  document.body.append(dialog);
  const access = document.getElementById('ownerAccess');
  const mode = document.getElementById('ownerModeState');
  const message = document.getElementById('owner-message');
  const otp = setupEmailOtp({
    dialog,loadClient:async()=>db,
    validateSession:async next=>{
      if(!next || session?.access_token !== next.access_token)return 'stale';
      if(!isOwner())return 'non-owner';
      dialog.close();
      return 'owner';
    }
  });
  let wasSignedIn=!!session;
  function applyOwnerUi(){
    const owner=isOwner();
    document.body.classList.toggle('owner-mode',owner);
    access.textContent=session?'Sign out':'Owner sign in';
    mode.textContent=owner?'Owner edit mode':session?'Owner access required':'Public read-only';
    mode.classList.toggle('owner-active',owner);
    if(wasSignedIn && !session){ otp.reset(); if(dialog.open)dialog.close(); }
    wasSignedIn=!!session;
  }
  access.addEventListener('click',async()=>{
    if(access.disabled)return;
    if(!session){otp.open();return;}
    access.disabled=true;
    try{ await signOut(); }
    catch(_){ message.textContent='Sign-out could not be completed. Editing is disabled; refresh to check your session and try again.';dialog.showModal(); }
    finally{access.disabled=false;}
  });
  // Keep hidden legacy controls on the same owner flow; never create users.
  document.getElementById('signInBtn').addEventListener('click',()=>access.click());
  document.getElementById('signOutBtn').addEventListener('click',()=>access.click());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  document.addEventListener('tracker-auth-change',applyOwnerUi);
  applyOwnerUi();
})();
