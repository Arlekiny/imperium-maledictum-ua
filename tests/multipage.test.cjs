const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const L=require('../src/logic.js'),N=require('../src/navigation.js'),{CATALOG}=require('../src/catalog.js');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const raw=Object.fromEntries(fs.readdirSync(path.join(root,'src/data')).map(f=>[f.slice(0,-5),JSON.parse(read('src/data/'+f))]));
const original=read('src/character.html');
const all=L.normalise(raw,CATALOG);
const manifest=JSON.parse(read('evidence/build-manifest.json'));
test('exactly ten distinct real section files, not hash aliases or redirects',()=>{
  assert.equal(new Set(Object.values(N.FILES)).size,10);assert.equal(manifest.pages.length,10);
  assert.deepEqual(fs.readdirSync(root).filter(f=>f.endsWith('.html')).sort(),Object.values(N.FILES).sort());
  for(const page of manifest.pages){assert.equal(page.file,N.FILES[page.section]);assert.equal(crypto.createHash('sha256').update(read(page.file)).digest('hex'),page.sha256);}
});
for(const section of CATALOG){
  const file=N.FILES[section.id],html=read(file);
  test(file+': correct identity, complete native relative navigation and no redirects',()=>{
    assert.ok(html.includes('name="archive-section" content="'+section.id+'"'));
    const nav=html.match(/<nav (?:id="navigation" class="navigation"|class="page-navigation") aria-label="(?:Sections|Розділи)">([^]*?)<\/nav>/)[1];
    const links=[...nav.matchAll(/href="([^"]+)" data-section="([^"]+)"([^>]*)/g)];assert.equal(links.length,10);
    for(const [,href,id,attrs] of links){assert.equal(href,N.FILES[id]);assert.ok(fs.existsSync(path.join(root,href)));assert.equal(attrs.includes('aria-current="page"'),id===section.id);}
    assert.ok(!/http-equiv=["']refresh|location\.(?:replace|assign)\s*\(|location\.href\s*=/.test(html));
  });
  test(file+': self-contained CSS/scripts/data, syntax valid and no iframe',()=>{
    assert.ok(!/<(?:iframe|object|embed)\b/i.test(html));
    const icon=html.match(/<link rel="icon" type="image\/png" sizes="64x64" href="data:image\/png;base64,([A-Za-z0-9+/=]+)">/);
    assert.ok(icon,'page has an embedded PNG favicon');
    assert.deepEqual(Buffer.from(icon[1],'base64'),fs.readFileSync(path.join(root,'src/favicon.png')));
    assert.ok(!/<(?:script|img|link|audio|video)\b[^>]*\b(?:src|href)\s*=/i.test(html.replace(icon[0],'')));
    assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/.test(html));
    assert.ok(!/<script[^>]+type=["']module|\bimport\s*\(|url\s*\(\s*["']?(?:https?:|\/\/)/i.test(html));
    assert.ok(html.includes("connect-src 'none'"));assert.ok(!/\{\{[A-Z]+\}\}/.test(html));
    for(const match of html.matchAll(/<script>([^]*?)<\/script>/g))new vm.Script(match[1]);
  });
  if(section.id!=='character')test(file+': local payload contains exactly its own tables, all fields and referenced profiles',()=>{
    const data=JSON.parse(html.match(/<script id="archive-data" type="application\/json">([^]*?)<\/script>/)[1]);
    const actual=L.normalise(data,[section]);
    assert.deepEqual(Object.keys(actual.tables),section.tables.map(t=>t[0]));
    for(const [id,table] of Object.entries(actual.tables))assert.deepEqual(table,all.tables[id]);
    assert.deepEqual(actual.profiles,all.profiles);assert.deepEqual(data.traits,raw.traits);assert.deepEqual(data.conditions,raw.conditions);
    for(const [key,value] of Object.entries(data))assert.deepEqual(value,raw[key]);
    const wrong=L.parseRoute('#/not-this-page/missing?q=%26%3F%23&books=core',[section],actual.tables);
    assert.equal(wrong.section,section.id);assert.equal(wrong.table,section.tables[0][0]);assert.equal(wrong.query,'&?#');assert.deepEqual(wrong.books,['core']);
  });
}
test('Character matches its editable source after removing integration blocks',()=>{
  const html=read('character.html');
  const restored=html.replace(/<!-- classic-v2:([a-z]+):start -->[^]*?<!-- classic-v2:\1:end -->/g,'');
  assert.equal(restored,original);
  const scripts=text=>[...text.matchAll(/<script>([^]*?)<\/script>/g)].map(m=>m[1]);
  assert.deepEqual(scripts(html).slice(0,-1),scripts(original));
  assert.ok(!html.includes('id="books"'));assert.ok(html.includes('id="mobileSort"'));
});
test('all 100 cross-page links resolve under file URLs with spaces without source filters',()=>{
  for(const from of CATALOG)for(const to of CATALOG)for(const books of [N.BOOK_IDS,['core'],['mechanicus','inquisitor'],[]]){
    const href=N.pageHref(to,books),url=new URL(href,'file:///example/with%20spaces/'+N.FILES[from.id]);
    assert.equal(url.pathname,'/example/with%20spaces/'+N.FILES[to.id]);assert.deepEqual(N.booksFromHash(url.hash),N.BOOK_IDS);
    assert.ok(!url.search);assert.ok(!new URLSearchParams(url.hash.split('?')[1]).has('q'));
  }
});
test('books parsed safely when leaving Character and after special-character searches',()=>{
  assert.deepEqual(N.booksFromHash('#/character?books=core,core,invalid&q=%26%3F%23%25%2F'),['core']);
  assert.deepEqual(N.booksFromHash('#/character?books='),[]);
  assert.deepEqual(N.booksFromHash(''),N.BOOK_IDS);
  assert.throws(()=>N.pageHref({id:'../../outside',tables:[]}));
});
test('Character keyboard-select continues to update ascending/descending ARIA state',()=>{
  const events={},attrs={};let sorted=false,arrow='\u25b2';
  const th={setAttribute(k,v){attrs[k]=v;},addEventListener(){},classList:{contains:()=>sorted},querySelector:()=>({textContent:arrow})};
  vm.runInNewContext(read('src/character-adapter.js'),{queueMicrotask:fn=>fn(),document:{getElementById:()=>({setAttribute(){},placeholder:'Search'}),querySelector:()=>({removeAttribute(){}}),querySelectorAll:s=>s==='th[data-key]'?[th]:[],addEventListener(k,v){events[k]=v;}}});
  assert.equal(attrs['aria-sort'],'none');sorted=true;events.change();assert.equal(attrs['aria-sort'],'ascending');arrow='\u25bc';events.change();assert.equal(attrs['aria-sort'],'descending');
});

test('All routes round-trip for every reference section and preserve search',()=>{
  for(const section of CATALOG.filter(section=>section.tables.length>1)){
    const route=L.parseRoute('#/'+section.id+'/all?q=wound',[section],all.tables);
    assert.equal(route.section,section.id);assert.equal(route.table,'all');assert.equal(route.query,'wound');
    assert.deepEqual(L.parseRoute(L.routeHash(route),[section],all.tables),route);
    const rows=section.tables.flatMap(([id])=>all.tables[id].rows);
    assert.equal(rows.length,section.tables.reduce((sum,[id])=>sum+L.EXPECTED[id],0));
  }
});

test('sections with multiple tables open All by default and explicit table links remain usable',()=>{
  for(const section of CATALOG.filter(section=>section.tables.length)){
    const route=L.parseRoute('',[section],all.tables);
    assert.equal(route.table,section.tables.length>1?'all':section.tables[0][0]);
    assert.equal(N.pageHref(section).split('/').at(-1),section.tables.length>1?'all':section.tables[0][0]);
    const id=section.tables[0][0];assert.equal(L.parseRoute('#/'+section.id+'/'+id,[section],all.tables).table,id);
  }
});
