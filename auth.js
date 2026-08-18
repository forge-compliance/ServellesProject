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

async function loadServellesContext(user) {
  const { data: profile } = await servellesDb.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  SERVELLES_USER = { ...user, full_name: profile?.full_name || user.user_metadata?.full_name || user.email };

  if (typeof isPlatformAdmin === 'function' && await isPlatformAdmin(user.id)) {
    SERVELLES_ADMIN_MODE = true;
    SERVELLES_HOTEL = null;
    SERVELLES_MEMBERSHIP = { role: 'servelles_admin' };
    authScreen?.classList.add('hidden');
    await loadAdminDashboard();
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

/* Navigation recovery layer: keeps hotel sidebar links working independently of prototype handlers. */
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

/* Platform admin users module */
let SERVELLES_ADMIN_USERS = [];
let SERVELLES_ADMIN_USER_HOTELS = [];

function userEscape(value=''){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function ensureUsersStyles(){
  if(document.getElementById('servellesUsersStyles')) return;
  const style=document.createElement('style');
  style.id='servellesUsersStyles';
  style.textContent=`
    .users-toolbar{display:grid;grid-template-columns:minmax(220px,1.5fr) minmax(170px,.7fr) minmax(150px,.6fr);gap:12px;margin:22px 0 14px}
    .users-toolbar input,.users-toolbar select{width:100%;box-sizing:border-box;background:#111b24;border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:11px 12px}
    .users-summary{display:flex;gap:28px;align-items:center;padding:13px 0 18px;border-bottom:1px solid rgba(255,255,255,.1);color:#9eabb5;font-size:12px}
    .users-summary strong{font-family:'Cormorant Garamond',serif;font-size:26px;color:#d9a543;margin-right:5px}
    .users-table{display:grid;margin-top:8px}
    .users-head,.users-row{display:grid;grid-template-columns:minmax(190px,1.4fr) minmax(170px,1fr) minmax(160px,.8fr) minmax(145px,.75fr) 105px;gap:16px;align-items:center}
    .users-head{padding:13px 8px;color:#7f8d98;font-size:9px;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.11)}
    .users-row{padding:17px 8px;border-bottom:1px solid rgba(255,255,255,.08)}
    .users-person{display:flex;gap:12px;align-items:center;min-width:0}.users-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(216,162,62,.4);background:#111a21;color:#d9a543;font-weight:700;flex:0 0 auto}
    .users-person strong{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.users-person span{display:block;color:#8f9ca7;font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .users-row select{width:100%;box-sizing:border-box;background:#111b24;border:1px solid rgba(255,255,255,.12);color:#e9edef;border-radius:9px;padding:9px 10px;font-size:12px}
    .users-status{display:inline-flex;width:max-content;padding:6px 10px;border-radius:20px;background:#0b3823;color:#69e596;font-size:10px;font-weight:700}.users-status.off{background:#412426;color:#f39aa2}
    .users-toggle{border:1px solid rgba(216,162,62,.5);background:transparent;color:#e3b85e;border-radius:9px;padding:9px 10px;cursor:pointer;font-weight:700}.users-toggle.danger{border-color:#7e353d;color:#ef7b85}
    .users-empty{padding:32px;text-align:center;color:#8f9ca7}
    @media(max-width:900px){.users-toolbar{grid-template-columns:1fr}.users-head{display:none}.users-row{grid-template-columns:1fr;gap:10px;padding:18px 4px}.users-row>div:before{content:attr(data-label);display:block;color:#74818b;font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}}
  `;
  document.head.appendChild(style);
}

async function loadPlatformUsers(){
  const [profilesRes,membersRes,hotelsRes]=await Promise.all([
    servellesDb.from('profiles').select('id,full_name,email').order('full_name'),
    servellesDb.from('hotel_memberships').select('id,user_id,hotel_id,role,active'),
    servellesDb.from('hotels').select('id,name,active').order('name')
  ]);
  for(const result of [profilesRes,membersRes,hotelsRes]) if(result.error) throw result.error;
  SERVELLES_ADMIN_USER_HOTELS=hotelsRes.data||[];
  const profiles=new Map((profilesRes.data||[]).map(p=>[p.id,p]));
  const hotels=new Map(SERVELLES_ADMIN_USER_HOTELS.map(h=>[h.id,h]));
  SERVELLES_ADMIN_USERS=(membersRes.data||[]).map(m=>({
    ...m,
    profile:profiles.get(m.user_id)||{id:m.user_id,full_name:'Hotel user',email:''},
    hotel:hotels.get(m.hotel_id)||{id:m.hotel_id,name:'Unassigned'}
  })).sort((a,b)=>(a.profile.full_name||'').localeCompare(b.profile.full_name||''));
}

function renderUsersRows(){
  const box=document.getElementById('servellesUsersRows'); if(!box) return;
  const search=(document.getElementById('servellesUsersSearch')?.value||'').trim().toLowerCase();
  const hotelFilter=document.getElementById('servellesUsersHotelFilter')?.value||'';
  const statusFilter=document.getElementById('servellesUsersStatusFilter')?.value||'';
  const rows=SERVELLES_ADMIN_USERS.filter(u=>{
    const hay=`${u.profile.full_name||''} ${u.profile.email||''} ${u.hotel.name||''} ${u.role||''}`.toLowerCase();
    return (!search||hay.includes(search)) && (!hotelFilter||u.hotel_id===hotelFilter) && (!statusFilter||(statusFilter==='active'?u.active:!u.active));
  });
  document.getElementById('servellesUsersShown').textContent=rows.length;
  box.innerHTML=rows.map(u=>{
    const name=u.profile.full_name||u.profile.email||'Hotel user';
    const initialsText=initials(name);
    const hotelOptions=SERVELLES_ADMIN_USER_HOTELS.map(h=>`<option value="${h.id}" ${h.id===u.hotel_id?'selected':''}>${userEscape(h.name)}</option>`).join('');
    const roles=['hotel_admin','manager','department_manager','staff'];
    return `<div class="users-row">
      <div class="users-person" data-label="User"><div class="users-avatar">${userEscape(initialsText)}</div><div><strong>${userEscape(name)}</strong><span>${userEscape(u.profile.email||u.user_id)}</span></div></div>
      <div data-label="Hotel"><select onchange="servellesChangeUserHotel('${u.id}',this.value)">${hotelOptions}</select></div>
      <div data-label="Role"><select onchange="servellesChangeUserRole('${u.id}',this.value)">${roles.map(r=>`<option value="${r}" ${r===u.role?'selected':''}>${r.replaceAll('_',' ')}</option>`).join('')}</select></div>
      <div data-label="Status"><span class="users-status ${u.active?'':'off'}">${u.active?'ACTIVE':'DISABLED'}</span></div>
      <div data-label="Access"><button class="users-toggle ${u.active?'danger':''}" onclick="servellesToggleUser('${u.id}',${!u.active})">${u.active?'DISABLE':'ENABLE'}</button></div>
    </div>`;
  }).join('')||'<div class="users-empty">No users match those filters.</div>';
}

async function renderAdminUsersPage(){
  ensureUsersStyles();
  const overview=document.getElementById('adminOverview');
  const manager=document.getElementById('adminManager');
  manager?.classList.add('hidden'); overview?.classList.remove('hidden');
  document.querySelector('#adminOverview .admin-summary')?.style.setProperty('display','none');
  const hotelPanel=document.querySelector('#adminOverview .admin-panel:not(#adminUsersPanel):not(#adminPlaceholderPanel)'); if(hotelPanel) hotelPanel.style.display='none';
  document.getElementById('adminPlaceholderPanel')?.style.setProperty('display','none');
  let panel=document.getElementById('adminUsersPanel');
  if(!panel){ panel=document.createElement('section'); panel.id='adminUsersPanel'; panel.className='admin-panel'; overview.appendChild(panel); }
  panel.style.display='block';
  panel.innerHTML='<div class="users-empty">Loading users…</div>';
  try{
    await loadPlatformUsers();
    const activeCount=SERVELLES_ADMIN_USERS.filter(u=>u.active).length;
    panel.innerHTML=`
      <div class="admin-panel-head"><div><span class="small-label">SERVELLE\'S PLATFORM</span><h2>Users</h2></div></div>
      <div class="users-summary"><span><strong>${SERVELLES_ADMIN_USERS.length}</strong> total users</span><span><strong>${activeCount}</strong> active</span><span><strong id="servellesUsersShown">${SERVELLES_ADMIN_USERS.length}</strong> shown</span></div>
      <div class="users-toolbar"><input id="servellesUsersSearch" placeholder="Search name, email, hotel or role"><select id="servellesUsersHotelFilter"><option value="">All hotels</option>${SERVELLES_ADMIN_USER_HOTELS.map(h=>`<option value="${h.id}">${userEscape(h.name)}</option>`).join('')}</select><select id="servellesUsersStatusFilter"><option value="">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select></div>
      <div class="users-table"><div class="users-head"><div>User</div><div>Hotel</div><div>Role</div><div>Status</div><div>Access</div></div><div id="servellesUsersRows"></div></div>`;
    ['servellesUsersSearch','servellesUsersHotelFilter','servellesUsersStatusFilter'].forEach(id=>document.getElementById(id)?.addEventListener(id.includes('Search')?'input':'change',renderUsersRows));
    renderUsersRows();
  }catch(error){
    console.error(error); panel.innerHTML=`<div class="admin-panel-head"><div><span class="small-label">SERVELLE'S PLATFORM</span><h2>Users</h2></div></div><div class="users-empty">Could not load users: ${userEscape(error.message)}</div>`;
  }
}

async function servellesChangeUserRole(membershipId,role){
  const {error}=await servellesDb.from('hotel_memberships').update({role}).eq('id',membershipId);
  if(error) return alert(error.message);
  const row=SERVELLES_ADMIN_USERS.find(x=>x.id===membershipId); if(row) row.role=role;
  if(typeof toastAdmin==='function') toastAdmin('User role updated');
}

async function servellesChangeUserHotel(membershipId,hotelId){
  const {error}=await servellesDb.from('hotel_memberships').update({hotel_id:hotelId}).eq('id',membershipId);
  if(error) return alert(error.message);
  const row=SERVELLES_ADMIN_USERS.find(x=>x.id===membershipId); if(row){row.hotel_id=hotelId;row.hotel=SERVELLES_ADMIN_USER_HOTELS.find(h=>h.id===hotelId)||row.hotel;}
  if(typeof toastAdmin==='function') toastAdmin('User moved to hotel');
  renderUsersRows();
}

async function servellesToggleUser(membershipId,active){
  const row=SERVELLES_ADMIN_USERS.find(x=>x.id===membershipId); if(!row) return;
  const verb=active?'enable':'disable';
  if(!confirm(`${verb[0].toUpperCase()+verb.slice(1)} access for ${row.profile.full_name||row.profile.email||'this user'}?`)) return;
  const {error}=await servellesDb.from('hotel_memberships').update({active}).eq('id',membershipId);
  if(error) return alert(error.message);
  row.active=active;
  if(typeof toastAdmin==='function') toastAdmin(active?'User enabled':'User disabled');
  renderAdminUsersPage();
}

/* Capture Users before the generic admin placeholder handler. */
document.addEventListener('click',event=>{
  const button=event.target.closest('#servellesAdminNav button[data-admin-page="users"]');
  if(!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  document.querySelectorAll('#servellesAdminNav button').forEach(b=>b.classList.remove('active'));
  button.classList.add('active');
  renderAdminUsersPage();
},true);
