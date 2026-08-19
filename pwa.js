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

 function ensureMobileLogout(){
   if(window.innerWidth>700) return;
   const nav=document.querySelector('.app-shell .nav-list');
   const realLogout=document.getElementById('logoutBtn');
   if(!nav||!realLogout||document.getElementById('mobileLogoutBtn')) return;
   const btn=document.createElement('button');
   btn.id='mobileLogoutBtn';
   btn.className='nav-item mobile-logout-item';
   btn.type='button';
   btn.innerHTML='⇥ <span>Sign out</span>';
   btn.addEventListener('click',()=>realLogout.click());
   nav.appendChild(btn);
 }
 document.addEventListener('DOMContentLoaded',ensureMobileLogout);
 window.addEventListener('resize',ensureMobileLogout);
 new MutationObserver(ensureMobileLogout).observe(document.documentElement,{childList:true,subtree:true});

 if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Servelles service worker',err)))}
 let deferred=null;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;document.documentElement.classList.add('servelles-installable')});
 window.addEventListener('appinstalled',()=>{deferred=null;document.documentElement.classList.remove('servelles-installable')});
 window.installServellesApp=async()=>{if(!deferred)return false;deferred.prompt();const result=await deferred.userChoice;deferred=null;return result.outcome==='accepted'};
})();