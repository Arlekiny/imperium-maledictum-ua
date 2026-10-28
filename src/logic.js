/* Pure reference-data logic. Shared by both offline editions and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ArchiveLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PIN = '3eb35603a7e7372c83ea3d366f233d763c4ab52c';
  const EXPECTED = Object.freeze({names:25,augmetics:29,combatActions:22,traits:27,conditions:13,environmentalTraits:9,hitLocations:6,fumbles:10,clothingAndPersonalGear:31,tools:66,medicaeEquipement:13,armour:46,forceFields:3,armourModifications:7,psyPowers:91,psychicPhenomena:15,perilsOfTheWarp:19,cityHiveTravel:4,planetaryTravel:4,systemTravel:4,interstellarTravel:4,accomodationsServices:4,provisionsServices:4,medicalServices:4,rangedWeapons:104,meleeWeapons:73,explosiveWeapons:26,customAmmunitions:18,weaponModifications:19,Head:15,Arm:15,Body:15,Leg:15,injuries:6});
  const BOOK_NAMES = Object.freeze({core:'Core Rulebook',mechanicus:"Adeptus Mechanicus Player's Guide",inquisitor:"Inquisitor Player's Guide",macharian:'Macharian Requisition Guide'});
  const BOOK_IDS = Object.keys(BOOK_NAMES);
  // Exact spelling variants present in the pinned source; raw values are preserved.
  const SOURCE_ALIASES = Object.freeze({"Inquisitor's Player's Guide":'inquisitor',"Inquisition Player's Guide":'inquisitor'});
  const ALLOWED_TAGS = new Set(['b','strong','i','em','u','br','p','ul','ol','li','sup','sub']);
  const collator = new Intl.Collator('uk', {numeric:true,sensitivity:'base'});
  function decodeEntities(text) {
    return String(text).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, entity) => {
      const e = entity.toLowerCase();
      const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'};
      if (Object.hasOwn(named,e)) return named[e];
      const n = e.startsWith('#x') ? parseInt(e.slice(2),16) : parseInt(e.slice(1),10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '\ufffd';
    });
  }
  // Produces an inert tree. No HTML parser, attributes, URLs, handlers or scripts are retained.
  function markupTree(value) {
    const cleaned = String(value ?? '')
      .replace(/<!--[^]*?(?:-->|$)/g,'')
      .replace(/<(script|style|iframe|object|template|svg|math)\b[^>]*>[^]*?(?:<\/\1\s*>|$)/gi,'');
    const root = {tag:null,children:[]}, stack = [root];
    for (const part of cleaned.split(/(<\/?[a-z][^>]*>)/gi)) {
      if (!part) continue;
      const m = part.match(/^<(\/?)([a-z][a-z\d]*)\b[^>]*>$/i);
      if (!m) { stack.at(-1).children.push({text:decodeEntities(part)}); continue; }
      const tag = m[2].toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) continue;
      if (m[1]) {
        const index = stack.findLastIndex(node => node.tag === tag);
        if (index > 0) stack.length = index;
      } else {
        const node = {tag,children:[]};
        stack.at(-1).children.push(node);
        if (tag !== 'br' && !/\/\s*>$/.test(part)) stack.push(node);
      }
    }
    return root;
  }
  function treeText(node) {
    if (Object.hasOwn(node,'text')) return node.text;
    const text = node.children.map(treeText).join('');
    return ['br','p','li'].includes(node.tag) ? text + ' ' : text;
  }
  const plainText = value => treeText(markupTree(value));
  const folded = value => plainText(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
  function allHeaders(rows, preferred = []) {
    return [...new Set([...preferred,...rows.flatMap(row => Object.keys(row))])];
  }
  function normalise(raw, catalog) {
    const tables = {}, profiles = {};
    for (const section of catalog) for (const [id,title,order] of section.tables) {
      let rows, headers, file = id + '.json', pointer = '/';
      if (id === 'names') {
        rows = raw.names.names.data; headers = raw.names.names.headers; pointer = '/names/data';
      } else if (['Head','Arm','Body','Leg'].includes(id)) {
        rows = raw.criticalWounds.CriticalWounds[id]; file = 'criticalWounds.json'; pointer = '/CriticalWounds/' + id;
      } else if (['traits','conditions'].includes(id)) {
        rows = Object.entries(raw[id]).map(([Name,Description]) => ({Name,Description}));
      } else rows = raw[id];
      if (!Array.isArray(rows)) throw new Error('Expected rows for ' + id);
      tables[id] = {id,title,section:section.id,rows,headers:allHeaders(rows,headers),file,pointer,ordered:['roll','ordered'].includes(order),defaultSort:['roll','ordered'].includes(order)?null:(order || Object.keys(rows[0] || {})[0])};
    }
    for (const file of ['psyDetailProfiles','toolDetailProfiles']) {
      if (!Array.isArray(raw[file])) throw new Error('Missing profile file: ' + file);
      for (const profile of raw[file]) {
        if (Object.hasOwn(profiles,profile.id)) throw new Error('Duplicate profile: ' + profile.id);
        profiles[profile.id] = {...profile,sourceFile:file+'.json',section:file.startsWith('psy')?'psy':'equipment'};
      }
    }
    return {tables,profiles};
  }
  function sourceVisible(row, activeBooks) {
    if (row.Source === undefined || row.Source === null || String(row.Source).trim() === '') return true;
    // Unknown explicit sources are visible only when all books are selected, never silently classified.
    if (BOOK_IDS.every(id => activeBooks.includes(id))) return true;
    return activeBooks.some(id => BOOK_NAMES[id] === row.Source || SOURCE_ALIASES[row.Source] === id);
  }
  function searchMatches(row, query) {
    const terms = folded(query).trim().split(/\s+/).filter(Boolean);
    const haystack = Object.values(row).map(value => folded(value)+' '+(typeof ArchiveLocale!=='undefined'?folded(ArchiveLocale.text(value)):'')).join(' ');
    return terms.every(term => haystack.includes(term));
  }
  function filterRows(rows, {query='',books=BOOK_IDS} = {}) {
    return rows.filter(row => sourceVisible(row,books) && searchMatches(row,query));
  }
  function numericTuple(value) {
    const text = plainText(value).trim().replace(/,/g,'').replace(/\u2212/g,'-');
    if (/^[-–—]?$/.test(text)) return [9,0,0];
    const fixed = text.match(/^([+-]?\d+(?:\.\d+)?)(?:\s*\((\d+(?:\.\d+)?|-)\))?\*?$/);
    if (fixed) return [0,Number(fixed[1]),fixed[2] === '-' ? -1 : Number(fixed[2] || 0)];
    const interval = text.match(/^([+-]?\d+(?:\.\d+)?)\s*[-–]\s*([+-]?\d+(?:\.\d+)?)$/);
    if (interval) return [0,Number(interval[1]),Number(interval[2])];
    const lower = text.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:\+|or more)$/i);
    if (lower) return [0,Number(lower[1]),Infinity];
    const dice = text.match(/^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/i);
    // Dice grouped separately; ordered by number of dice, sides, then fixed modifier.
    if (dice) return [1,Number(dice[1]),Number(dice[2]),Number(dice[3] || 0)];
    const formula = text.match(/^([+-]?\d+)\s*\+\s*(StrB|AgB)(.*)$/i);
    if (formula) return [2,formula[2].toLowerCase(),Number(formula[1]),formula[3]];
    const multiplier = text.match(/^[x×]\s*(\d+(?:\.\d+)?)$/i);
    if (multiplier) return [3,Number(multiplier[1])];
    return [8,text];
  }
  function sortTuple(value, key) {
    const text = plainText(value).trim();
    if (key === 'Availability' || key === 'Avail') {
      const i = ['common','scarce','rare','exotic'].indexOf(text.toLowerCase());
      return i < 0 ? [8,text] : [0,i];
    }
    if (key === 'Range') {
      const ranges = ['self','immediate','short','medium','long','extreme'];
      const names = text.toLowerCase().split(/\s*\/\s*/);
      const known = names.map(name => ranges.indexOf(name)).filter(i => i >= 0);
      return known.length ? [0,Math.min(...known),Math.max(...known),text] : [8,text];
    }
    if (key === 'Difficulty') {
      const m = text.match(/\(([+-]?\d+)\)/);
      return m ? [0,-Number(m[1]),text] : [8,text];
    }
    if (['Cost','Cost (Mag)','Encumbrance','Enc','Armour','Overload','Warp Rating','Damage','DMG','Magazine','Protection','Medicae','Corruption','Roll','Units Result','1d100','SL','sl'].includes(key)) return numericTuple(value);
    return [0,typeof ArchiveLocale!=='undefined'?ArchiveLocale.text(text):text];
  }
  function compareTuple(a,b) {
    for (let i=0;i<Math.max(a.length,b.length);i++) {
      const x=a[i] ?? 0, y=b[i] ?? 0;
      const difference=typeof x==='number' && typeof y==='number' ? (x===y?0:x<y?-1:1) : collator.compare(String(x),String(y));
      if (difference) return difference;
    }
    return 0;
  }
  function sortedRows(table, rows, key=table.defaultSort, direction='asc') {
    if (table.ordered || !key || !table.headers.includes(key)) return rows.slice();
    return rows.map((row,index) => ({row,index})).sort((a,b) => {
      const at=sortTuple(a.row[key],key), bt=sortTuple(b.row[key],key);
      // Categories (fixed numbers, formulae, unknown, missing) stay in that order in both directions.
      if (at[0] !== bt[0]) return at[0]-bt[0];
      const result=compareTuple(at.slice(1),bt.slice(1));
      return result*(direction==='desc'?-1:1) || a.index-b.index;
    }).map(item => item.row);
  }
  function parseRoute(hash,catalog,tables) {
    const raw = String(hash || '').replace(/^#\/?/,'');
    const [path,queryString=''] = raw.split('?');
    const bits=path.split('/');
    const section=catalog.find(section=>section.id===bits[0]) || catalog[0];
    const tab=section.tables.find(table=>table[0]===bits[1]) || section.tables[0];
    const all=section.tables.length>1 && (bits[1]==='all' || !bits[1]);
    const table=all?null:(tab?tables[tab[0]]:null);
    const params=new URLSearchParams(queryString);
    const books=params.has('books')?params.get('books').split(',').filter(id=>BOOK_IDS.includes(id)):BOOK_IDS.slice();
    const key=table && table.headers.includes(params.get('sort')) ? params.get('sort') : table?.defaultSort;
    return {section:section.id,table:all?'all':(table?.id || ''),query:params.get('q') || '',books:[...new Set(books)],sort:table?.ordered?null:key,direction:params.get('dir')==='desc'?'desc':'asc'};
  }
  function routeHash(state) {
    const params=new URLSearchParams();
    if (state.query) params.set('q',state.query);
    if (!BOOK_IDS.every(id=>state.books.includes(id))) params.set('books',BOOK_IDS.filter(id=>state.books.includes(id)).join(','));
    if (state.sort) params.set('sort',state.sort);
    if (state.direction==='desc') params.set('dir','desc');
    const query=params.toString();
    return '#/'+state.section+(state.table?'/'+state.table:'')+(query?'?'+query:'');
  }
  function profileReferences(raw,profiles) {
    const references={};
    for (const id of Object.keys(profiles)) {
      references[id]=[];
      for (const file of ['psyPowers','tools']) raw[file].forEach((row,index)=>{
        if (Object.values(row).some(value=>String(value).includes(id))) references[id].push({file:file+'.json',row:index,name:row.Name});
      });
    }
    return references;
  }
  function validate(raw,catalog) {
    const {tables,profiles}=normalise(raw,catalog), errors=[],warnings=[],sourceAliasesApplied=[];
    for (const [id,count] of Object.entries(EXPECTED)) {
      if (!tables[id]) errors.push('Missing table: '+id);
      else if (tables[id].rows.length!==count) errors.push(id+': expected '+count+', got '+tables[id].rows.length);
    }
    for (const id of Object.keys(tables)) if (!Object.hasOwn(EXPECTED,id)) errors.push('Unexpected table: '+id);
    for (const table of Object.values(tables)) table.rows.forEach((row,index)=>{
      for (const [key,value] of Object.entries(row)) {
        if (!table.headers.includes(key)) errors.push(table.id+': hidden field '+key);
        if (value !== null && !['string','number','boolean'].includes(typeof value)) errors.push(table.id+': unsupported field at row '+index+' / '+key);
      }
      if (Object.hasOwn(SOURCE_ALIASES,row.Source)) sourceAliasesApplied.push({table:table.id,row:index,name:row.Name,source:row.Source,book:SOURCE_ALIASES[row.Source]});
      else if (row.Source && !Object.values(BOOK_NAMES).includes(row.Source)) warnings.push(table.id+': unknown Source '+row.Source);
    });
    for (const [file,count] of [['psyDetailProfiles',12],['toolDetailProfiles',2]]) if (raw[file].length!==count) errors.push(file+': expected '+count+' profiles');
    for (const profile of Object.values(profiles)) {
      if (profile.type==='sl_table') {
        if (!Array.isArray(profile.table) || typeof profile.header!=='string') errors.push('Invalid sl_table: '+profile.id);
        else profile.table.forEach(row=>{if (!Object.hasOwn(row,'sl') || !Object.hasOwn(row,'effect')) errors.push('Missing SL/effect: '+profile.id);});
      } else if (profile.type==='weapon_profile') {
        if (!Array.isArray(profile.headers) || !Array.isArray(profile.rows)) errors.push('Invalid weapon_profile: '+profile.id);
        else for (const key of allHeaders(profile.rows)) if (!profile.headers.includes(key)) errors.push('Hidden profile field: '+profile.id+' / '+key);
      } else errors.push('Unknown profile type: '+profile.id);
    }
    const references=profileReferences(raw,profiles);
    for (const [id,uses] of Object.entries(references)) if (!uses.length) warnings.push('Unreferenced profile (available through index): '+id);
    return {pin:PIN,errors,warnings:[...new Set(warnings)],sourceAliasesApplied,tableCount:Object.keys(tables).length,rowCount:Object.values(tables).reduce((sum,table)=>sum+table.rows.length,0),profileCount:Object.keys(profiles).length,profileReferences:references,tables:Object.values(tables).map(({id,title,file,pointer,headers,ordered,defaultSort,rows})=>({id,title,file,pointer,headers,ordered,defaultSort,rows:rows.length}))};
  }
  return {PIN,EXPECTED,BOOK_NAMES,BOOK_IDS,SOURCE_ALIASES,decodeEntities,markupTree,treeText,plainText,folded,allHeaders,normalise,sourceVisible,searchMatches,filterRows,numericTuple,sortTuple,compareTuple,sortedRows,parseRoute,routeHash,profileReferences,validate};
});
