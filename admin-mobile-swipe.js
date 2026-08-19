/* Servelle's mobile admin swipe drawer */
(function(){
  let startX=0,startY=0,tracking=false;
  const isMobile=()=>window.matchMedia('(max-width:900px)').matches;
  const nav=()=>document.getElementById('servellesAdminNav');
  const shell=()=>document.getElementById('adminShell');
  function openNav(){if(!isMobile())return;nav()?.classList.add('mobile-open');shell()?.classList.add('admin-nav-open')}
  function closeNav(){nav()?.classList.remove('mobile-open');shell()?.classList.remove('admin-nav-open')}
  function bind(){
    if(document.documentElement.dataset.adminSwipeBound==='1')return;
    document.documentElement.dataset.adminSwipeBound='1';
    document.addEventListener('touchstart',e=>{
      if(!isMobile()||!e.touches?.length)return;
      const t=e.touches[0];startX=t.clientX;startY=t.clientY;tracking=true;
    },{passive:true});
    document.addEventListener('touchend',e=>{
      if(!tracking||!isMobile())return;tracking=false;
      const t=e.changedTouches?.[0];if(!t)return;
      const dx=t.clientX-startX,dy=t.clientY-startY;
      if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.25)return;
      if(dx>0&&startX<70)openNav();
      if(dx<0&&nav()?.classList.contains('mobile-open'))closeNav();
    },{passive:true});
    document.addEventListener('click',e=>{
      if(!isMobile())return;
      const n=nav();if(!n?.classList.contains('mobile-open'))return;
      if(e.target.closest('#servellesAdminNav button')){setTimeout(closeNav,50);return}
      if(!e.target.closest('#servellesAdminNav'))closeNav();
    });
    window.addEventListener('resize',()=>{if(!isMobile())closeNav()});
  }
  document.addEventListener('DOMContentLoaded',bind);bind();
  window.openServellesAdminNav=openNav;window.closeServellesAdminNav=closeNav;
})();