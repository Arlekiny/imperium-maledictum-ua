/* Keyboard and screen-reader additions only; translation and XP code stay intact. */
(function(){
  document.getElementById('searchInput').setAttribute('aria-label',document.getElementById('searchInput').placeholder);
  document.getElementById('countLabel').setAttribute('role','status');
  document.getElementById('calcError').setAttribute('role','status');
  document.querySelectorAll('th[data-key]').forEach(th=>{
    th.tabIndex=0;
    th.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();th.click();}});
  });
  function update(){
    document.querySelectorAll('nav.tabs button').forEach(button=>button.setAttribute('aria-pressed',String(button.classList.contains('active'))));
    document.querySelectorAll('th[data-key]').forEach(th=>th.setAttribute('aria-sort',th.classList.contains('sorted')?(th.querySelector('.arrow').textContent==='▲'?'ascending':'descending'):'none'));
  }
  document.addEventListener('click',()=>queueMicrotask(update));
  document.addEventListener('change',()=>queueMicrotask(update));update();
})();
