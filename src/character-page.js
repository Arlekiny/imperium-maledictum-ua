/* Character stays a direct page. Keep book selection only in navigation, not its data. */
(function(){
  function updateLinks(){const books=ArchiveNavigation.booksFromHash(location.hash);document.querySelectorAll('.page-navigation [data-section]').forEach(link=>{const section=CATALOG.find(section=>section.id===link.dataset.section);link.href=ArchiveNavigation.pageHref(section,books);});}
  updateLinks();window.addEventListener('hashchange',updateLinks);
})();
