const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('character.html','utf8');
test('delivered calculator offers only characteristics and validates XP inputs',()=>{
 assert.ok(html.includes('Калькулятор покращень характеристик'));
 assert.ok(!/class="calc-modes"|data-mode=|SKILL_COST|TALENT_COST/.test(html));
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',style:{},addEventListener(event,fn){this[event]=fn;}});return elements.get(id);};
 const script=html.slice(html.indexOf('// --- Калькулятор цін покращень ---')).split('</script>')[0];
 vm.runInNewContext(script,{document:{getElementById:get}});
 for(const [a,b,cost] of [[40,50,700],[20,21,20],[79,80,320],[25,26,25]]){
  get('calcA').value=String(a);get('calcB').value=String(b);get('calcA').input();
  assert.equal(get('calcError').textContent,'');assert.equal(Number(get('calcTotal').textContent.replace(/\s/g,'')),cost);
 }
 for(const [a,b] of [['',''],[40,''],[20.5,30],[19,30],[80,81],[40,40],[50,40]]){
  get('calcA').value=String(a);get('calcB').value=String(b);get('calcB').input();
  assert.ok(get('calcError').textContent);assert.equal(get('calcResult').style.display,'none');
 }
});
