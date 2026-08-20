// Servelle's admin department controls fix
// The department ADD button existed in the UI but had no click handler.
document.addEventListener('DOMContentLoaded',()=>{
  const wire=()=>{
    const btn=document.getElementById('addDepartmentBtn');
    if(!btn || btn.dataset.wired==='1') return;
    btn.dataset.wired='1';
    btn.addEventListener('click',()=>{
      if(typeof addDepartment==='function') addDepartment();
    });
    const input=document.getElementById('newDepartmentName');
    input?.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        if(typeof addDepartment==='function') addDepartment();
      }
    });
  };
  wire();
  new MutationObserver(wire).observe(document.body,{childList:true,subtree:true});
});
