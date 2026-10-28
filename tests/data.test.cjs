const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const L=require('../src/logic.js');
const {CATALOG,BOOKS}=require('../src/catalog.js');
const root=path.resolve(__dirname,'..');
const raw=Object.fromEntries(fs.readdirSync(path.join(root,'src/data')).filter(f=>f.endsWith('.json')).map(f=>[f.slice(0,-5),JSON.parse(fs.readFileSync(path.join(root,'src/data',f),'utf8'))]));
const {tables,profiles}=L.normalise(raw,CATALOG);
const report=L.validate(raw,CATALOG);
test('all 34 required tables and 14 auxiliary profiles validate',()=>{
  assert.deepEqual(report.errors,[]);assert.equal(report.tableCount,34);assert.equal(report.profileCount,14);
  assert.equal(CATALOG.length,10);assert.equal(BOOKS.length,4);
});
for (const [id,count] of Object.entries(L.EXPECTED)) test(id+': exact count, all keys and all values retained',()=>{
  const table=tables[id];assert.equal(table.rows.length,count);
  let expected;
  if(id==='names')expected=raw.names.names.data;
  else if(['Head','Arm','Body','Leg'].includes(id))expected=raw.criticalWounds.CriticalWounds[id];
  else if(['traits','conditions'].includes(id))expected=Object.entries(raw[id]).map(([Name,Description])=>({Name,Description}));
  else expected=raw[id];
  assert.deepEqual(table.rows,expected);
  assert.deepEqual(new Set(table.headers),new Set(expected.flatMap(row=>Object.keys(row))));
  assert.equal(L.filterRows(table.rows,{query:'',books:L.BOOK_IDS}).length,count);
  assert.equal(L.filterRows(table.rows,{query:'unfindable-xyz-948673'}).length,0);
});
test('every auxiliary profile preserves id, type, declared columns and data',()=>{
  for(const original of [...raw.psyDetailProfiles,...raw.toolDetailProfiles]){
    const {sourceFile,section,...actual}=profiles[original.id];assert.deepEqual(actual,original);
    if(actual.type==='weapon_profile')assert.deepEqual(L.allHeaders(actual.rows,actual.headers),actual.headers);
  }
});
test('all profile references are resolvable and all profiles can be reached by index',()=>{
  for (const [id,uses] of Object.entries(report.profileReferences)){
    assert.ok(profiles[id]);assert.ok(uses.length>0,`No textual use: ${id}`);
    for(const use of uses)assert.ok(raw[use.file.slice(0,-5)][use.row].Effect.includes(id));
  }
});
test('source filters retain source-less rows; books never classified by substring',()=>{
  const rows=[{}, {Source:null},{Source:''},{Source:'  '},...BOOKS.map(book=>({Source:book[2]})),{Source:'Unknown future source'}];
  assert.equal(L.filterRows(rows,{books:[]}).length,4);
  for(const book of BOOKS)assert.equal(L.filterRows(rows,{books:[book[0]]}).length,5);
  assert.equal(L.filterRows(rows).length,9);
  for(const table of Object.values(tables))for(const book of BOOKS){
    const actual=L.filterRows(table.rows,{books:[book[0]]});
    assert.deepEqual(actual,table.rows.filter(row=>!row.Source || row.Source===book[2] || L.SOURCE_ALIASES[row.Source]===book[0]));
  }
});
test('documented Inquisitor spelling variants are included without rewriting raw sources',()=>{
  assert.equal(report.sourceAliasesApplied.length,11);
  assert.equal(new Set(report.sourceAliasesApplied.map(entry=>entry.source)).size,2);
  for(const entry of report.sourceAliasesApplied){
    const row=tables[entry.table].rows[entry.row];
    assert.equal(row.Source,entry.source);
    assert.ok(L.sourceVisible(row,['inquisitor']));assert.ok(!L.sourceVisible(row,['core']));
  }
});
test('search is case/accent/markup insensitive; terms may span different fields',()=>{
  assert.ok(L.searchMatches({Name:'Augmétic Arm',Source:'Core Rulebook'},'CORE augmetic'));
  assert.ok(L.searchMatches({Effect:'<b>Plasma</b> &amp; <em>fire</em>'},'plasma & fire'));
  assert.ok(!L.searchMatches({Effect:'<script>hidden exploit</script>safe'},'exploit'));
  assert.ok(L.filterRows(tables.psyPowers.rows,{query:'Soulsight Table'}).length>0);
});
const sortValues=(key,values,direction='asc')=>L.sortedRows({headers:[key],ordered:false,defaultSort:key},values.map(value=>({[key]:value})),key,direction).map(row=>row[key]);
test('costs, comma thousands, ammunition price and encumbrance sort numerically',()=>{
  assert.deepEqual(sortValues('Cost',['100,000','20','1,000','100','-','x3','x2','Variable']),['20','100','1,000','100,000','x2','x3','Variable','-']);
  assert.deepEqual(sortValues('Cost (Mag)',['1000 (250)','400 (100)','1000 (40)']),['400 (100)','1000 (40)','1000 (250)']);
  assert.deepEqual(sortValues('Encumbrance',['2 (3)','10','1 (3)','1 (2)']),['1 (2)','1 (3)','2 (3)','10']);
});
test('numeric ranges and missing values; formulae are grouped without guessing StrB',()=>{
  assert.deepEqual(sortValues('Roll',['11-20','2-10','1','21+']),['1','2-10','11-20','21+']);
  assert.deepEqual(sortValues('Damage',['10','2','7+StrB','1+StrB','-']),['2','10','1+StrB','7+StrB','-']);
  assert.deepEqual(sortValues('Damage',['10','2','7+StrB','1+StrB','-'],'desc'),['10','2','7+StrB','1+StrB','-']);
  assert.deepEqual(sortValues('Protection',['2d10','1d10+5','1d10']),['1d10','1d10+5','2d10']);
});
test('range bands, availability and difficulty use semantic order',()=>{
  assert.deepEqual(sortValues('Range',['Extreme','Short','Self','Long','Medium','Immediate','Special']),['Self','Immediate','Short','Medium','Long','Extreme','Special']);
  assert.deepEqual(sortValues('Availability',['Exotic','Common','Rare','Scarce','Variable']),['Common','Scarce','Rare','Exotic','Variable']);
  assert.deepEqual(sortValues('Difficulty',['Very Hard (-30)','Difficult (-10)','Easy (+40)','Challenging (+0)','Routine (+20)']),['Easy (+40)','Routine (+20)','Challenging (+0)','Difficult (-10)','Very Hard (-30)']);
});
test('all roll tables and services retain semantic source order even with requested sorting',()=>{
  const ordered=Object.values(tables).filter(table=>table.ordered);assert.equal(ordered.length,16);
  for(const table of ordered){
    assert.deepEqual(L.sortedRows(table,table.rows,table.headers.at(-1),'desc'),table.rows);
    assert.equal(table.defaultSort,null);
  }
});
test('psychic powers default to Discipline; equal values retain source order; input not mutated',()=>{
  const table=tables.psyPowers;assert.equal(table.defaultSort,'Discipline');
  const before=JSON.stringify(table.rows),sorted=L.sortedRows(table,table.rows);
  const disciplines=sorted.map(row=>row.Discipline);assert.deepEqual(disciplines,disciplines.slice().sort());
  assert.equal(JSON.stringify(table.rows),before);
  for(const discipline of new Set(disciplines))assert.deepEqual(sorted.filter(row=>row.Discipline===discipline),table.rows.filter(row=>row.Discipline===discipline));
});
test('route round-trip handles query punctuation, non-Latin text, empty books and sorting',()=>{
  for(const section of CATALOG)for(const spec of section.tables.length?section.tables:[['']]){
    const table=tables[spec[0]];
    const state={section:section.id,table:spec[0],query:'Сила & flame ? # /',books:[],sort:table?.ordered?null:table?.defaultSort,direction:'desc'};
    assert.deepEqual(L.parseRoute(L.routeHash(state),CATALOG,tables),state);
  }
});
test('invalid routes and source keys safely return known defaults',()=>{
  const route=L.parseRoute('#/bad/missing?books=not-a-book&sort=__proto__',CATALOG,tables);
  assert.equal(route.section,'home');assert.equal(route.table,'names');assert.deepEqual(route.books,[]);assert.equal(route.sort,null);
  assert.equal(L.parseRoute('#/psy/psyPowers',CATALOG,tables).sort,'Discipline');
});
test('markup accepts only structural inline/list tags; attributes and active content removed',()=>{
  const input='<p onclick="bad()">Safe <strong style="color:red">bold</strong><br>text <a href="javascript:bad()">link text</a><img src="https://tracker.invalid"><script>bad()</script><svg><script>bad()</script></svg><iframe src="//evil">bad()</iframe></p>';
  const tree=L.markupTree(input),serialized=JSON.stringify(tree);
  for(const forbidden of ['onclick','href','src','style','script','iframe','svg','bad()','https:'])assert.ok(!serialized.includes(forbidden),forbidden);
  assert.equal(L.treeText(tree).trim(),'Safe bold text link text');
  assert.ok(serialized.includes('strong'));assert.ok(serialized.includes('br'));
});
test('encoded tags remain text, malformed entities cannot inject markup',()=>{
  assert.deepEqual(L.markupTree('&lt;img src=x onerror=alert(1)&gt;').children,[{text:'<img src=x onerror=alert(1)>'}]);
  assert.equal(L.decodeEntities('&#x1F4DC; &#0; &#xD800; &unknown;'),'📜 � � &unknown;');
  assert.equal(L.plainText('<b>hello<i> nested</b> tail'),'hello nested tail');
});
test('manifest detects unintentional changes to every distributed upstream JSON',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8'));
  assert.equal(manifest.commit,L.PIN);
  for(const file of manifest.files){
    const bytes=fs.readFileSync(path.join(root,'src/data',file.name));
    assert.equal(bytes.length,file.bytes,file.name+' size');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,file.name+' hash');
  }
});
