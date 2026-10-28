const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function rows(file,name){const text=fs.readFileSync(file,'utf8');return JSON.parse(JSON.stringify(vm.runInNewContext(text.match(new RegExp('const '+name+' = (\\[[^]*?\\n\\]);'))[1])));}
test('Character proofreading preserves English talent IDs, sources, order and all numeric rules',()=>{
 for(const name of ['TALENTS','SKILLS']){
  const before=rows('original/index.html',name),after=rows('src/character.html',name);
  assert.equal(after.length,before.length);
  before.forEach((row,i)=>{
   assert.deepEqual(after[i].join(' ').match(/\d+/g),row.join(' ').match(/\d+/g),'numeric rules row '+i);
   assert.deepEqual(after[i][0].match(/[A-Za-z][A-Za-z '\-]+/g),row[0].match(/[A-Za-z][A-Za-z '\-]+/g),'English ID row '+i);
   if(name==='TALENTS')assert.equal(after[i][3],row[3]);
  });
 }
});
