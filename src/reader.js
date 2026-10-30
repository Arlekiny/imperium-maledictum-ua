(function(){
 'use strict';
 const records=JSON.parse(document.getElementById('reader-data').textContent), byId=new Map(records.map(r=>[r.id,r]));
 const sectionNames=Object.fromEntries(CATALOG.map(s=>[s.id,s.title]));
 const key='im-reference-favourites-v1';let saved=new Set(),activeTrigger=null,currentDraw=null;
 function node(tag,text,attrs={}){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
 function button(text,fn,attrs={}){const e=node('button',text,{type:'button',...attrs});e.addEventListener('click',fn);return e;}
 function load(){try{const value=JSON.parse(localStorage.getItem(key)||'[]');saved=new Set(Array.isArray(value)?value.filter(id=>typeof id==='string'&&byId.has(id)):[]);}catch{saved=new Set();}}
 load();
 const dialog=node('dialog',undefined,{class:'reader-dialog','aria-labelledby':'reader-title'}),head=node('div',undefined,{class:'reader-head'}),title=node('h2','',{id:'reader-title'}),body=node('div'),status=node('p','',{class:'reader-status',role:'status'});
 head.append(title,button('Закрити ×',()=>dialog.close(),{class:'reader-action','aria-label':'Закрити вікно'}));dialog.append(head,body,status);document.body.append(dialog);
 function open(text,draw){activeTrigger=document.activeElement;currentDraw=draw;title.textContent=text;body.replaceChildren();status.textContent='';draw();if(!dialog.open)dialog.showModal();(body.querySelector('input')||head.querySelector('button')).focus();}
 dialog.addEventListener('close',()=>{currentDraw=null;activeTrigger?.focus();});
 function persist(){try{localStorage.setItem(key,JSON.stringify([...saved]));status.textContent='';}catch{status.textContent='Браузер не дозволяє збереження. Обране доступне лише до закриття сторінки.';}syncStars();}
 function toggle(id){saved.has(id)?saved.delete(id):saved.add(id);persist();}
 function svgIcon(kind){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
  const paths={star:'M12 3 14.8 8.7 21 9.6 16.5 14 17.6 20.2 12 17.3 6.4 20.2 7.5 14 3 9.6 9.2 8.7Z',link:'M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7',search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5',calculator:'M5 3h14v18H5Z M8 6h8v4H8Z M8 13h1 M12 13h1 M16 13h.1 M8 17h1 M12 17h1 M16 17h.1'};
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[kind]);svg.append(path);return svg;
 }
 function iconButton(kind,label,fn,attrs={}){const b=button('',fn,{class:'reader-icon',title:label,'aria-label':label,...attrs});b.append(svgIcon(kind));return b;}
 function star(r){return iconButton('star','Додати до обраного',()=>{toggle(r.id);if(dialog.open&&title.textContent==='Обране')currentDraw?.();},{'data-favourite':r.id});}
 function linkButton(r){return iconButton('link','Копіювати посилання',()=>copy(r));}
 function more(r){return button('Докладніше',()=>details(r),{class:'reader-more','aria-haspopup':'dialog'});}
 function syncStars(){document.querySelectorAll('[data-favourite]').forEach(b=>{const on=saved.has(b.dataset.favourite);b.setAttribute('aria-pressed',String(on));const label=on?'Прибрати з обраного':'Додати до обраного';b.setAttribute('aria-label',label);b.title=label;});}
 function href(r){const u=new URL(ArchiveNavigation.FILES[r.section],document.baseURI);u.hash='/'+r.section+'/'+r.table+'?entry='+encodeURIComponent(r.id);return u.href;}
 const toast=node('p','',{class:'reader-toast',role:'status',hidden:''});document.body.append(toast);let toastTimer;
 function announce(text){toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},2500);}
 async function copy(r){const value=href(r);try{await navigator.clipboard.writeText(value);announce('Посилання скопійовано.');}catch{open('Посилання на запис',()=>{const input=node('input',undefined,{type:'text',readonly:'','aria-label':'Посилання для копіювання'});input.value=value;body.append(node('p','Скопіюйте посилання:'),input);input.select();});}}
 function details(r){
  const native=document.querySelector('[data-archive-entry="'+CSS.escape(r.id)+'"] .talent-more');
  if(native){dialog.close();native.click();return;}
  open(entryName(r),()=>{
   let language='uk';try{language=localStorage.getItem('im-reader-language')==='en'?'en':'uk';}catch{}const controls=node('div',undefined,{class:'reader-language',role:'group','aria-label':'Мова опису'}),content=node('div');controls.append(node('span','Мова опису:',{class:'reader-language-label'}));
   function draw(){content.replaceChildren();content.lang=language;controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===language)));
    for(const [label,en,uk] of r.fields){const text=language==='uk'?uk:en;if(!text)continue;const block=node('div');block.append(node('strong',(globalThis.ArchiveLocale?.header(label)||label)+': '),node('span',plain(text)));content.append(block);}
   }
   for(const [lang,label] of [['uk','Українська'],['en','English (оригінал)']])controls.append(button(label,()=>{language=lang;try{localStorage.setItem('im-reader-language',lang);}catch{}draw();},{'data-language':lang}));
   body.append(node('p',r.book?'Текст книги · '+r.book:'Довідковий запис. Англійська версія відповідає джерелу даних; вона може бути скороченим авторським описом.',{class:'reader-meta'}),controls,content);if(r.citation)body.append(node('p',r.citation,{class:'reader-meta'}));draw();
  });
 }
 function plain(value){return String(value).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
 function entryName(r){return r.uk===r.en || r.uk.includes('('+r.en+')')?r.uk:r.uk+' ('+r.en+')';}
 function card(r){const el=node('article',undefined,{class:'reader-result'}),a=node('a',entryName(r),{href:href(r)});el.append(a,node('div',sectionNames[r.section]+' · '+r.title,{class:'reader-meta'}));const desc=r.fields.find(([k])=>['Description','Effect','Traits'].includes(k));if(desc)el.append(node('p',plain(desc[2]).slice(0,240)));
  if(r.table!=='names'){const controls=node('div',undefined,{class:'reader-actions'});controls.append(more(r),star(r),linkButton(r));el.append(controls);}return el;}
 const fold=ArchiveSearch.fold,findRecords=ArchiveSearch.create(records);
 function search(initialQuery=''){open('Пошук по всьому довіднику',()=>{const input=node('input',undefined,{type:'search',placeholder:'Назва, правило або ефект…','aria-label':'Пошук по всьому сайту'}),count=node('p','',{role:'status'}),list=node('div');function draw(){const terms=fold(input.value).trim().split(/\s+/).filter(Boolean);const found=terms.length?findRecords(input.value):[];count.textContent=terms.length?'Знайдено: '+found.length+(found.length>100?' · показано перші 100':''):'Введіть запит українською або англійською.';list.replaceChildren(...found.slice(0,100).map(card));syncStars();}input.value=initialQuery;input.addEventListener('input',draw);body.append(input,count,list);draw();});}
 function favourites(){open('Обране',()=>{
  body.replaceChildren();const tools=node('div',undefined,{class:'reader-actions'}),input=node('input',undefined,{type:'file',accept:'application/json,.json',hidden:''});
  tools.append(button('Експорт',()=>{const blob=new Blob([JSON.stringify({version:1,ids:[...saved]},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a','',{href:url,download:'imperium-maledictum-favourites.json'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},{class:'reader-action'}),button('Імпорт',()=>input.click(),{class:'reader-action'}));
  input.addEventListener('change',async()=>{const file=input.files[0];if(!file)return;try{if(file.size>1000000)throw Error();const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.ids)||data.ids.some(id=>typeof id!=='string'))throw Error();let added=0;for(const id of data.ids)if(byId.has(id)){if(!saved.has(id))added++;saved.add(id);}persist();currentDraw?.();status.textContent='Додано записів: '+added;}catch{status.textContent='Не вдалося прочитати файл обраного. Потрібен JSON, експортований цим довідником.';}});
  body.append(node('p','Обране зберігається в цьому браузері. Експорт дозволяє перенести його на інший пристрій.',{class:'reader-meta'}),tools,input);
  const items=records.filter(r=>saved.has(r.id));body.append(...(items.length?items.map(card):[node('p','Позначте потрібні записи зірочкою в таблицях або пошуку.')]));syncStars();
 });}
 function combat(){open('Шпаргалка бою',()=>{
 const rules=[['Дистанції · Core 201–202','Безпосередня — у межах досяжності рук. Коротка — ваша Зона. Середня — сусідня Зона. Довга — дві Зони. Екстремальна — три чи більше Зон.'],['Рух · Core 202','Звичайна швидкість: переміщення всередині Зони — Вільна дія; до сусідньої — Рух; на дві Зони — Рух і Біг. Висока швидкість: Рух до двох Зон. Низька швидкість: Рух усередині Зони; до сусідньої потрібен Біг.'],['Дальня атака · Core 212','Атака за межами дальності зброї має Перешкоду. Стрільба на Безпосередній дистанції має Перешкоду, якщо риса зброї не скасовує її.'],['Шкода та ухилення · Core 212','Успішна дальня атака: Шкода зброї + РУ, потім відніміть Броню ділянки влучання. При зустрічному Ухиленні додається різниця РУ. Від невідомого вам стрільця звичайна людина ухилитися не може.'],['Вихід із ближнього бою · Core 212','Відхід від противника, з яким ви зв’язані ближнім боєм, дозволяє йому атакувати Реакцією. Дія Вихід із бою дозволяє відійти безпечно.']];
 for(const [heading,text] of rules){const d=node('details',undefined,{class:'reader-result'});d.append(node('summary',heading),node('p',text));body.append(d);}
 for(const table of ['combatActions','conditions','environmentalTraits']){const rows=records.filter(r=>r.table===table);body.append(node('h3',rows[0]?.title||table));for(const r of rows){const d=node('details',undefined,{class:'reader-result'});d.append(node('summary',r.uk));for(const [k,en,uk] of r.fields)if(!['Name','Source'].includes(k))d.append(node('p',plain(uk)));body.append(d);}}});}
 function calculator(){open('Калькулятор покращень характеристик',()=>{
  const tiers=JSON.parse(document.getElementById('reader-config').textContent),fields=node('div',undefined,{class:'reader-calc-fields'}),a=node('input',undefined,{type:'number',min:20,max:79,step:1,value:40,'aria-label':'Поточне значення'}),b=node('input',undefined,{type:'number',min:21,max:80,step:1,value:50,'aria-label':'Бажане значення'}),result=node('p','',{role:'status',class:'reader-calc-total'}),wrap=node('div',undefined,{class:'reader-calc-table'});
  for(const [text,input] of [['Поточне значення',a],['Бажане значення',b]]){const label=node('label',text);label.append(input);fields.append(label);}
  function draw(){wrap.replaceChildren();const from=Number(a.value),to=Number(b.value);if(a.value===''||b.value===''||!Number.isInteger(from)||!Number.isInteger(to)||from<20||from>79||to<=from||to>80){result.textContent='Введіть цілі числа: поточне — 20–79, бажане — більше поточного, до 80.';return;}
   let total=0;const table=node('table'),header=node('tr');for(const text of ['Нові значення','Підвищень','Ціна за 1','Разом'])header.append(node('th',text,{scope:'col'}));const head=node('thead');head.append(header);table.append(head);const rows=node('tbody');
   for(const tier of tiers){const [lo,hi]=tier['New Value'].split('-').map(Number),start=Math.max(from+1,lo),end=Math.min(to,hi);if(end<start)continue;const count=end-start+1,cost=count*tier['Cost per Advance'];total+=cost;const tr=node('tr');for(const text of [start===end?start:start+'–'+end,count,tier['Cost per Advance'],cost])tr.append(node('td',text));rows.append(tr);}
   table.append(rows);wrap.append(table);result.textContent=total.toLocaleString('uk-UA')+' ОД';
  }
  a.addEventListener('input',draw);b.addEventListener('input',draw);body.append(fields,result,wrap);draw();
 });}
 const menu=node('dialog',undefined,{class:'reader-side-menu','aria-labelledby':'reader-menu-title'}),menuHead=node('div',undefined,{class:'reader-head'});menuHead.append(node('h2','Меню',{id:'reader-menu-title'}),button('Закрити ×',()=>menu.close(),{class:'reader-action','aria-label':'Закрити меню'}));menu.append(menuHead);
 const menuToggle=button('☰ Меню',()=>{menuToggle.setAttribute('aria-expanded','true');menu.showModal();menu.querySelector('button').focus();},{class:'reader-menu-toggle','aria-haspopup':'dialog','aria-expanded':'false'});
 menu.addEventListener('close',()=>{menuToggle.setAttribute('aria-expanded','false');menuToggle.focus();});menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)menu.close();}});
 function menuAction(label,fn){menu.append(button(label,()=>{menu.close();fn();activeTrigger=menuToggle;},{class:'reader-menu-item'}));}
 menuAction('Обране',favourites);menuAction('Шпаргалка бою',combat);const menuNav=node('nav',undefined,{'aria-label':'Розділи довідника'});for(const s of CATALOG)menuNav.append(node('a',s.title,{href:ArchiveNavigation.FILES[s.id]}));menu.append(menuNav);document.body.append(menu);
 const toolbar=node('form',undefined,{class:'reader-tools archive-search',role:'search','aria-label':'Пошук по архіву'}),globalInput=node('input',undefined,{type:'search',class:'archive-search-input',placeholder:'Пошук по архіву','aria-label':'Пошук по архіву',autocomplete:'off'}),suggestions=node('div',undefined,{class:'archive-search-results',hidden:''});
 toolbar.append(svgIcon('search'),globalInput,suggestions);toolbar.addEventListener('submit',event=>{event.preventDefault();suggestions.hidden=true;search(globalInput.value);});
 function suggest(){const terms=fold(globalInput.value).trim().split(/\s+/).filter(Boolean);suggestions.replaceChildren();suggestions.hidden=!terms.length;if(!terms.length)return;const found=findRecords(globalInput.value);if(!found.length){suggestions.append(node('p','В архіві нічого не знайдено.'));return;}for(const r of found.slice(0,8)){const a=node('a',entryName(r),{href:href(r)});a.append(node('span',sectionNames[r.section]+' · '+r.title));a.addEventListener('click',()=>{suggestions.hidden=true;});suggestions.append(a);}suggestions.append(button('Усі результати ('+found.length+')',()=>{suggestions.hidden=true;search(globalInput.value);}));}
 globalInput.addEventListener('input',suggest);globalInput.addEventListener('keydown',event=>{if(event.key==='Escape'){suggestions.hidden=true;event.stopPropagation();}});document.addEventListener('click',event=>{if(!toolbar.contains(event.target))suggestions.hidden=true;});
 const masthead=document.querySelector('.masthead');masthead.append(menuToggle);const archiveNav=document.querySelector('.page-navigation,#navigation');archiveNav.hidden=false;archiveNav.classList.add('archive-navigation');masthead.after(archiveNav);archiveNav.prepend(toolbar);
 new MutationObserver(()=>{if(toolbar.parentElement!==archiveNav)archiveNav.prepend(toolbar);}).observe(archiveNav,{childList:true});

 const theme=document.getElementById('theme'),calcButton=iconButton('calculator','Калькулятор',calculator,{class:'reader-icon reader-calculator'}),headerTools=node('div',undefined,{class:'reader-header-tools'});theme.before(headerTools);headerTools.append(theme,calcButton);
 const back=button('↑ До пошуку',()=>{toolbar.scrollIntoView({behavior:'smooth',block:'start'});globalInput.focus({preventScroll:true});},{class:'reader-back',hidden:''});document.body.append(back);window.addEventListener('scroll',()=>{back.hidden=scrollY<600;},{passive:true});
 let queued=false;
 function decorate(){queued=false;
  document.querySelectorAll('#skillsBody tr').forEach((tr,i)=>{if(!tr.dataset.archiveEntry)tr.dataset.archiveEntry='skills:'+i;});
  document.querySelectorAll('#talentsBody tr').forEach((tr,i)=>{if(!tr.dataset.archiveEntry)tr.dataset.archiveEntry='talents:'+i;});
  document.querySelectorAll('[data-archive-entry]').forEach(tr=>{
   if(tr.dataset.readerReady)return;const r=byId.get(tr.dataset.archiveEntry);if(!r)return;tr.dataset.readerReady='true';if(r.table==='names')return;
   const table=tr.closest('table'),headRow=table.querySelector('thead tr');let target=tr.querySelector('.col-Description,.col-Effect,.desc');
   if(!target){if(!headRow.querySelector('.reader-description-heading'))headRow.insertBefore(node('th','Опис',{scope:'col',class:'reader-description-heading'}),headRow.querySelector('.reader-tools-heading'));target=node('td',undefined,{class:'reader-description-cell','data-label':'Опис'});tr.append(target);}
   if(!tr.querySelector('.talent-more')){const controls=node('div',undefined,{class:'reader-detail-actions'});controls.append(more(r));target.append(controls);}
   if(!headRow.querySelector('.reader-tools-heading'))headRow.append(node('th','Дії',{scope:'col',class:'reader-tools-heading'}));
   const cell=node('td',undefined,{class:'reader-row-tools','data-label':'Дії'});cell.append(star(r),linkButton(r));tr.append(cell);
  });
  document.querySelectorAll('.all-table-section').forEach(section=>{if(section.dataset.readerReady)return;section.dataset.readerReady='true';const wrap=section.querySelector('.table-scroll');if(!wrap)return;const b=button('Згорнути таблицю',()=>{wrap.hidden=!wrap.hidden;b.textContent=wrap.hidden?'Розгорнути таблицю':'Згорнути таблицю';b.setAttribute('aria-expanded',String(!wrap.hidden));},{class:'reader-collapse reader-action','aria-expanded':'true'});section.querySelector('h3').after(b);});syncStars();highlight();
 }
 function highlight(){const value=new URLSearchParams(location.hash.split('?')[1]||'').get('entry');if(!value)return;const target=document.querySelector('[data-archive-entry="'+CSS.escape(value)+'"]');if(!target||target.dataset.readerHighlighted)return;document.querySelectorAll('.reader-highlight').forEach(el=>el.classList.remove('reader-highlight'));target.dataset.readerHighlighted='true';target.classList.remove('hidden');target.classList.add('reader-highlight');target.closest('.table-scroll')?.removeAttribute('hidden');target.scrollIntoView({block:'center'});}
 const observed=document.querySelector('#tableWrap')||document.querySelector('#talentsBody')?.parentElement?.parentElement;
 if(observed)new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(decorate);}}).observe(observed,{childList:true,subtree:true});
 window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();document.querySelectorAll('[data-reader-highlighted]').forEach(el=>delete el.dataset.readerHighlighted);queueMicrotask(highlight);});
 window.addEventListener('storage',event=>{if(event.key===key){load();syncStars();if(dialog.open&&title.textContent==='Обране')currentDraw?.();}});
 document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();globalInput.focus();globalInput.select();}});
 decorate();
})();
