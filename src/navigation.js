/* Filename map and native relative links. No fetch, module loading or SPA redirects. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArchiveNavigation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const FILES=Object.freeze({home:'index.html',character:'character.html',augmetics:'augmetics.html',combat:'combat.html',equipment:'equipment.html',protection:'protection.html',psy:'psy.html',services:'services.html',weapons:'weapons.html',criticalwounds:'criticalwounds.html',mutations:'mutations.html'});
  const BOOK_IDS=['core','mechanicus','inquisitor','macharian'];
  function booksFromHash(hash){const params=new URLSearchParams(String(hash||'').split('?')[1]||'');return params.has('books')?[...new Set(params.get('books').split(',').filter(id=>BOOK_IDS.includes(id)))]:BOOK_IDS.slice();}
  function pageHref(section,books=BOOK_IDS){
    if(!Object.hasOwn(FILES,section.id))throw Error('Unknown section '+section.id);
    const first=section.id==='character' || section.tables.length>1?'all':section.tables[0]?.[0];
    const query='';
    return FILES[section.id]+'#/'+section.id+(first?'/'+first:'')+query;
  }
  return {FILES,BOOK_IDS,booksFromHash,pageHref};
});
