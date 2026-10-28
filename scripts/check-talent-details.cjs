const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {launchBrowser,root:projectRoot}=require('./browser-runtime.cjs');
process.chdir(projectRoot);
const entries=JSON.parse(fs.readFileSync('src/talent-details.json','utf8')).talents;
const uk=JSON.parse(fs.readFileSync('src/talent-details-uk.json','utf8')).talents;
(async()=>{
 const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('character.html'));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await launchBrowser();
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const address='http://127.0.0.1:'+server.address().port;
  await page.goto(address);
  assert.equal(await page.locator('.talent-more').count(),139);
  assert.equal(await page.locator('td.desc .talent-more').count(),139);
  const check=async(entry,language)=>{
   const content=language==='uk'?uk[entry.index]:entry;
   assert.equal(await page.locator('#talentDetailBody').getAttribute('lang'),language);
   assert.equal(await page.locator('[data-talent-language="'+language+'"]').getAttribute('aria-pressed'),'true');
   assert.deepEqual(await page.locator('#talentDetailBody blockquote').first().locator('p').allTextContents(),content.paragraphs);
   assert.ok((await page.locator('.talent-citation').innerText()).includes(entry.book));
   const expectedTables=content.relatedTables||[];
   assert.deepEqual(await page.locator('.talent-table-scroll caption').allTextContents(),expectedTables.map(t=>t.title));
   const cells=expectedTables.flatMap(t=>t.rows.flat());
   assert.deepEqual(await page.locator('.talent-table-scroll tbody td').allTextContents(),cells);
   const sidebars=await page.locator('#talentDetailBody blockquote').allTextContents();
   assert.deepEqual(sidebars.slice(1),(content.related||[]).map(s=>s.paragraphs.join('')));
  };
  for(const entry of entries){
   const button=page.locator('[data-talent-index="'+entry.index+'"]');await button.click();
   assert.ok(await page.locator('#talentDetail').isVisible());await check(entry,'uk');
   await page.locator('[data-talent-language="en"]').click();await check(entry,'en');
   await page.locator('[data-talent-language="uk"]').click();await check(entry,'uk');
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.dataset.talentIndex),String(entry.index));
   if(entry.index%25===0)console.log('Checked both languages for talents through '+entry.index);
  }
  await page.locator('#talentsTable th[data-key="name"]').click();await page.locator('#searchInput').fill('Blank');
  const blank=entries.find(e=>e.name==='Blank');await page.locator('[data-talent-index="'+blank.index+'"]').focus();await page.keyboard.press('Enter');
  assert.ok((await page.locator('#talentDetailTitle').innerText()).includes('Парія'));
  await page.locator('[data-talent-language="en"]').focus();await page.keyboard.press('Space');await check(blank,'en');await page.keyboard.press('Escape');
  await page.reload();await page.locator('[data-talent-index="0"]').click();await check(entries[0],'en');
  await page.keyboard.press('Escape');await page.locator('[data-talent-index="1"]').click();await check(entries[1],'en');
  await page.locator('[data-talent-language="uk"]').click();await page.keyboard.press('Escape');
  const long=entries.find(e=>e.name==='Amalanthian Apprentice');await page.locator('[data-talent-index="'+long.index+'"]').click();
  await page.screenshot({path:'evidence/talent-details-desktop.png'});await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  for(const name of ['Amalanthian Apprentice','Devoted Servant','Electro-Priest Indoctrination']){
   const entry=entries.find(e=>e.name===name);await page.locator('[data-talent-index="'+entry.index+'"]').click();
   for(const language of ['uk','en']){
    await page.locator('[data-talent-language="'+language+'"]').click();await check(entry,language);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const rect=await page.locator('#talentDetail').boundingBox();assert.ok(rect.x>=0 && rect.x+rect.width<=391 && rect.y>=0 && rect.y+rect.height<=845);
    const toggle=await page.locator('.talent-language').boundingBox();assert.ok(toggle.x>=rect.x && toggle.x+toggle.width<=rect.x+rect.width+1);
    await page.locator('#talentDetailBody').evaluate(e=>e.scrollTop=e.scrollHeight);
    if(name==='Devoted Servant' && language==='uk')await page.screenshot({path:'evidence/talent-details-mobile.png'});
   }
   await page.locator('#closeTalentDetail').click();
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>localStorage.setItem('im-talent-details-language','invalid'));await page.reload();await page.locator('[data-talent-index="0"]').click();await check(entries[0],'uk');await page.keyboard.press('Escape');
  const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable');}}));
  const blockedPage=await blocked.newPage();blockedPage.on('pageerror',e=>errors.push(e.message));await blockedPage.goto(address);await blockedPage.locator('[data-talent-index="0"]').click();
  assert.equal(await blockedPage.locator('#talentDetailBody').getAttribute('lang'),'uk');await blockedPage.locator('[data-talent-language="en"]').click();assert.equal(await blockedPage.locator('#talentDetailBody').getAttribute('lang'),'en');await blocked.close();
  assert.deepEqual(errors,[]);fs.writeFileSync('evidence/talent-details-browser.json',JSON.stringify({talentsOpened:139,languages:['uk','en'],defaultUkrainian:true,exactParagraphsAndSupplements:true,persistedLanguage:true,invalidPreferenceFallback:true,unavailableStorage:true,descriptionColumnButtons:139,focusReturn:true,sortAndSearch:true,keyboard:true,mobile:true,errors},null,2)+'\n');
  console.log('139 talent dialogs passed in both languages; persistence, keyboard, focus, supplements and mobile passed.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
