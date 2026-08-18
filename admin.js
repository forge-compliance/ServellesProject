let SERVELLES_ADMIN_MODE = false;

async function isPlatformAdmin(userId){
  const { data, error } = await servellesDb.from('servelles_admins').select('user_id,active').eq('user_id',userId).eq('active',true).maybeSingle();
  if(error) throw error;
  return !!data;
}

async function loadAdminDashboard(){
  const adminShell = document.getElementById('adminShell');
  const appShell = document.querySelector('.app-shell');
  const authScreen = document.getElementById('authScreen');
  const adminUser = document.getElementById('adminUser');
  if(adminUser) adminUser.textContent = SERVELLES_USER?.full_name || SERVELLES_USER?.email || 'Servelles Admin';

  const [{data:hotels,error:hotelsError},{data:memberships,error:membersError},{data:departments,error:deptError},{data:rooms,error:roomsError}] = await Promise.all([
    servellesDb.from('hotels').select('id,name,short_name,slug,active,created_at').order('name'),
    servellesDb.from('hotel_memberships').select('id,hotel_id,user_id,role,active'),
    servellesDb.from('departments').select('id,hotel_id,active'),
    servellesDb.from('rooms').select('id,hotel_id,active')
  ]);
  if(hotelsError) throw hotelsError;
  if(membersError) throw membersError;
  if(deptError) throw deptError;
  if(roomsError) throw roomsError;

  document.getElementById('adminHotelCount').textContent = hotels?.length || 0;
  document.getElementById('adminUserCount').textContent = memberships?.filter(x=>x.active).length || 0;
  document.getElementById('adminDeptCount').textContent = departments?.filter(x=>x.active).length || 0;
  document.getElementById('adminRoomCount').textContent = rooms?.filter(x=>x.active).length || 0;

  const grid = document.getElementById('adminHotelGrid');
  grid.innerHTML = (hotels || []).map(h=>{
    const users = memberships.filter(x=>x.hotel_id===h.id && x.active).length;
    const depts = departments.filter(x=>x.hotel_id===h.id && x.active).length;
    const roomCount = rooms.filter(x=>x.hotel_id===h.id && x.active).length;
    return `<article class="hotel-admin-card">
      <div class="hotel-admin-card-head"><div><span class="small-label">HOTEL ACCOUNT</span><h3>${h.name}</h3></div><span class="admin-pill ${h.active?'':'off'}">${h.active?'ACTIVE':'PAUSED'}</span></div>
      <div class="hotel-admin-meta"><div><span>Users</span><strong>${users}</strong></div><div><span>Departments</span><strong>${depts}</strong></div><div><span>Rooms</span><strong>${roomCount}</strong></div></div>
      <div class="hotel-admin-actions"><button class="secondary-btn" onclick="enterHotelAsAdmin('${h.id}')">OPEN HOTEL</button><button class="secondary-btn" onclick="adminHotelInfo('${h.id}')">MANAGE</button></div>
    </article>`;
  }).join('') || '<div class="admin-empty">No hotels have been created yet.</div>';

  document.getElementById('returnAdminBtn')?.classList.add('hidden');
  authScreen?.classList.add('hidden');
  appShell?.classList.add('auth-locked');
  adminShell?.classList.remove('hidden');
}

async function enterHotelAsAdmin(hotelId){
  const {data:hotel,error} = await servellesDb.from('hotels').select('id,name,short_name,slug,active').eq('id',hotelId).single();
  if(error) return alert(error.message);
  SERVELLES_HOTEL = hotel;
  SERVELLES_MEMBERSHIP = {role:'servelles_admin',hotel_id:hotel.id};
  const hotelName = document.querySelector('.hotel-name');
  const hotelSub = document.querySelector('.hotel-sub');
  const hotelLogo = document.querySelector('.hotel-logo');
  const eyebrow = document.querySelector('.topbar .eyebrow');
  if(hotelName) hotelName.textContent = hotel.name.toUpperCase();
  if(hotelSub) hotelSub.textContent = 'SERVELLES ADMIN ACCESS';
  if(hotelLogo) hotelLogo.textContent = 'S';
  if(eyebrow) eyebrow.textContent = `Admin view · ${hotel.name}`;
  document.getElementById('returnAdminBtn')?.classList.remove('hidden');
  document.getElementById('adminShell')?.classList.add('hidden');
  document.querySelector('.app-shell')?.classList.remove('auth-locked');
}

function returnToAdmin(){
  document.getElementById('returnAdminBtn')?.classList.add('hidden');
  document.querySelector('.app-shell')?.classList.add('auth-locked');
  loadAdminDashboard();
}

function adminHotelInfo(hotelId){
  const card = [...document.querySelectorAll('.hotel-admin-card')].find(x=>x.querySelector('button')?.getAttribute('onclick')?.includes(hotelId));
  const hotelName = card?.querySelector('h3')?.textContent || 'Hotel';
  alert(`${hotelName}\n\nHotel management is connected. Next build adds rooms, departments, users, WhatsApp and PMS settings here.`);
}

document.getElementById('adminLogoutBtn')?.addEventListener('click',()=>servellesDb.auth.signOut());
document.getElementById('returnAdminBtn')?.addEventListener('click',returnToAdmin);
