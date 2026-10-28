/* DOM-only renderer: source text is never assigned to innerHTML. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory;
  else root.createArchiveRenderer = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (document, logic, options) {
  'use strict';
  const T=typeof ArchiveLocale==='undefined'?{text:String,label:String,name:String,header:String}:ArchiveLocale;
  const {profiles={},traits={},conditions={},onReference=()=>{}}=options || {};
  const escapeRegex=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function node(tag,text,attributes={}) {
    const element=document.createElement(tag);
    if (text !== undefined && text !== null) element.textContent=String(text);
    for (const [key,value] of Object.entries(attributes)) element.setAttribute(key,String(value));
    return element;
  }
  function reference(label,kind,id) {
    const button=node('button',kind==='trait' && T.traitName?T.traitName(label,id):T.label(label),{type:'button',class:'detail-link','data-reference-kind':kind,'data-reference-id':id,'aria-haspopup':'dialog'});
    button.addEventListener('click',()=>onReference({kind,id,label,trigger:button}));
    return button;
  }
  function textWithReferences(text,{linkProfiles=true,linkConditions=false}={}) {
    const fragment=document.createDocumentFragment();
    const entries=[...(linkProfiles?Object.keys(profiles).flatMap(id=>[...new Set([id,T.text(id)])].map(alias=>({id,alias,kind:'profile'}))):[]),...(linkConditions?Object.keys(conditions).flatMap(id=>[...new Set([id,T.text(id)])].map(alias=>({id,alias,kind:'condition'}))):[])].sort((a,b)=>b.alias.length-a.alias.length);
    if (!entries.length) {fragment.append(document.createTextNode(text)); return fragment;}
    const pattern=new RegExp('(?<![\\p{L}\\p{N}_])('+entries.map(entry=>escapeRegex(entry.alias)).join('|')+')(?![\\p{L}\\p{N}_])','gu');
    const byId=new Map(entries.map(entry=>[entry.alias,entry]));
    let index=0;
    for (const match of text.matchAll(pattern)) {
      fragment.append(document.createTextNode(text.slice(index,match.index)));
      const entry=byId.get(match[1]);
      fragment.append(reference(entry.id,entry.kind,entry.id));
      index=match.index+match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(index)));
    return fragment;
  }
  function rich(value,settings={}) {
    function visit(item) {
      if (Object.hasOwn(item,'text')) return textWithReferences(item.text,settings);
      const element=item.tag?node(item.tag):document.createDocumentFragment();
      item.children.forEach(child=>element.append(visit(child)));
      return element;
    }
    const result=visit(logic.markupTree(T.text(value)));
    if(settings.linkProfiles!==false) for(const id of Object.keys(profiles)) {
      if(String(value).includes(id) && !Array.from(result.querySelectorAll?.('[data-reference-kind="profile"]') || []).some(button=>button.dataset.referenceId===id)) {
        result.append(document.createTextNode(' · '),reference(id,'profile',id));
      }
    }
    return result;
  }
  function traitText(value) {
    const fragment=document.createDocumentFragment();
    // Parse complete traits, keeping nested parameters together. If the field
    // also contains prose, translate it as a whole instead of treating it as a name.
    const chunks=[];let depth=0,start=0;
    const source=String(value ?? '');
    for(let i=0;i<source.length;i++) {
      if(source[i]==='(')depth++;
      else if(source[i]===')')depth--;
      else if(source[i]===',' && depth===0){chunks.push(source.slice(start,i));start=i+1;}
    }
    chunks.push(source.slice(start));
    const parsed=chunks.map(chunk=>{
      const text=chunk.trim();
      const name=Object.keys(traits).sort((a,b)=>b.length-a.length).find(id=>text===id || text.startsWith(id+' (') || text.startsWith(id+'('));
      if(!name)return null;
      const suffix=text.slice(name.length).trim();
      if(suffix){
        if(suffix[0]!=='(')return null;
        let level=0;
        for(let i=0;i<suffix.length;i++){
          if(suffix[i]==='(')level++;
          else if(suffix[i]===')')level--;
          if(level===0 && i!==suffix.length-1)return null;
        }
        if(level!==0)return null;
      }
      return {text,name};
    });
    if(parsed.some(item=>!item))return rich(source,{linkConditions:true});
    parsed.forEach(({text,name},index)=>{
      if(index)fragment.append(document.createTextNode(', '));
      fragment.append(reference(text,'trait',name));
    });
    return fragment;
  }
  function dataTable(headers,rows,{caption='',tableId='',sort=null,direction='asc',onSort=null,linkConditions=true}={}) {
    const table=node('table',null,{class:'data-table'});
    if (tableId) table.id=tableId;
    if (caption) table.append(node('caption',caption,{class:'sr'}));
    const head=node('thead'), headRow=node('tr');
    headers.forEach(key=>{
      const th=node('th',null,{scope:'col'});
      if (onSort) {
        th.setAttribute('aria-sort',sort===key?(direction==='asc'?'ascending':'descending'):'none');
        const button=node('button',T.header(key)+(sort===key?(direction==='asc'?' ▲':' ▼'):''),{type:'button','data-sort-key':key});
        button.addEventListener('click',()=>onSort(key));
        th.append(button);
      } else th.textContent=T.header(key);
      headRow.append(th);
    });
    head.append(headRow);table.append(head);
    const body=node('tbody');
    rows.forEach(row=>{
      const tr=node('tr');
      headers.forEach(key=>{
        const td=node('td',null,{'data-label':T.header(key),class:'col-'+key.replace(/[^a-zA-Z0-9_-]/g,'-')});
        const value=row[key] ?? '';
        td.append(key==='Traits'?traitText(value):key==='Name'?rich(T.name(value),{linkConditions}):key==='Source'?node('span',value):rich(value,{linkConditions}));
        tr.append(td);
      });
      body.append(tr);
    });
    table.append(body);
    return table;
  }
  function profile(id) {
    const p=profiles[id];
    if (!p) throw new Error('Unknown detail profile: '+id);
    const wrap=node('div',null,{class:'table-scroll'});
    if (p.type==='sl_table') {
      const container=document.createDocumentFragment();
      container.append(node('p',T.text(p.header),{class:'note'}));
      const keys=logic.allHeaders(p.table,['sl','effect']);
      // Display labels preserve the underlying schema and every field.
      const rows=p.table.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key==='sl'?'SL':key==='effect'?'Effect':key,value])));
      wrap.append(dataTable(keys.map(key=>key==='sl'?'SL':key==='effect'?'Effect':key),rows,{caption:id}));
      container.append(wrap);return container;
    }
    if (p.type==='weapon_profile') {wrap.append(dataTable(logic.allHeaders(p.rows,p.headers),p.rows,{caption:id}));return wrap;}
    throw new Error('Unknown detail profile type: '+p.type);
  }
  return {node,rich,reference,traitText,dataTable,profile};
});
