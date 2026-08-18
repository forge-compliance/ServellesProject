/* Servelle's platform admin page split: Dashboard is overview, Hotels is hotel management only. */
(function(){
  function ensureStyles(){
    if(document.getElementById('servellesAdminPagesStyle')) return;
    const s=document.createElement('style');
    s.id='servellesAdminPagesStyle';
    s.textContent=`
      .platform-dashboard{display:grid;gap:22px}
      .platform-dashboard-grid{display:grid;grid-template-columns:1.4fr .9fr;gap:20px}
      .platform-dashboard-card{background:#0c131a;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:24px}
      .platform-dashboard-card h2{font-family:"Cormorant Garamond",serif;font-size:34px;margin:0 0 6px}
      .platform-dashboard-card p{color:var(--muted);margin:0 0 20px;font-size:13px}
      .platform-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
      .platform-kpi{background:#0d141b;border:1px solid var(--line);border-radius:15px;padding:18px 20px}
      .platform-kpi span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em}
      .platform-kpi strong{display:block;font-family:"Cormorant Garamond",serif;color:var(--gold2);font-size:38px;margin-top:4px}
      .platform-hotel-list{display:grid;gap:10px}
      .platform-hotel-row{display:grid;grid-template-columns:1fr auto auto;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}
      .platform-hotel-row:last-child{border-bottom:0}
      .platform-hotel-row strong{display:block;font-size:15px}
      .platform-hotel-row small{color:var(--muted)}
      .platform-quick-actions{display:grid;gap:10px}
      .platform-quick-actions button{width:100%;margin:0;text-align:left}
      .admin-hotels-only .admin-summary{display:none!important}
      .admin-hotels-only .admin-panel{margin-top:0}
      .admin-hotels-only .hotel-admin-card{grid-template-columns:minmax(260px,1fr) minmax(180px,.55fr) auto}
      .admin-hotels-only .hotel-admin-meta{justify-content:flex-start}
      @media(max-width:950px){.platform-dashboard-grid{grid-template-columns:1fr}.platform-kpi-grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:560px){.platform-kpi-grid{grid-template-columns:1fr}.platform-hotel-row{grid-template-columns:1fr}.platform-hotel-row .hotel-admin-actions{justify-content:flex-start}}
    `;
    document.head.appendChild(s);
  }

  function activateNav(page){
    document.getElementById('servellesAdminNav')?.querySelectorAll('button[data-admin-page]').forEach(b=>b.classList.toggle('active',b.dataset.adminPage===page));
  }
  function hideUsers(){ document.getElementById('adminUsersPanel')?.style.setProperty('display','none'); }
  function hidePlaceholder(){ document.getElementById('adminPlaceholderPanel')?.style.setProperty('display','none'); }
  function hideDashboard(){ document.getElementById('platformDashboardPanel')?.style.setProperty('display','none'); }
  function originalHotelsPanel(){
    return document.querySelector('#adminOverview .admin-panel:not(#adminPlaceholderPanel):not(#adminUsersPanel):not(#platformDashboardPanel)');
  }
  async function freshData(){ if(typeof loadAdminData==='function') await loadAdminData(); }

  async function showDashboard(){
    ensureStyles();
    await freshData();
    activateNav('dashboard');
    const overview=document.getElementById('adminOverview');
    const manager=document.getElementById('adminManager');
    if(!overview) return;
    manager?.classList.add('hidden');
    overview.classList.remove('hidden','admin-hotels-only');
    hideUsers();
    hidePlaceholder();

    const summary=overview.querySelector('.admin-summary');
    const hotelsPanel=originalHotelsPanel();
    if(summary) summary.style.display='none';
    if(hotelsPanel) hotelsPanel.style.display='none';

    let panel=document.getElementById('platformDashboardPanel');
    if(!panel){
      panel=document.createElement('section');
      panel.id='platformDashboardPanel';
      panel.className='platform-dashboard';
      overview.appendChild(panel);
    }
    panel.style.display='grid';

    const hotels=ADMIN_HOTELS||[], memberships=ADMIN_MEMBERSHIPS||[], depts=ADMIN_DEPARTMENTS||[], rooms=ADMIN_ROOMS||[];
    const activeHotels=hotels.filter(h=>h.active).length;
    const activeUsers=memberships.filter(m=>m.active).length;
    const activeDepts=depts.filter(d=>d.active).length;
    const activeRooms=rooms.filter(r=>r.active).length;

    panel.innerHTML=`
      <div class="platform-kpi-grid">
        <div class="platform-kpi"><span>Active hotels</span><strong>${activeHotels}</strong></div>
        <div class="platform-kpi"><span>Active users</span><strong>${activeUsers}</strong></div>
        <div class="platform-kpi"><span>Departments</span><strong>${activeDepts}</strong></div>
        <div class="platform-kpi"><span>Rooms</span><strong>${activeRooms}</strong></div>
      </div>
      <div class="platform-dashboard-grid">
        <section class="platform-dashboard-card"><span class="small-label">SERVELLE'S NETWORK</span><h2>Platform overview</h2><p>Quick view of the hotels currently connected to Servelle's.</p><div class="platform-hotel-list">
          ${hotels.map(h=>{const depCount=depts.filter(d=>d.hotel_id===h.id&&d.active).length;const roomCount=rooms.filter(r=>r.hotel_id===h.id&&r.active).length;return `<div class="platform-hotel-row"><div><strong>${adminEscape(h.name)}</strong><small>${depCount} departments · ${roomCount} rooms</small></div><span class="admin-pill ${h.active?'':'off'}">${h.active?'ACTIVE':'PAUSED'}</span><div class="hotel-admin-actions"><button class="secondary-btn" onclick="enterHotelAsAdmin('${h.id}')">OPEN</button></div></div>`}).join('')||'<div class="admin-empty">No hotels yet.</div>'}
        </div></section>
        <section class="platform-dashboard-card"><span class="small-label">QUICK ACTIONS</span><h2>Administration</h2><p>Jump straight to the common platform jobs.</p><div class="platform-quick-actions"><button class="secondary-btn" data-jump="hotels">Manage hotels</button><button class="secondary-btn" data-jump="users">Manage users</button><button class="secondary-btn" data-jump="integrations">Integrations</button><button class="primary-btn" data-jump="addhotel">+ Add hotel</button></div></section>
      </div>`;

    panel.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelector(`#servellesAdminNav [data-admin-page="${btn.dataset.jump}"]`)?.click();
    }));
  }

  async function showHotels(){
    ensureStyles();
    await freshData();
    activateNav('hotels');
    const overview=document.getElementById('adminOverview');
    const manager=document.getElementById('adminManager');
    if(!overview) return;
    manager?.classList.add('hidden');
    overview.classList.remove('hidden');
    overview.classList.add('admin-hotels-only');
    hideUsers();
    hidePlaceholder();
    hideDashboard();
    const summary=overview.querySelector('.admin-summary'); if(summary) summary.style.display='none';
    const panel=originalHotelsPanel();
    if(panel) panel.style.display='block';
    const head=panel?.querySelector('.admin-panel-head h2'); if(head) head.textContent='Hotels';
    const grid=document.getElementById('adminHotelGrid');
    if(!grid) return;
    const hotels=ADMIN_HOTELS||[], depts=ADMIN_DEPARTMENTS||[], rooms=ADMIN_ROOMS||[];
    grid.innerHTML=hotels.map(h=>{const depCount=depts.filter(d=>d.hotel_id===h.id&&d.active).length;const roomCount=rooms.filter(r=>r.hotel_id===h.id&&r.active).length;return `<article class="hotel-admin-card"><div class="hotel-admin-card-head"><div><h3>${adminEscape(h.name)}</h3></div><span class="admin-pill ${h.active?'':'off'}">${h.active?'ACTIVE':'PAUSED'}</span></div><div class="hotel-admin-meta"><div><span>Departments</span><strong>${depCount}</strong></div><div><span>Rooms</span><strong>${roomCount}</strong></div></div><div class="hotel-admin-actions"><button class="secondary-btn" onclick="enterHotelAsAdmin('${h.id}')">OPEN HOTEL</button><button class="primary-btn" onclick="adminHotelInfo('${h.id}')">MANAGE</button></div></article>`}).join('')||'<div class="admin-empty">No hotels have been created yet.</div>';
  }

  function wireNav(){
    const nav=document.getElementById('servellesAdminNav');
    if(!nav || nav.dataset.splitWired==='1') return false;
    nav.dataset.splitWired='1';
    nav.addEventListener('click',e=>{
      const b=e.target.closest('button[data-admin-page]'); if(!b) return;
      const page=b.dataset.adminPage;
      if(page!=='users') hideUsers();
      if(page!=='dashboard') hideDashboard();
      if(page!=='dashboard'&&page!=='hotels') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if(page==='dashboard') showDashboard(); else showHotels();
    },true);
    return true;
  }

  const obs=new MutationObserver(()=>wireNav());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{ensureStyles();wireNav();});
  window.showServellesAdminDashboard=showDashboard;
  window.showServellesAdminHotels=showHotels;
})();
