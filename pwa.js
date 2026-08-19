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
 if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Servelles service worker',err)))}
 let deferred=null;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;document.documentElement.classList.add('servelles-installable')});
 window.addEventListener('appinstalled',()=>{deferred=null;document.documentElement.classList.remove('servelles-installable')});
 window.installServellesApp=async()=>{if(!deferred)return false;deferred.prompt();const result=await deferred.userChoice;deferred=null;return result.outcome==='accepted'};
})();