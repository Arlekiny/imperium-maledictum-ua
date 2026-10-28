const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const html=fs.readFileSync(path.join(__dirname,'../original/index.html'));
const text=html.toString('utf8');
test('supplied Character is byte-identical to the confirmed original',()=>{
  assert.equal(html.length,86786);
  assert.equal(crypto.createHash('sha256').update(html).digest('hex'),'61702b39f2342c7c164d299b447be535f1dfe4c13354e453f1ead428f54e30a5');
});
test('original Ukrainian arrays contain all 139 talents and 20 skills',()=>{
  for(const [name,count] of [['TALENTS',139],['SKILLS',20]]){
    const source=text.match(new RegExp('const '+name+' = (\\[[^]*?\\n\\]);'));
    assert.ok(source,name+' declaration found');
    const data=vm.runInNewContext(source[1],Object.create(null),{timeout:1000});
    assert.equal(data.length,count);assert.ok(data.every(row=>/[А-Яа-яІіЇїЄє]/u.test(row[0])));
  }
});
function calculator() {
  const elements=new Map();
  function element(id) {
    if(!elements.has(id))elements.set(id,{id,value:'',hidden:false,textContent:'',innerHTML:'',style:{},events:{},addEventListener(name,fn){this.events[name]=fn;}});
    return elements.get(id);
  }
  const modes=['char','skill','talent'].map(mode=>({dataset:{mode},classList:{toggle(){}},events:{},addEventListener(name,fn){this.events[name]=fn;}}));
  const script=text.slice(text.indexOf('// --- Калькулятор цін покращень ---')).split('</script>')[0];
  assert.ok(script.startsWith('// --- Калькулятор'));
  vm.runInNewContext(script,{document:{getElementById:element,querySelectorAll:()=>modes}},{timeout:1000});
  return {
    set(mode,a,b='') {modes.find(button=>button.dataset.mode===mode).events.click();element('calcA').value=String(a);element('calcB').value=String(b);element('calcA').events.input();},
    total() {return Number(element('calcTotal').textContent.replace(/[\s\u00a0\u202f]/g,''));},
    error(){return element('calcError').textContent;},
    resultVisible(){return element('calcResult').style.display!=='none';},
    rows(){return element('calcBreak').innerHTML;}
  };
}
test('original XP calculator: 40→50 = 700 and exact tier breakdown',()=>{
  const calc=calculator();calc.set('char',40,50);
  assert.equal(calc.error(),'');assert.equal(calc.total(),700);assert.ok(calc.resultVisible());
  assert.ok(calc.rows().includes('41–45'));assert.ok(calc.rows().includes('46–50'));
  assert.ok(calc.rows().includes('300'));assert.ok(calc.rows().includes('400'));
});
for(const [from,to,cost] of [[20,21,20],[24,25,20],[25,26,25],[30,31,30],[35,36,40],[40,41,60],[45,46,80],[50,51,110],[55,56,140],[60,61,180],[65,66,220],[70,71,270],[75,76,320],[79,80,320]])test(`original XP tier boundary ${from}→${to} = ${cost}`,()=>{
  const calc=calculator();calc.set('char',from,to);assert.equal(calc.error(),'');assert.equal(calc.total(),cost);
});
test('original XP rejects empty, fractional, negative, reversed and out-of-range values',()=>{
  const calc=calculator();
  for(const [a,b] of [['',''],[40,''],[20.5,30],[20,30.5],[19,25],[-1,30],[80,81],[79,81],[40,40],[40,30],['invalid',50]]){
    calc.set('char',a,b);assert.ok(calc.error(),`${a}→${b}`);assert.ok(!calc.resultVisible());assert.equal(calc.rows(),'');
  }
});
test('original skill calculator covers all advances and rejects invalid inputs',()=>{
  const calc=calculator();
  for(const [a,b,expected] of [[0,1,50],[0,4,500],[1,4,450],[2,3,150],[3,4,200]]){calc.set('skill',a,b);assert.equal(calc.error(),'');assert.equal(calc.total(),expected);}
  for(const [a,b] of [['',''],[0,''],[-1,1],[0,5],[4,4],[1,1],[2,1],[0.5,2],[0,2.5]]){calc.set('skill',a,b);assert.ok(calc.error());assert.ok(!calc.resultVisible());}
});
test('original talent calculator uses 100 XP per talent and rejects invalid inputs',()=>{
  const calc=calculator();
  for(const count of [1,2,10]){calc.set('talent',count);assert.equal(calc.error(),'');assert.equal(calc.total(),100*count);}
  for(const count of ['',0,-1,1.5,'invalid','Infinity']){calc.set('talent',count);assert.ok(calc.error());assert.ok(!calc.resultVisible());}
});
test('original has no remote resource loads, requests or external script dependencies',()=>{
  assert.equal([...text.matchAll(/<script\b[^>]*\bsrc=/gi)].length,0);
  assert.equal([...text.matchAll(/<(?:img|iframe|link|audio|video)\b/gi)].length,0);
  assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|eval)\s*\(/.test(text));
  assert.ok(!/url\s*\(\s*["']?https?:/i.test(text));
});
