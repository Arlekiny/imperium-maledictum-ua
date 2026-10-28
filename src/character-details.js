/* Original English talent excerpts and their Ukrainian translation. */
(function(){
  'use strict';
  const payload=document.getElementById('talent-details-data');
  if(!payload)return;
  const entries=JSON.parse(payload.textContent).talents;
  const dialog=document.getElementById('talentDetail');
  const title=document.getElementById('talentDetailTitle');
  const body=document.getElementById('talentDetailBody');
  const close=document.getElementById('closeTalentDetail');
  const languageButtons=[...dialog.querySelectorAll('[data-talent-language]')];
  const preferenceKey='im-talent-details-language';
  let language='uk',activeIndex=null,trigger=null;
  try{const saved=localStorage.getItem(preferenceKey);if(saved==='en'||saved==='uk')language=saved;}catch{}
  function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
  function render(){
    const entry=entries[activeIndex];
    if(!entry)return;
    const content=language==='uk'?entry.uk:entry;
    title.textContent=TALENTS[activeIndex][0];
    languageButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.talentLanguage===language)));
    body.lang=language;
    const pages=entry.page===entry.endPage?String(entry.page):entry.page+'–'+entry.endPage;
    const citation=node('p',entry.book+' · с. '+pages,'talent-citation');
    const quote=node('blockquote',undefined,'talent-original');quote.lang=language;
    content.paragraphs.forEach(text=>quote.append(node('p',text)));
    body.replaceChildren(citation,quote);
    if(content.related)for(const section of content.related){
      body.append(node('h3',section.title+' · с. '+section.page));
      const extra=node('blockquote',undefined,'talent-original');extra.lang=language;
      section.paragraphs.forEach(text=>extra.append(node('p',text)));body.append(extra);
    }
    if(content.relatedTables)for(const section of content.relatedTables){
      body.append(node('h3',section.title+' · с. '+section.page));
      const wrap=node('div',undefined,'talent-table-scroll');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',section.title);
      const table=node('table');table.lang=language;
      const caption=node('caption',section.title);table.append(caption);
      const head=node('thead'),header=node('tr');
      section.headers.forEach(text=>{const th=node('th',text);th.scope='col';header.append(th);});head.append(header);table.append(head);
      const rows=node('tbody');section.rows.forEach(row=>{const tr=node('tr');row.forEach((text,index)=>{const td=node('td',text);td.dataset.label=section.headers[index];tr.append(td);});rows.append(tr);});table.append(rows);wrap.append(table);body.append(wrap);
    }
    body.scrollTop=0;
  }
  function show(index,button){
    if(!entries[index])return;
    activeIndex=index;trigger=button;render();
    dialog.showModal();close.focus();
  }
  languageButtons.forEach(button=>button.addEventListener('click',()=>{
    language=button.dataset.talentLanguage;
    try{localStorage.setItem(preferenceKey,language);}catch{}
    render();
  }));
  document.querySelectorAll('#talentsBody tr').forEach((row,index)=>{
    const cell=row.querySelector('td.desc');
    if(!cell || !entries[index])return;
    const button=node('button','Докладніше','talent-more');
    button.type='button';button.dataset.talentIndex=String(index);
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','talentDetail');
    button.setAttribute('aria-label','Докладніше: '+TALENTS[index][0]);
    button.addEventListener('click',()=>show(index,button));
    const actions=node('div',undefined,'talent-actions');actions.append(button);cell.append(actions);
  });
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;activeIndex=null;});
})();
