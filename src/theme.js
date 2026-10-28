/* Shared optional theme preference. Storage failure must never block local pages. */
(function(){
  let theme='dark';
  try{theme=localStorage.getItem('im-archive-theme')==='light'?'light':'dark';}catch(_){}
  const button=document.getElementById('theme');
  function apply(){document.documentElement.dataset.theme=theme;button.setAttribute('aria-label',(theme==='dark'?'Увімкнути світлу тему':'Увімкнути темну тему'));button.title=button.getAttribute('aria-label');}
  button.addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';apply();try{localStorage.setItem('im-archive-theme',theme);}catch(_){}});
  apply();
})();
