(function () {

  'use strict';

  const L=ArchiveLogic, T=ArchiveLocale;

  const raw=JSON.parse(document.getElementById('archive-data').textContent);

  const {tables,profiles}=L.normalise(raw,PAGE_CATALOG);

  const entryKeys=new WeakMap();for(const table of Object.values(tables))table.rows.forEach((row,index)=>entryKeys.set(row,table.id+':'+index));
  const $=id=>document.getElementById(id);

  const parsePageRoute=hash=>({...L.parseRoute(hash,PAGE_CATALOG,tables),books:L.BOOK_IDS.slice()});

  let state=parsePageRoute(location.hash), lastSection='', lastTable='', dialogTrigger=null;

  const renderer=createArchiveRenderer(document,L,{profiles,entryKeys,traits:raw.traits,conditions:raw.conditions,mutations:[...(raw.mutations || []),...(raw.malignancies || [])],onReference:showReference});

  const {node,rich}=renderer;

  const dialog=$('detail');

  function writeRoute(next,{replace=false}={}) {

    const hash=L.routeHash(next);

    if (replace) {history.replaceState(null,'',hash);state=parsePageRoute(hash);render(false);}

    else if (location.hash===hash) {state=parsePageRoute(hash);render(false);}

    else location.hash=hash;

  }

  function sectionLink(section) {

    return ArchiveNavigation.pageHref(section,state.books);

  }

  function renderNavigation() {

    $('navigation').replaceChildren(...CATALOG.map((section,index)=>{

      const a=node('a',section.title,{href:sectionLink(section),'data-section':section.id});

      if(section.id===state.section)a.setAttribute('aria-current','page');

      a.setAttribute('data-index',String(index+1).padStart(2,'0'));

      return a;

    }));

  }

  const visibleHeaders=table=>table.headers.filter(key=>table.section!=='mutations' || key!=='Page');

  const allSorts={};

  function renderTabs(section) {

    $('tableTabs').hidden=section.tables.length<=1;

    $('tableTabs').replaceChildren(...(section.id==='home'?section.tables:[['all','Усі'],...section.tables]).map(([id,title])=>{

      const count=(id==='all'?section.tables.map(([key])=>tables[key]):[tables[id]]).reduce((sum,table)=>sum+L.filterRows(table.rows,state).length,0);

      const a=node('a',title,{href:L.routeHash({...state,table:id,sort:tables[id]?.defaultSort || null,direction:'asc'}),'data-table':id});

      a.append(node('span',count,{class:'tab-count'}));

      if(id===state.table)a.setAttribute('aria-current','page');

      return a;

    }));

  }

  function setSort(key) {

    const direction=state.sort===key && state.direction==='asc'?'desc':'asc';

    writeRoute({...state,sort:key,direction});

  }

  function renderAll() {

    const section=CATALOG.find(section=>section.id===state.section);

    const container=$('tableWrap');

    container.classList.add('all-tables');container.replaceChildren();

    let total=0,visible=0;

    for(const [id] of section.tables) {

      const table=tables[id], order=allSorts[id] || {sort:table.defaultSort,direction:'asc'};

      const rows=L.sortedRows(table,L.filterRows(table.rows,state),order.sort,order.direction);

      total+=table.rows.length;visible+=rows.length;

      const block=node('section',null,{class:'all-table-section','aria-labelledby':'heading-'+id});

      block.append(node('h3',table.title+' ('+rows.length+' / '+table.rows.length+')',{id:'heading-'+id}));
      if(rows.length) {

        const wrap=node('div',null,{class:'table-scroll'+(container.classList.contains('mobile-table')?' mobile-table':''),tabindex:'0',role:'region','aria-label':table.title});

        const view=renderer.dataTable(visibleHeaders(table),rows,{caption:table.title,tableId:'dataTable-'+id,...order,onSort:table.ordered?null:key=>{

          allSorts[id]={sort:key,direction:order.sort===key && order.direction==='asc'?'desc':'asc'};render(false);

        }});

        if(['traits','conditions'].includes(id)) Array.from(view.querySelectorAll('tbody tr')).forEach((tr,index)=>{

          tr.cells[0].replaceChildren(renderer.reference(rows[index].Name,id==='traits'?'trait':'condition',rows[index].Name));

        });

        wrap.append(view);block.append(wrap);

      } else block.append(node('p','Немає відповідних записів.',{class:'note'}));

      container.append(block);

    }

    $('tableTitle').textContent='Усі';$('rowCount').textContent=visible+' / '+total+' записів';

    container.setAttribute('aria-label','Усі таблиці: '+section.title+'');

    $('sortLabel').hidden=true;$('orderNote').textContent='Усі таблиці цього розділу.';

    container.hidden=visible===0;$('empty').hidden=visible>0;

  }

  function renderTable() {

    if(state.table==='all'){renderAll();return;}

    $('tableWrap').classList.remove('all-tables');

    const table=tables[state.table];

    const filtered=L.filterRows(table.rows,state);

    const rows=L.sortedRows(table,filtered,state.sort,state.direction);

    $('tableTitle').textContent=table.title;

    $('rowCount').textContent=rows.length+' / '+table.rows.length+' записів';

    $('tableWrap').setAttribute('aria-label',table.title+' — прокрутіть горизонтально, щоб побачити всі стовпці');

    $('orderNote').textContent=table.ordered?'Початковий порядок записів.':state.sort==='Discipline'?'Упорядковано за дисципліною.':'Виберіть підкреслений термін, щоб переглянути подробиці.';

    $('sortLabel').hidden=table.ordered;

    $('sort').replaceChildren(...visibleHeaders(table).flatMap(key=>['asc','desc'].map(direction=>node('option',T.header(key)+(direction==='asc'?' ↑':' ↓'),{value:JSON.stringify([key,direction])}))));

    if(state.sort)$('sort').value=JSON.stringify([state.sort,state.direction]);

    const view=renderer.dataTable(visibleHeaders(table),rows,{caption:table.title,tableId:'dataTable',sort:state.sort,direction:state.direction,onSort:table.ordered?null:setSort});

    // Combat dictionary names are also explicit keyboard/touch detail controls.

    if(['traits','conditions'].includes(table.id)) Array.from(view.querySelectorAll('tbody tr')).forEach((tr,index)=>{

      tr.cells[0].replaceChildren(renderer.reference(rows[index].Name,table.id==='traits'?'trait':'condition',rows[index].Name));

    });

    $('tableWrap').replaceChildren(view);

    $('tableWrap').hidden=rows.length===0;

    $('empty').hidden=rows.length>0;

  }

  function render(focusHeading) {

    const focused=document.activeElement;

    const restoreSort=focused?.getAttribute('data-sort-key');

    const section=CATALOG.find(section=>section.id===state.section);

    const changed=lastSection!==state.section;

    $('sectionTitle').textContent=section.title;

    $('description').textContent=section.description;

    $('folio').textContent='ДОВІДКОВИЙ АРХІВ / '+String(CATALOG.indexOf(section)+1).padStart(2,'0');

    document.body.dataset.section=section.id;

    document.title='Imperium Maledictum · '+section.title;

    renderNavigation();

    if($('search').value!==state.query)$('search').value=state.query;

    $('search').placeholder='Пошук: '+section.title+'…';

    $('profiles').hidden=!['psy','equipment'].includes(section.id);

    if($('psychicPowerNote'))$('psychicPowerNote').hidden=!['all','psyPowers'].includes(state.table);

    renderTabs(section);renderTable();

    if(focusHeading && (changed || lastTable!==state.table))$('main').focus({preventScroll:true});

    if(changed && lastSection && focusHeading)$('main').scrollIntoView({block:'start'});

    if(!changed && restoreSort)Array.from(document.querySelectorAll('[data-sort-key]')).find(button=>button.dataset.sortKey===restoreSort)?.focus({preventScroll:true});

    lastSection=state.section;lastTable=state.table;

  }

  function resetFilters() {writeRoute({...state,query:'',books:L.BOOK_IDS.slice()});}

  $('search').addEventListener('input',event=>writeRoute({...state,query:event.target.value},{replace:true}));

  $('reset').addEventListener('click',resetFilters);$('emptyReset').addEventListener('click',resetFilters);

  $('sort').addEventListener('change',event=>{const [sort,direction]=JSON.parse(event.target.value);writeRoute({...state,sort,direction});});

  $('view').addEventListener('click',()=>{

    const active=$('tableWrap').classList.toggle('mobile-table');

    $('tableWrap').querySelectorAll('.table-scroll').forEach(wrap=>wrap.classList.toggle('mobile-table',active));

    $('view').setAttribute('aria-pressed',String(active));$('view').textContent=active?'Картки на мобільному':'Таблиця на мобільному';

  });

  window.addEventListener('hashchange',()=>{if(location.hash==='#main')return;state=parsePageRoute(location.hash);render(true);});

  document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();$('main').focus();$('main').scrollIntoView();});

  function openDetail(title,content,trigger) {

    if(!dialog.open)dialogTrigger=trigger || document.activeElement;

    $('detailTitle').textContent=title;$('detailBody').replaceChildren(content);

    if(!dialog.open)dialog.showModal();

    $('closeDetail').focus();

  }

  $('closeDetail').addEventListener('click',()=>dialog.close());

  dialog.addEventListener('close',()=>{if(dialogTrigger?.isConnected)dialogTrigger.focus();dialogTrigger=null;});

  function showReference({kind,id,label,trigger}) {

    let content;

    if(kind==='mutation') {
      const entry=[...(raw.mutations || []),...(raw.malignancies || [])].find(row=>row.Name===id);
      if(!entry)return;
      const content=node('div'), controls=node('div',null,{class:'mutation-language',role:'group','aria-label':'Мова опису'}), body=node('p');
      let language='uk';try{language=localStorage.getItem('im-mutation-language')==='en'?'en':'uk';}catch{}
      controls.append(node('span','Мова опису:',{class:'reader-language-label'}));
      const buttons=['uk','en'].map(lang=>{
        const button=node('button',lang==='uk'?'Українська':'English (оригінал)',{type:'button',class:'small','data-mutation-detail-language':lang});
        button.addEventListener('click',()=>{language=lang;draw();});controls.append(button);return button;
      });
      function draw(){body.textContent=language==='en'?entry.Description:ARCHIVE_TRANSLATIONS[entry.Description];body.lang=language;buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mutationDetailLanguage===language)));}
      draw();content.append(controls,body,node('p',entry.Source+' · '+entry.Page,{class:'note'}));
      openDetail((ARCHIVE_TRANSLATIONS[entry.Name] || entry.Name)+' ('+entry.Name+')',content,trigger);return;
    }
    let language='uk';try{language=localStorage.getItem('im-reader-language')==='en'?'en':'uk';}catch{}
    const wrap=node('div'),controls=node('div',null,{class:'reader-language',role:'group','aria-label':'Мова опису'}),panel=node('div');controls.append(node('span','Мова опису:',{class:'reader-language-label'}));
    function drawReference(){
      const previous=T.getLanguage();T.setLanguage(language);
      try{
    if(kind==='profile')content=renderer.profile(id);

    else {

      content=node('div');

      content.append(rich((kind==='trait'?raw.traits:raw.conditions)[id],{linkProfiles:false,linkConditions:kind==='trait'}));

      // Inflict parameters retain their condition definitions inside the same accessible dialog.

      if(kind==='trait' && id==='Inflict') {

        const condition=Object.keys(raw.conditions).find(name=>String(label).includes(name));

        if(condition){content.append(node('h3',condition),rich(raw.conditions[condition],{linkProfiles:false}));}

      }

    }

        panel.replaceChildren(content);panel.lang=language;
      }finally{T.setLanguage(previous);}
      controls.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.referenceLanguage===language)));
    }
    for(const [lang,text] of [['uk','Українська'],['en','English (оригінал)']]){const button=node('button',text,{type:'button','data-reference-language':lang});button.addEventListener('click',()=>{language=lang;try{localStorage.setItem('im-reader-language',lang);}catch{}drawReference();});controls.append(button);}
    drawReference();wrap.append(controls,panel);
    openDetail(kind==='trait'?T.traitName(label,id):T.name(id),wrap,trigger);

  }

  $('profiles').addEventListener('click',event=>{

    const content=node('div',null,{class:'profile-index'});

    Object.values(profiles).filter(profile=>profile.section===state.section).forEach(profile=>{

      const button=node('button',T.name(profile.id),{type:'button'});

      button.addEventListener('click',()=>showReference({kind:'profile',id:profile.id,trigger:event.currentTarget}));

      content.append(button);

    });

    openDetail('Докладні профілі',content,event.currentTarget);

  });

  $('glossary').addEventListener('click',event=>{

    const content=node('div'), input=node('input',null,{type:'search',placeholder:'Знайти рису або стан…','aria-label':'Пошук у словнику'}), list=node('div',null,{class:'glossary-list'});

    const entries=[...Object.entries(raw.traits).map(([id,value])=>({id,value,kind:'Риса'})),...Object.entries(raw.conditions).map(([id,value])=>({id,value,kind:'Стан'}))].sort((a,b)=>T.text(a.id).localeCompare(T.text(b.id),'uk'));

    function draw() {

      const visible=entries.filter(entry=>L.searchMatches({name:entry.id,text:entry.value,translation:T.text(entry.value),label:T.text(entry.id)},input.value));

      list.replaceChildren(...visible.map(entry=>{

        const details=node('details');details.append(node('summary',T.name(entry.id)+' · '+entry.kind));

        const body=node('p');body.append(rich(entry.value,{linkProfiles:false}));details.append(body);return details;

      }));

      if(!visible.length)list.append(node('p','Відповідних рис або станів не знайдено.'));

    }

    input.addEventListener('input',draw);draw();content.append(input,list);openDetail('Риси та стани',content,event.currentTarget);

  });

  if(state.section==='mutations') {
    let language='uk';try{language=localStorage.getItem('im-mutation-language')==='en'?'en':'uk';}catch{}
    function setMutationLanguage(value){
      language=value;T.setLanguage(language);
      document.querySelectorAll('[data-mutation-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mutationLanguage===language)));
      $('tableWrap').lang=language;
      try{localStorage.setItem('im-mutation-language',language);}catch{}
      render(false);
    }
    document.querySelectorAll('[data-mutation-language]').forEach(button=>button.addEventListener('click',()=>setMutationLanguage(button.dataset.mutationLanguage)));
    setMutationLanguage(language);
  }else render(false);
})();
