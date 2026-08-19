/* Servelle's installable web app */
(function(){
 const adminMobile=document.createElement('link');
 adminMobile.rel='stylesheet';
 adminMobile.href='admin-mobile.css?v=003';
 document.head.appendChild(adminMobile);
 const adminSwipe=document.createElement('script');
 adminSwipe.src='admin-mobile-swipe.js?v=001';
 adminSwipe.dataset.adminMobileSwipe='1';
 document.head.appendChild(adminSwipe);

 function tidyMobileNav(){
   if(window.innerWidth>700) return;
   const nav=document.querySelector('.app-shell .nav-list');
   const realLogout=document.getElementById('logoutBtn');
   if(!nav||!realLogout) return;

   const seen=new Set();
   [...nav.querySelectorAll('.nav-item[data-nav]')].forEach(item=>{
     const key=item.dataset.nav;
     if(seen.has(key)) item.remove(); else seen.add(key);
   });

   let btn=document.getElementById('mobileLogoutBtn');
   if(!btn){
     btn=document.createElement('button');
     btn.id='mobileLogoutBtn';
     btn.className='mobile-logout-item';
     btn.type='button';
     btn.innerHTML='⇥ <span>Sign out</span>';
     btn.addEventListener('click',async event=>{
       event.preventDefault();
       event.stopPropagation();
       realLogout.click();
     });
     nav.appendChild(btn);
   }
 }
 document.addEventListener('DOMContentLoaded',tidyMobileNav);
 window.addEventListener('resize',tidyMobileNav);
 new MutationObserver(tidyMobileNav).observe(document.documentElement,{childList:true,subtree:true});

 const extra=document.createElement('style');
 extra.textContent=`@media(max-width:700px){.sidebar{display:flex!important;flex-direction:column!important}.nav-list{flex:1 1 auto!important;overflow-y:auto!important;min-height:0!important}.mobile-logout-item{width:100%!important;min-height:52px!important;padding:9px 3px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;position:sticky!important;bottom:0!important;margin-top:auto!important;background:#111820!important;border:1px solid rgba(216,162,62,.38)!important;border-radius:10px!important;color:#e2b45d!important;z-index:5!important;font-size:18px!important}.mobile-logout-item span{display:block!important;font-size:8px!important;line-height:1.1!important}}`;
 document.head.appendChild(extra);

 if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Servelles service worker',err)))}
 let deferred=null;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;document.documentElement.classList.add('servelles-installable')});
 window.addEventListener('appinstalled',()=>{deferred=null;document.documentElement.classList.remove('servelles-installable')});
 window.installServellesApp=async()=>{if(!deferred)return false;deferred.prompt();const result=await deferred.userChoice;deferred=null;return result.outcome==='accepted'};
})();