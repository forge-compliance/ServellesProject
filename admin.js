let SERVELLES_ADMIN_MODE = false;
let ADMIN_HOTELS = [];
let ADMIN_MEMBERSHIPS = [];
let ADMIN_PROFILES = [];
let ADMIN_DEPARTMENTS = [];
let ADMIN_ROOMS = [];
let ADMIN_CURRENT_HOTEL = null;

async function isPlatformAdmin(){
  const { data, error } = await servellesDb.rpc('is_servelles_admin');
  if(error) throw error;
  return data === true;
}

function adminEscape(value=''){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadAdminData(){
  const [hotelsRes,membersRes,profilesRes,deptsRes,roomsRes] = await Promise.all([
    servellesDb.from('hotels').select('*').order('name'),
    servellesDb.from('hotel_memberships').select('*'),
    servellesDb.from('profiles').select('id,full_name'),
    servellesDb.from('departments').select('*').order('name'),
    servellesDb.from('rooms').select('*').order('room_number')
  ]);
  for(const r of [hotelsRes,membersRes,profilesRes,deptsRes,roomsRes]) if(r.error) throw r.error;
  ADMIN_HOTELS = hotelsRes.data || [];
  ADMIN_MEMBERSHIPS = membersRes.data || [];
  ADMIN_PROFILES = profilesRes.data || [];
  ADMIN_DEPARTMENTS = deptsRes.data || [];
  ADMIN_ROOMS = roomsRes.data || [];
}

async function loadAdminDashboard(){
  await loadAdminData();
  const adminShell = document.getElementById('adminShell');
  const appShell = document.querySelector('.app-shell');
  const authScreen = document.getElementById('authScreen');
  const adminUser = document.getElementById('adminUser');
  if(adminUser) adminUser.textContent = SERVELLES_USER?.full_name || SERVELLES_USER?.email || 'Servelles Admin';
  document.getElementById('adminHotelCount').textContent = ADMIN_HOTELS.length;
  document.getElementById('adminUserCount').textContent = ADMIN_MEMBERSHIPS.filter(x=>x.active).length;
  document.getElementById('adminDeptCount').textContent = ADMIN_DEPARTMENTS.filter(x=>x.active).length;
  document.getElementById('adminRoomCount').textContent = ADMIN_ROOMS.filter(x=>x.active).length;
  const grid = document.getElementById('adminHotelGrid');
  grid.innerHTML = ADMIN_HOTELS.map(h=>{
    const users = ADMIN_MEMBERSHIPS.filter(x=>x.hotel_id===h.id && x.active).length;
    const depts = ADMIN_DEPARTMENTS.filter(x=>x.hotel_id===h.id && x.active).length;
    const roomCount = ADMIN_ROOMS.filter(x=>x.hotel_id===h.id && x.active).length;
    return `<article class="hotel-admin-card"><div class="hotel-admin-card-head"><div><span class="small-label">HOTEL ACCOUNT</span><h3>${adminEscape(h.name)}</h3></div><span class="admin-pill ${h.active?'':'off'}">${h.active?'ACTIVE':'PAUSED'}</span></div><div class="hotel-admin-meta"><div><span>Users</span><strong>${users}</strong></div><div><span>Departments</span><strong>${depts}</strong></div><div><span>Rooms</span><strong>${roomCount}</strong></div></div><div class="hotel-admin-actions"><button class="secondary-btn" onclick="enterHotelAsAdmin('${h.id}')">OPEN HOTEL</button><button class="primary-btn" onclick="adminHotelInfo('${h.id}')">MANAGE</button></div></article>`;
  }).join('') || '<div class="admin-empty">No hotels have been created yet.</div>';
  document.getElementById('adminManager')?.classList.add('hidden');
  document.getElementById('adminOverview')?.classList.remove('hidden');
  document.getElementById('returnAdminBtn')?.classList.add('hidden');
  authScreen?.classList.add('hidden');
  appShell?.classList.add('auth-locked');
  adminShell?.classList.remove('hidden');
}

async function enterHotelAsAdmin(hotelId){
  const {data:hotel,error} = await servellesDb.from('hotels').select('*').eq('id',hotelId).single();
  if(error) return alert(error.message);
  SERVELLES_HOTEL = hotel; SERVELLES_MEMBERSHIP = {role:'servelles_admin',hotel_id:hotel.id};
  const hotelName=document.querySelector('.hotel-name'),hotelSub=document.querySelector('.hotel-sub'),hotelLogo=document.querySelector('.hotel-logo'),eyebrow=document.querySelector('.topbar .eyebrow');
  if(hotelName) hotelName.textContent=hotel.name.toUpperCase(); if(hotelSub) hotelSub.textContent='SERVELLES ADMIN ACCESS'; if(hotelLogo) hotelLogo.textContent='S'; if(eyebrow) eyebrow.textContent=`Admin view · ${hotel.name}`;
  document.getElementById('returnAdminBtn')?.classList.remove('hidden'); document.getElementById('adminShell')?.classList.add('hidden'); document.querySelector('.app-shell')?.classList.remove('auth-locked');
}
function returnToAdmin(){document.getElementById('returnAdminBtn')?.classList.add('hidden');document.querySelector('.app-shell')?.classList.add('auth-locked');loadAdminDashboard();}
async function adminHotelInfo(hotelId){await loadAdminData();ADMIN_CURRENT_HOTEL=ADMIN_HOTELS.find(h=>h.id===hotelId);if(!ADMIN_CURRENT_HOTEL)return;document.getElementById('adminOverview')?.classList.add('hidden');document.getElementById('adminManager')?.classList.remove('hidden');document.getElementById('manageHotelTitle').textContent=ADMIN_CURRENT_HOTEL.name;document.getElementById('manageHotelState').textContent=ADMIN_CURRENT_HOTEL.active?'ACTIVE':'PAUSED';document.getElementById('manageHotelState').className=`admin-pill ${ADMIN_CURRENT_HOTEL.active?'':'off'}`;fillHotelForm();await Promise.all([renderAdminTeam(),renderAdminDepartments(),renderAdminRooms(),renderAdminIntegrations()]);}
function backToHotelOverview(){ADMIN_CURRENT_HOTEL=null;document.getElementById('adminManager')?.classList.add('hidden');document.getElementById('adminOverview')?.classList.remove('hidden');}
function fillHotelForm(){const h=ADMIN_CURRENT_HOTEL;document.getElementById('hotelNameInput').value=h.name||'';document.getElementById('hotelShortNameInput').value=h.short_name||'';document.getElementById('hotelEmailInput').value=h.contact_email||'';document.getElementById('hotelPhoneInput').value=h.phone||'';document.getElementById('hotelAddressInput').value=h.address||'';document.getElementById('hotelNotesInput').value=h.notes||'';document.getElementById('hotelActiveInput').checked=!!h.active;}
async function saveHotelDetails(){const h=ADMIN_CURRENT_HOTEL;const patch={name:document.getElementById('hotelNameInput').value.trim(),short_name:document.getElementById('hotelShortNameInput').value.trim()||null,contact_email:document.getElementById('hotelEmailInput').value.trim()||null,phone:document.getElementById('hotelPhoneInput').value.trim()||null,address:document.getElementById('hotelAddressInput').value.trim()||null,notes:document.getElementById('hotelNotesInput').value.trim()||null,active:document.getElementById('hotelActiveInput').checked};const {error}=await servellesDb.from('hotels').update(patch).eq('id',h.id);if(error)return alert(error.message);Object.assign(h,patch);document.getElementById('manageHotelTitle').textContent=h.name;toastAdmin('Hotel details saved');}
async function renderAdminTeam(){const members=ADMIN_MEMBERSHIPS.filter(m=>m.hotel_id===ADMIN_CURRENT_HOTEL.id);const profiles=new Map(ADMIN_PROFILES.map(p=>[p.id,p]));const box=document.getElementById('adminTeamList');box.innerHTML=members.map(m=>{const p=profiles.get(m.user_id)||{};return `<div class="manage-row"><div><strong>${adminEscape(p.full_name||'Hotel user')}</strong><span>${adminEscape(m.user_id)}</span></div><div class="manage-row-actions"><select onchange="changeMemberRole('${m.id}',this.value)">${['hotel_admin','manager','department_manager','staff'].map(r=>`<option value="${r}" ${m.role===r?'selected':''}>${r.replaceAll('_',' ')}</option>`).join('')}</select><button class="tiny-btn ${m.active?'':'muted'}" onclick="toggleMember('${m.id}',${!m.active})">${m.active?'Disable':'Enable'}</button></div></div>`;}).join('')||'<div class="admin-empty">No users assigned to this hotel.</div>';}
async function changeMemberRole(id,role){const {error}=await servellesDb.from('hotel_memberships').update({role}).eq('id',id);if(error)return alert(error.message);toastAdmin('Role updated');}
async function toggleMember(id,active){const {error}=await servellesDb.from('hotel_memberships').update({active}).eq('id',id);if(error)return alert(error.message);await adminHotelInfo(ADMIN_CURRENT_HOTEL.id);}
async function renderAdminDepartments(){const items=ADMIN_DEPARTMENTS.filter(d=>d.hotel_id===ADMIN_CURRENT_HOTEL.id);document.getElementById('adminDepartmentList').innerHTML=items.map(d=>`<div class="manage-row"><div><strong>${adminEscape(d.name)}</strong><span>${d.active?'Active':'Disabled'}</span></div><button class="tiny-btn ${d.active?'':'muted'}" onclick="toggleDepartment('${d.id}',${!d.active})">${d.active?'Disable':'Enable'}</button></div>`).join('')||'<div class="admin-empty">No departments yet.</div>';}
async function addDepartment(){const input=document.getElementById('newDepartmentName');const name=input.value.trim();if(!name)return;const {error}=await servellesDb.from('departments').insert({hotel_id:ADMIN_CURRENT_HOTEL.id,name});if(error)return alert(error.message);input.value='';await adminHotelInfo(ADMIN_CURRENT_HOTEL.id);}
async function toggleDepartment(id,active){const {error}=await servellesDb.from('departments').update({active}).eq('id',id);if(error)return alert(error.message);await adminHotelInfo(ADMIN_CURRENT_HOTEL.id);}
async function renderAdminRooms(){const items=ADMIN_ROOMS.filter(r=>r.hotel_id===ADMIN_CURRENT_HOTEL.id);document.getElementById('adminRoomList').innerHTML=items.map(r=>`<div class="manage-row"><div><strong>Room ${adminEscape(r.room_number)}</strong><span>${adminEscape(r.room_name||'')} ${r.active?'':'· Disabled'}</span></div><button class="tiny-btn ${r.active?'':'muted'}" onclick="toggleRoom('${r.id}',${!r.active})">${r.active?'Disable':'Enable'}</button></div>`).join('')||'<div class="admin-empty">No rooms yet.</div>';}
async function addRoom(){const num=document.getElementById('newRoomNumber').value.trim();const name=document.getElementById('newRoomName').value.trim();if(!num)return;const {error}=await servellesDb.from('rooms').insert({hotel_id:ADMIN_CURRENT_HOTEL.id,room_number:num,room_name:name||null});if(error)return alert(error.message);document.getElementById('newRoomNumber').value='';document.getElementById('newRoomName').value='';await adminHotelInfo(ADMIN_CURRENT_HOTEL.id);}
async function toggleRoom(id,active){const {error}=await servellesDb.from('rooms').update({active}).eq('id',id);if(error)return alert(error.message);await adminHotelInfo(ADMIN_CURRENT_HOTEL.id);}
async function renderAdminIntegrations(){const [waRes,pmsRes]=await Promise.all([servellesDb.from('hotel_whatsapp_connections').select('*').eq('hotel_id',ADMIN_CURRENT_HOTEL.id).maybeSingle(),servellesDb.from('hotel_pms_connections').select('*').eq('hotel_id',ADMIN_CURRENT_HOTEL.id).maybeSingle()]);if(waRes.error)return showMigrationNeeded(waRes.error);if(pmsRes.error)return showMigrationNeeded(pmsRes.error);const wa=waRes.data||{},pms=pmsRes.data||{};document.getElementById('waDisplayNumber').value=wa.display_phone_number||'';document.getElementById('waVerifiedName').value=wa.verified_name||'';document.getElementById('waWabaId').value=wa.waba_id||'';document.getElementById('waPhoneId').value=wa.phone_number_id||'';document.getElementById('waStatus').value=wa.status||'not_connected';document.getElementById('pmsProvider').value=pms.provider||'none';document.getElementById('pmsPropertyId').value=pms.property_id||'';document.getElementById('pmsStatus').value=pms.status||'not_connected';document.getElementById('pmsNotes').value=pms.notes||'';}
function showMigrationNeeded(error){console.error(error);document.getElementById('integrationMessage').textContent='Run admin-management-setup.sql in Supabase to enable integrations.';}
async function saveWhatsApp(){const row={hotel_id:ADMIN_CURRENT_HOTEL.id,display_phone_number:val('waDisplayNumber'),verified_name:val('waVerifiedName'),waba_id:val('waWabaId'),phone_number_id:val('waPhoneId'),status:document.getElementById('waStatus').value,updated_at:new Date().toISOString()};const {error}=await servellesDb.from('hotel_whatsapp_connections').upsert(row,{onConflict:'hotel_id'});if(error)return alert(error.message);toastAdmin('WhatsApp settings saved');}
async function savePms(){const row={hotel_id:ADMIN_CURRENT_HOTEL.id,provider:document.getElementById('pmsProvider').value,property_id:val('pmsPropertyId'),status:document.getElementById('pmsStatus').value,notes:val('pmsNotes'),updated_at:new Date().toISOString()};const {error}=await servellesDb.from('hotel_pms_connections').upsert(row,{onConflict:'hotel_id'});if(error)return alert(error.message);toastAdmin('PMS settings saved');}
function val(id){return document.getElementById(id).value.trim()||null;}function toastAdmin(text){const n=document.createElement('div');n.className='admin-toast';n.textContent=text;document.body.appendChild(n);setTimeout(()=>n.remove(),2200);}
document.getElementById('adminLogoutBtn')?.addEventListener('click',()=>servellesDb.auth.signOut());document.getElementById('returnAdminBtn')?.addEventListener('click',returnToAdmin);document.getElementById('adminBackBtn')?.addEventListener('click',backToHotelOverview);document.getElementById('saveHotelBtn')?.addEventListener('click',saveHotelDetails);document.getElementById('addDepartmentBtn')?.addEventListener('click',addDepartment);document.getElementById('addRoomBtn')?.addEventListener('click',addRoom);document.getElementById('saveWhatsAppBtn')?.addEventListener('click',saveWhatsApp);document.getElementById('savePmsBtn')?.addEventListener('click',savePms);
