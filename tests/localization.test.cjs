const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8').replace(/^\uFEFF/,'');
const dictionary={...JSON.parse(read('src/locale/uk.json')),...JSON.parse(read('src/locale/overrides.json'))};
for(const file of fs.readdirSync(path.join(__dirname,'../src/locale')).filter(name=>/^review-.*\.json$/.test(name)).sort())Object.assign(dictionary,JSON.parse(read('src/locale/'+file)));
dictionary.Special='Особливе';
const T=require('../src/locale.js')(dictionary,JSON.parse(read('src/locale/glossary.json'))),{CATALOG}=require('../src/catalog.js');
const raw=Object.fromEntries(fs.readdirSync(path.join(__dirname,'../src/data')).map(file=>[file.slice(0,-5),JSON.parse(read('src/data/'+file))]));
test('all rendered reference strings have Ukrainian localization entries',()=>{
 const missing=[];
 function walk(value,key=''){
  if(['Source','type'].includes(key))return;
  if(Array.isArray(value))return value.forEach(x=>walk(x,key));
  if(value && typeof value==='object')return Object.entries(value).forEach(([k,v])=>walk(v,k));
  if(typeof value==='string' && /[A-Za-z]/.test(value) && !/^\d+d\d+$/.test(value) && !Object.hasOwn(dictionary,value))missing.push(value);
 }
 for(const [key,value] of Object.entries(raw))if(!['talents','skills','xpCosts'].includes(key))walk(value);
 assert.deepEqual([...new Set(missing)],[]);
});
test('localized rules preserve numeric literals',()=>{
 const digits=value=>(value.match(/\d+/g)||[]).sort();
 const mismatch=Object.entries(dictionary).filter(([source,target])=>JSON.stringify(digits(source))!==JSON.stringify(digits(target)));
 assert.deepEqual(mismatch.map(([source])=>source),[]);
});
test('Ukrainian and English queries both find the same bolt weapons',()=>{
 const context={ArchiveLocale:T,module:{exports:{}}};vm.runInNewContext(read('src/logic.js'),context);
 const L=context.module.exports;
 const uk=raw.rangedWeapons.filter(row=>L.searchMatches(row,'Болт'));
 const en=raw.rangedWeapons.filter(row=>L.searchMatches(row,'Bolt'));
 assert.ok(uk.length>0);assert.deepEqual(uk.map(row=>row.Name),en.map(row=>row.Name));
 assert.equal(T.text('Stealth'),'Скритність');assert.equal(T.text('Subtlety'),'Непомітність групи');assert.equal(T.text('Superiority'),'Бойова перевага');
});
test('localized UI has no replacement characters or translation placeholders',()=>{
 for(const target of Object.values(dictionary)){assert.ok(!/[\ufffd\u2581]/.test(target));assert.ok(!/ZXQ|QXZ/.test(target));}
 for(const section of CATALOG)assert.match(section.title,/[А-Яа-яІіЇїЄєҐґ]/);
});

test('weapon names and trait labels use their own context',()=>{
 assert.equal(T.name('Flamer'),'Вогнемет (Flamer)');
 assert.equal(T.traitName('Flamer','Flamer'),'Вогнеметна');
 assert.equal(T.header('Minor'),'Незначна травма');
});
