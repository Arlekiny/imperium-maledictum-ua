const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {launchBrowser,root:projectRoot}=require('./browser-runtime.cjs');
process.chdir(projectRoot);
const {CATALOG}=require('../src/catalog.js'),N=require('../src/navigation.js'),L=require('../src/logic.js');
const raw=Object.fromEntries(fs.readdirSync(path.join(__dirname,'../src/data')).map(file=>[file.slice(0,-5),JSON.parse(fs.readFileSync(path.join(__dirname,'../src/data',file),'utf8'))]));
const tables=L.normalise(raw,CATALOG).tables;
(async()=>{
 const server=http.createServer((req,res)=>{const file=decodeURIComponent(req.url.split('?')[0]).slice(1)||'index.html';if(file==='favicon.ico'){res.writeHead(204);return res.end();}if(!Object.values(N.FILES).includes(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,'..',file)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:'+server.address().port+'/';const report={date:'2026-10-28',pages:[],profiles:0,renderedRows:0,renderedTables:0};
 for(const section of CATALOG){
  await page.goto(base+N.FILES[section.id]);
  assert.equal(await page.locator('html').getAttribute('lang'),'uk');
  if(section.id==='character'){
   assert.ok(await page.locator('[data-tab="all"].active').count());assert.ok(await page.locator('#calcTitle').isVisible());
  }else{
   await page.waitForSelector('#tableWrap tbody tr');
   if(section.tables.length>1){assert.equal(await page.locator('#tableTitle').textContent(),'Усі');}else{assert.ok(await page.locator('#tableTabs').isHidden());}
   const expected=section.tables.reduce((sum,[id])=>sum+tables[id].rows.length,0);
   assert.equal(await page.locator('#tableWrap tbody tr').count(),expected);report.renderedRows+=expected;report.renderedTables+=section.tables.length;
   assert.ok(!((await page.locator('body').innerText()).includes('\ufffd')));
   for(const label of await page.locator('#tableWrap [data-reference-kind="condition"],#tableWrap [data-reference-kind="trait"]').allTextContents())assert.ok(!/[A-Za-z]/.test(label),'English reference label: '+label);
   const headings=await page.locator('#tableWrap th').allTextContents();assert.ok(headings.every(h=>/[А-Яа-яІіЇїЄєҐґ]|1d100/.test(h)));
   if(['equipment','psy'].includes(section.id)){
    await page.locator('#profiles').click();
    const n=await page.locator('.profile-index button').count();
    for(let i=0;i<n;i++){
     if(i)await page.locator('#profiles').click();
     const label=await page.locator('.profile-index button').nth(i).textContent();
     await page.locator('.profile-index button').nth(i).click();assert.ok(await page.locator('#detailBody table').count());
     if(label.includes('безшумної голки')){const body=await page.locator('#detailBody').innerText();assert.ok(body.includes('Поки триває Отруєння'));assert.ok(!/While|character takes/.test(body));}
     await page.keyboard.press('Escape');report.profiles++;
    }
   }
  }
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+section.id);
  await page.setViewportSize({width:1440,height:1000});
  report.pages.push({id:section.id,ok:true});
 }
 await page.goto(base+'equipment.html');await page.locator('#search').fill('Lascutter');
 const cutter=await page.locator('#tableWrap tbody').innerText();assert.ok(cutter.includes('Спричинення (Горіння)'));assert.ok(!cutter.includes('(Ablaze)'));
 await page.goto(base+'weapons.html');await page.locator('#search').fill('Болт');assert.ok(await page.locator('#tableWrap tbody tr').count());
 await page.locator('#search').fill('Bolt');assert.ok(await page.locator('#tableWrap tbody tr').count());
 await page.locator('#search').fill('');await page.locator('[data-table="all"]').click();await page.waitForFunction(()=>document.getElementById('tableTitle').textContent==='Усі');
 await page.screenshot({path:'evidence/uk-weapons-desktop.png',fullPage:false});
 await page.goto(base+'criticalwounds.html#/criticalwounds/all');await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'evidence/uk-wounds-mobile.png',fullPage:false});
 assert.equal(report.renderedRows,766);assert.equal(report.renderedTables,34);assert.deepEqual(errors,[]);report.errors=errors;report.bilingualSearch=true;
 fs.writeFileSync('evidence/uk-browser-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
