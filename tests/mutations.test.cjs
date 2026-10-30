const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const dict=read('src/locale/review-mutations.json');
for(const [file,size] of [['mutations',20],['malignancies',20],['subtleMutations',10],['technologyPerils',20]])test(file+': complete d100 coverage and translated original text',()=>{
 const rows=read('src/data/'+file+'.json');assert.equal(rows.length,size);
 const covered=rows.flatMap(row=>{const [a,b]=row.Roll.split('–').map(Number);return Array.from({length:(b||100)-a+1},(_,i)=>a+i);});assert.deepEqual(covered,Array.from({length:100},(_,i)=>i+1));
 for(const row of rows){assert.ok(row.Source);assert.ok(row.Page>0);if(row.Name){assert.match(dict[row.Name],/[А-Яа-яІіЇїЄєҐґ]/);assert.match(dict[row.Description],/[А-Яа-яІіЇїЄєҐґ]/);}else for(const key of ['Positive Mutation','Negative Mutation'])assert.match(dict[row[key]],/[А-Яа-яІіЇїЄєҐґ]/);}
});
test('original language mode retains Ukrainian search terms',()=>{
 const T=require('../src/locale.js')(dict);const L=require('../src/logic.js'),prev=global.ArchiveLocale;global.ArchiveLocale=T;
 try{T.setLanguage('en');assert.equal(T.text('Iron Skin'),'Iron Skin');assert.ok(L.searchMatches({Name:'Iron Skin'},'залізна'));T.setLanguage('uk');assert.equal(T.text('Iron Skin'),'Залізна шкіра');}finally{global.ArchiveLocale=prev;}
});
