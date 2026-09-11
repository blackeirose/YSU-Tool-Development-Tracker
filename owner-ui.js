(() => {
  const OWNER_USER_ID = '38531f7e-e05e-473a-a587-500b1d3aebe5';
  const OWNER_REDIRECT_URL = 'https://tracker.ycsu.cc/';

  // Match MAIN: owner authority is the verified Supabase user id, not a client-side email string.
  isOwner = function(){
    return !!session &&
      session.user?.id === OWNER_USER_ID &&
      !!session.user?.email_confirmed_at &&
      !session.user?.is_anonymous;
  };
  canEdit = function(){ return isOwner(); };

  const legacyAuth = document.querySelector('.authbar');
  legacyAuth?.classList.add('legacy-authbar');

  const syncStatusEl = document.getElementById('syncStatus');
  if(syncStatusEl){
    const statusLine = document.createElement('div');
    statusLine.className = 'tracker-statusline';
    statusLine.append(syncStatusEl);
    document.querySelector('.sub')?.after(statusLine);
  }

  const footer = document.createElement('footer');
  footer.className = 'owner-footer';
  footer.innerHTML = `
    <span id="ownerModeState">Public read-only</span>
    <span aria-hidden="true"> · </span>
    <button type="button" id="ownerAccess" class="owner-button">Owner sign in</button>
  `;
  document.querySelector('.note')?.after(footer);

  const dialog = document.createElement('dialog');
  dialog.id = 'ownerDialog';
  dialog.className = 'owner-dialog';
  dialog.setAttribute('aria-labelledby','ownerDialogTitle');
  dialog.innerHTML = `
    <h2 id="ownerDialogTitle">Owner sign in</h2>
    <p>Sign in to edit Tracker data. Everyone else can browse the current cloud Tracker in read-only mode.</p>
    <form id="ownerForm">
      <label for="ownerEmail">Email</label>
      <input id="ownerEmail" type="email" autocomplete="email" required />
      <div class="owner-dialog-actions">
        <button type="button" id="ownerClose" class="owner-button">Cancel</button>
        <button type="submit" class="primary">Send sign-in link</button>
      </div>
    </form>
    <p id="ownerMessage" class="owner-message" role="status" aria-live="polite"></p>
  `;
  document.body.append(dialog);

  const ownerAccess = document.getElementById('ownerAccess');
  const ownerModeState = document.getElementById('ownerModeState');
  const ownerForm = document.getElementById('ownerForm');
  const ownerEmail = document.getElementById('ownerEmail');
  const ownerMessage = document.getElementById('ownerMessage');
  const ownerClose = document.getElementById('ownerClose');

  function applyOwnerUi(nextSession = session){
    if(nextSession !== undefined) session = nextSession;
    const signedIn = !!session;
    const owner = isOwner();
    document.body.classList.toggle('owner-mode', owner);
    ownerAccess.textContent = signedIn ? 'Sign out' : 'Owner sign in';
    ownerModeState.textContent = owner ? 'Owner edit mode' : (signedIn ? 'Owner access required' : 'Public read-only');
    ownerModeState.classList.toggle('owner-active', owner);
    try { render(); } catch(_){ }
  }

  ownerAccess.addEventListener('click', async () => {
    ownerAccess.disabled = true;
    try{
      const { data } = await db.auth.getSession();
      session = data.session;
      if(session){
        await db.auth.signOut({ scope:'local' });
        session = null;
        ownerMessage.textContent = '';
        applyOwnerUi(null);
      }else{
        ownerMessage.textContent = '';
        dialog.showModal();
      }
    }catch(_){
      ownerMessage.textContent = 'Owner access is temporarily unavailable. Please try again.';
      if(!dialog.open) dialog.showModal();
    }finally{
      ownerAccess.disabled = false;
    }
  });

  ownerClose.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if(event.target === dialog) dialog.close();
  });

  ownerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = ownerForm.querySelector('[type="submit"]');
    submit.disabled = true;
    ownerMessage.textContent = 'Sending sign-in link…';
    try{
      const { error } = await db.auth.signInWithOtp({
        email: ownerEmail.value.trim(),
        options:{ shouldCreateUser:false, emailRedirectTo:OWNER_REDIRECT_URL },
      });
      if(error) throw error;
      ownerMessage.textContent = 'Check your email for a sign-in link. Open it to return here and enable owner editing.';
    }catch(_){
      ownerMessage.textContent = 'Unable to send a sign-in link. Use the authorized owner account or try again later.';
    }finally{
      submit.disabled = false;
    }
  });

  db.auth.onAuthStateChange((_event, nextSession) => {
    setTimeout(() => applyOwnerUi(nextSession), 0);
  });

  void db.auth.getSession().then(({data}) => applyOwnerUi(data.session)).catch(() => applyOwnerUi(null));
})();
