/* Optional maintainer tool. The ten generated HTML files need no build or server. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const L=require('./src/logic.js'),N=require('./src/navigation.js');
const {CATALOG}=require('./src/catalog.js');
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const esc=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const json=value=>JSON.stringify(value).replaceAll('<','\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const raw=Object.fromEntries(fs.readdirSync(path.join(__dirname,'src/data')).filter(name=>name.endsWith('.json')).map(name=>[name.slice(0,-5),JSON.parse(read('src/data/'+name))]));
const translations={...JSON.parse(read('src/locale/glossary.json')),...JSON.parse(read('src/locale/overrides.json'))};
for(const file of fs.readdirSync(path.join(__dirname,'src/locale')).filter(name=>/^review-.*\.json$/.test(name)).sort())Object.assign(translations,JSON.parse(read('src/locale/'+file)));
translations.Special='Особливе';
fs.writeFileSync(path.join(__dirname,'src/locale/uk.json'),JSON.stringify(translations,null,2)+'\n','utf8');
function scopedTranslations(data){const keys=new Set(Object.keys(translations).filter(key=>key.length<90));function visit(value){if(typeof value==='string')keys.add(value);else if(value && typeof value==='object')for(const [key,item] of Object.entries(value)){keys.add(key);visit(item);}}visit(data);return Object.fromEntries([...keys].filter(key=>Object.hasOwn(translations,key)).map(key=>[key,translations[key]]));}
const audit=L.validate(raw,CATALOG);if(audit.errors.length)throw Error(audit.errors.join('\n'));
const original=fs.readFileSync(path.join(__dirname,'original/index.html'));
if(hash(original)!=='61702b39f2342c7c164d299b447be535f1dfe4c13354e453f1ead428f54e30a5')throw Error('Unexpected original Character bytes. Review an intentional change before updating this guard.');
const nav=active=>CATALOG.map(s=>'<a href="'+N.FILES[s.id]+'" data-section="'+s.id+'"'+(s.id===active?' aria-current="page"':'')+'>'+esc(s.title)+'</a>').join('\n');
const marker=(name,value)=>'<!-- classic-v2:'+name+':start -->'+value+'<!-- classic-v2:'+name+':end -->';
const csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; frame-src 'none'; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'";
const favicon='<link rel="icon" type="image/png" sizes="64x64" href="data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'src/favicon.png')).toString('base64')+'">';
const manifest={version:2,date:new Date().toISOString().slice(0,10),sourceCommit:L.PIN,pages:[]};
for(const section of CATALOG){
  let html,dataFiles=[];
  if(section.id==='character'){
    const talentDetails=JSON.parse(read('src/talent-details.json'));
    if(talentDetails.talents.length!==139 || talentDetails.talents.some((entry,index)=>entry.index!==index || !entry.paragraphs.length))throw Error('Incomplete talent excerpts');
    const translated=JSON.parse(read('src/talent-details-uk.json')).talents;
    if(translated.length!==talentDetails.talents.length)throw Error('Incomplete Ukrainian talent excerpts');
    talentDetails.talents.forEach((entry,index)=>{
      const uk=translated[index];
      if(uk.index!==entry.index || uk.name!==entry.name || !uk.paragraphs?.length || uk.paragraphs.length!==entry.paragraphs.length || uk.paragraphs.some(p=>!p.trim()))throw Error('Incomplete Ukrainian talent: '+entry.name);
      for(const key of ['related','relatedTables'])if((entry[key]?.length||0)!==(uk[key]?.length||0))throw Error('Missing Ukrainian supplement: '+entry.name);
      entry.uk=uk;
    });
    const detailsMarkup='<script id="talent-details-data" type="application/json">'+json(talentDetails)+'</script><dialog id="talentDetail" aria-labelledby="talentDetailTitle"><div class="talent-dialog-head"><h2 id="talentDetailTitle"></h2><button id="closeTalentDetail" type="button" aria-label="Закрити подробиці таланту">Закрити ×</button></div><div class="talent-language" role="group" aria-label="Мова опису"><span class="talent-language-label">Мова опису:</span><button type="button" data-talent-language="uk" aria-pressed="true">Українська</button><button type="button" data-talent-language="en" aria-pressed="false">English (оригінал)</button></div><div id="talentDetailBody" lang="uk"></div></dialog>';
    const head='<meta name="archive-section" content="character"><meta http-equiv="Content-Security-Policy" content="'+csp+'"><style>'+read('src/character-page.css')+'\n'+read('src/footer.css')+'</style>';
    const notice=read('src/footer.html');
    html=read('src/character.html').replace('</head>',marker('head',head)+'</head>')
      .replace('</header>',marker('theme','<button id="theme" class="page-theme" aria-label="Увімкнути світлу тему">&#9680;</button>')+'</header>'+marker('navigation','<nav class="page-navigation" aria-label="Розділи">'+nav(section.id)+'</nav>'))
      .replace('</footer>',marker('notice',notice)+'</footer>')
      .replace('</body>',marker('details',detailsMarkup)+'</body>')
      .replace('</body>',marker('script','<script>'+read('src/catalog.js')+'\n'+read('src/navigation.js')+'\n'+read('src/theme.js')+'\n'+read('src/character-adapter.js')+'\n'+read('src/character-page.js')+'\n'+read('src/character-details.js')+'</script>')+'</body>');
  }else{
    const keys=new Set(['traits','conditions','psyDetailProfiles','toolDetailProfiles']);
    for(const [id] of section.tables)keys.add(['Head','Arm','Body','Leg'].includes(id)?'criticalWounds':id);
    const data=Object.fromEntries([...keys].map(key=>[key,raw[key]]));
    dataFiles=[...keys].map(key=>key+'.json');
    const values={FOOTER:read('src/footer.html'),TABLEHELP:section.id==='psy'?read('src/psy-note.html'):section.id==='mutations'?read('src/mutations-note.html'):'',SECTION:section.id,TITLE:esc(section.title),DESCRIPTION:esc(section.description),VERSION:'Класична версія · '+esc(section.title),SUBTITLE:'Довідкові таблиці · Персонаж · Спорядження · Варп',NAVIGATION:nav(section.id),CSS:read('src/app.css')+'\n'+read('src/footer.css'),DATA:json(data),CATALOG:read('src/catalog.js'),NAVJS:read('src/navigation.js'),THEME:read('src/theme.js'),LOGIC:read('src/logic.js')+'\n'+read('src/render.js'),TRANSLATIONS:json(scopedTranslations(data)),TRAITNAMES:json(Object.fromEntries(Object.keys(raw.traits).map(id=>[id,JSON.parse(read('src/locale/glossary.json'))[id]]))),LOCALE:read('src/locale.js'),APP:read('src/app.js')};
    html=read('src/template.html').replace(/\{\{([A-Z]+)\}\}/g,(_,key)=>{if(!(key in values))throw Error('Unknown template key: '+key);return values[key];});
  }
  html=html.replace('</head>',marker('favicon',favicon)+'</head>');
  if(/\{\{[A-Z]+\}\}/.test(html))throw Error('Unresolved template slot');
  fs.writeFileSync(path.join(__dirname,N.FILES[section.id]),html,'utf8');
  manifest.pages.push({section:section.id,file:N.FILES[section.id],bytes:Buffer.byteLength(html),sha256:hash(html),tables:section.tables.map(t=>t[0]),dataFiles});
}
fs.mkdirSync(path.join(__dirname,'evidence'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'evidence/build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({pages:manifest.pages.map(p=>({file:p.file,bytes:p.bytes})),tables:audit.tableCount,rows:audit.rowCount,profiles:audit.profileCount},null,2));

