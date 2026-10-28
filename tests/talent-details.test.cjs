const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const data=JSON.parse(read('src/talent-details.json'));
const ukrainian=JSON.parse(read('src/talent-details-uk.json'));
const rows=JSON.parse(JSON.stringify(vm.runInNewContext(read('src/character.html').match(/const TALENTS = (\[[^]*?\n\]);/)[1])));
const normalize=s=>s.normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
test('all 139 talent excerpts match their stable Character row',()=>{
 assert.equal(data.talents.length,rows.length);
 data.talents.forEach((entry,i)=>{
  assert.equal(entry.index,i);assert.ok(normalize(rows[i][0]).includes(normalize(entry.name)),entry.name);
  assert.ok(entry.paragraphs.length>0);assert.ok(entry.paragraphs.join(' ').length>100);
  assert.ok(['core','mechanicus','inquisition'].includes(entry.bookId));
  assert.ok(Number.isInteger(entry.page) && entry.page>0);assert.ok(entry.endPage>=entry.page);assert.equal(entry.pdfPage,entry.page);
  assert.ok(!entry.paragraphs.some(p=>/\ufffd|<script|localhost|D:\\/.test(p)));
 });
});
test('excerpts retain important original wording and complete continuations',()=>{
 const text=name=>data.talents.find(e=>e.name===name).paragraphs.join(' ');
 assert.match(text('Adrenaline Acceleration'),/Fast when Fleeing/);
 assert.match(text('Flagellant'),/full effects of the Critical Wound as normal/);
 assert.match(text('Skit-Code Discipline'),/after them in Initiative and gain \+1 SL to all Tests/);
 assert.match(text('Fulgurite Mastery'),/past your maximum threshold/);
 assert.match(text('Medicae Maverick'),/increases the target’s Critical Wounds by \+1/);
});
test('the distributed Character embeds excerpts without external PDF dependencies',()=>{
 const html=read('character.html');const embedded=JSON.parse(html.match(/<script id="talent-details-data" type="application\/json">([^]*?)<\/script>/)[1]);
 assert.deepEqual(embedded,{...data,talents:data.talents.map((entry,index)=>({...entry,uk:ukrainian.talents[index]}))});assert.ok(html.includes('id="talentDetail"'));assert.ok(html.includes('Докладніше'));
 assert.ok(!html.includes('D:/Downloads'));assert.ok(!/<iframe|<embed|<object/.test(html));
});

test('Ukrainian details cover every paragraph, sidebar and table without losing numeric rules',()=>{
 assert.equal(ukrainian.language,'uk');assert.equal(ukrainian.talents.length,data.talents.length);
 const numbers=s=>(s.match(/\d+(?:[.,]\d+)?/g)||[]).sort();
 const compare=(source,target,label)=>{
  assert.equal(typeof target,'string',label);assert.ok(/[А-Яа-яІіЇїЄєҐґ]/.test(target),label);
  assert.ok(!/\ufffd|<script|TODO|ZXQ/.test(target),label);
  assert.deepEqual(numbers(target),numbers(source),label+' numeric rules');
 };
 data.talents.forEach((entry,i)=>{
  const uk=ukrainian.talents[i];assert.equal(uk.index,entry.index);assert.equal(uk.name,entry.name);
  assert.equal(uk.paragraphs.length,entry.paragraphs.length,entry.name);
  entry.paragraphs.forEach((text,p)=>compare(text,uk.paragraphs[p],entry.name+' paragraph '+p));
  for(const key of ['related','relatedTables']){
   assert.equal(uk[key]?.length||0,entry[key]?.length||0,entry.name+' '+key);
   (entry[key]||[]).forEach((section,j)=>{
    const translated=uk[key][j];assert.equal(translated.page,section.page);compare(section.title,translated.title,entry.name+' section');
    if(section.paragraphs){assert.equal(translated.paragraphs.length,section.paragraphs.length);section.paragraphs.forEach((p,k)=>compare(p,translated.paragraphs[k],entry.name+' sidebar'));}
    if(section.rows){
     assert.equal(translated.headers.length,section.headers.length);assert.equal(translated.rows.length,section.rows.length);
     section.headers.forEach((h,k)=>compare(h,translated.headers[k],entry.name+' header'));
     section.rows.forEach((row,r)=>{assert.equal(translated.rows[r].length,row.length);row.forEach((cell,c)=>{
      const result=translated.rows[r][c];assert.equal(typeof result,'string');assert.deepEqual(numbers(result),numbers(cell),entry.name+' cell '+r+','+c);
      if(/[a-z]{3}/i.test(cell))compare(cell,result,entry.name+' cell '+r+','+c);
     });});
    }
   });
  }
 });
});
test('Well-Prepared keeps the original zero Encumbrance requirement',()=>{
 const entry=data.talents.find(e=>e.name==='Well-Prepared');assert.equal(entry.paragraphs.length,1);assert.match(entry.paragraphs[0],/Encumbrance 0 and/);
 const uk=ukrainian.talents[entry.index];assert.match(uk.paragraphs[0],/[Оо]бтяження\s+0/);
});
