const servellesDb = window.supabase.createClient(
  window.SERVELLES_SUPABASE_URL,
  window.SERVELLES_SUPABASE_PUBLISHABLE_KEY
);

let SERVELLES_USER = null;
let SERVELLES_HOTEL = null;
let SERVELLES_MEMBERSHIP = null;

const authScreen = document.getElementById('authScreen');
const appShell = document.querySelector('.app-shell');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

function setLoginMessage(message, isError = false) {
  if (!loginMessage) return;
  loginMessage.textContent = message || '';
  loginMessage.classList.toggle('auth-error', isError);
}

function initials(name) {
  return (name || 'S').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
}

function forceAdminLogo(){
  const shell=document.getElementById('adminShell');
  if(!shell) return;
  let img=document.getElementById('servellesAdminLogoImg');
  if(!img){
    img=document.createElement('img');
    img.id='servellesAdminLogoImg';
    img.alt="Servelle's Guest Services";
    img.src='servelles-logo.png?v=083';
    shell.appendChild(img);
  }
  img.style.cssText='position:fixed!important;left:20px!important;top:14px!important;width:215px!important;height:135px!important;object-fit:contain!important;display:block!important;visibility:visible!important;opacity:1!important;z-index:99999!important;pointer-events:none!important;background:transparent!important;';
}

async function loadServellesContext(user) {
  const { data: profile } = await servellesDb.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  SERVELLES_USER = { ...user, full_name: profile?.full_name || user.user_metadata?.full_name || user.email };

  if (typeof isPlatformAdmin === 'function' && await isPlatformAdmin(user.id)) {
    SERVELLES_ADMIN_MODE = true;
    SERVELLES_HOTEL = null;
    SERVELLES_MEMBERSHIP = { role: 'servelles_admin' };
    authScreen?.classList.add('hidden');
    await loadAdminDashboard();
    forceAdminLogo();
    setTimeout(forceAdminLogo,100);
    setTimeout(forceAdminLogo,500);
    return;
  }

  SERVELLES_ADMIN_MODE = false;
  const { data: membership, error: membershipError } = await servellesDb
    .from('hotel_memberships')
    .select('id,hotel_id,role,active,hotels(id,name,short_name,slug,active)')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership || !membership.hotels) throw new Error('Your account is not assigned to a hotel yet.');

  SERVELLES_MEMBERSHIP = membership;
  SERVELLES_HOTEL = membership.hotels;

  const hotelName = document.querySelector('.hotel-name');
  const hotelSub = document.querySelector('.hotel-sub');
  const hotelLogo = document.querySelector('.hotel-logo');
  const eyebrow = document.querySelector('.topbar .eyebrow');
  const profileBubble = document.querySelector('.profile');
  const returnAdminBtn = document.getElementById('returnAdminBtn');

  if (hotelName) hotelName.textContent = SERVELLES_HOTEL.name.toUpperCase();
  if (hotelSub) hotelSub.textContent = membership.role.replaceAll('_',' ').toUpperCase();
  if (hotelLogo) hotelLogo.textContent = '';
  if (eyebrow) eyebrow.textContent = `Welcome, ${SERVELLES_USER.full_name}`;
  if (profileBubble) profileBubble.textContent = '';
  if (returnAdminBtn) returnAdminBtn.classList.add('hidden');

  document.getElementById('adminShell')?.classList.add('hidden');
  authScreen?.classList.add('hidden');
  appShell?.classList.remove('auth-locked');
}

async function showSignedOut() {
  SERVELLES_USER = SERVELLES_HOTEL = SERVELLES_MEMBERSHIP = null;
  SERVELLES_ADMIN_MODE = false;
  document.getElementById('adminShell')?.classList.add('hidden');
  appShell?.classList.add('auth-locked');
  authScreen?.classList.remove('hidden');
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const button = document.getElementById('loginButton');
  button.disabled = true;
  setLoginMessage('Signing in…');
  const { data, error } = await servellesDb.auth.signInWithPassword({ email, password });
  button.disabled = false;
  if (error) return setLoginMessage(error.message, true);
  try {
    await loadServellesContext(data.user);
    setLoginMessage('');
  } catch (err) {
    await servellesDb.auth.signOut();
    setLoginMessage(err.message, true);
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await servellesDb.auth.signOut();
});

servellesDb.auth.onAuthStateChange(async (event, session) => {
  if (!session?.user) return showSignedOut();
  try { await loadServellesContext(session.user); }
  catch (err) { setLoginMessage(err.message, true); await showSignedOut(); }
});

(async function bootAuth(){
  const { data } = await servellesDb.auth.getSession();
  if (data.session?.user) {
    try { await loadServellesContext(data.session.user); }
    catch (err) { setLoginMessage(err.message, true); await showSignedOut(); }
  } else await showSignedOut();
})();

/* Navigation recovery layer: keeps sidebar links working independently of prototype handlers. */
function servellesOpenView(name){
  const direct = ['home','new','active','orders','departments','completed'];
  const target = direct.includes(name) ? name : 'placeholder';
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
  document.getElementById(target+'View')?.classList.add('active-view');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.nav===name));
  if(target==='placeholder'){
    const titles={conversations:'Conversations',guests:'Guest Directory',reports:'Reports & Service Levels',team:'Team',settings:'Settings'};
    const title=document.getElementById('placeholderTitle');
    const copy=document.getElementById('placeholderCopy');
    if(title) title.textContent=titles[name]||'Coming Soon';
    if(copy) copy.textContent='Reserved for the connected-data build. The operational request, department and room-service flows are live in this prototype.';
  }
  try{
    if(['new','active','completed'].includes(name) && typeof renderLists==='function') renderLists();
    if(name==='orders' && typeof renderOrders==='function') renderOrders();
    if(name==='departments' && typeof renderDepartments==='function') renderDepartments();
  }catch(e){ console.warn('Servelles view render warning',e); }
}

document.addEventListener('click',event=>{
  const button=event.target.closest('.nav-item');
  if(!button || !document.querySelector('.app-shell')?.contains(button)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  servellesOpenView(button.dataset.nav||'home');
},true);
