const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {launchBrowser,root}=require('./browser-runtime.cjs');
(async()=>{const browser=await launchBrowser();try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'mutations.html')).href);
 const wrap=page.locator('#tableWrap');assert.equal(await wrap.locator('.col-Page').count(),0);assert.ok(!(await wrap.locator('th').allTextContents()).includes('Сторінка'));assert.equal(await wrap.locator('tbody tr').count(),70);assert.equal(await wrap.locator('table').count(),4);
 await page.locator('[data-mutation-language="en"]').click();assert.ok(!(await wrap.locator('th').allTextContents()).includes('Page'));assert.ok((await wrap.innerText()).includes('Your pallor becomes corpse-like'));assert.ok(!(await wrap.innerText()).includes('Ваша шкіра набуває'));
 await page.locator('#search').fill('залізна шкіра');assert.ok(await wrap.locator('tbody tr').count()>0);await page.locator('#search').fill('');
 await page.reload();assert.equal(await page.locator('[data-mutation-language="en"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-mutation-language="uk"]').click();assert.ok((await wrap.innerText()).includes('Ваша шкіра набуває трупної блідості'));
 const links=wrap.locator('[data-reference-kind="mutation"]');assert.equal(await links.count(),20);
 for(let i=0;i<20;i++){
  await links.nth(i).click();assert.ok(await page.locator('#detail').isVisible());
  const uk=await page.locator('#detailBody p').first().textContent();assert.match(uk,/[А-Яа-яІіЇїЄєҐґ]/);
  await page.locator('[data-mutation-detail-language="en"]').click();const en=await page.locator('#detailBody p').first().textContent();assert.notEqual(uk,en);assert.ok(en.length>30);assert.ok((await page.locator('#detailBody').innerText()).includes('Core Rulebook'));
  await page.keyboard.press('Escape');
 }
 await page.locator('[data-table="subtleMutations"]').click();await page.waitForFunction(()=>document.querySelectorAll('#tableWrap tbody tr').length===10);assert.equal(await wrap.locator('tbody tr').count(),10);
 await page.locator('[data-table="all"]').click();await page.waitForFunction(()=>document.querySelectorAll('#tableWrap tbody tr').length===70);
 await page.screenshot({path:path.join(root,'evidence/mutations-desktop.png')});await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'evidence/mutations-mobile.png')});assert.deepEqual(errors,[]);
 const report={pages:1,tables:4,rows:70,linkedEffects:20,languages:['uk','en'],persistentLanguage:true,bilingualSearch:true,mobileOverflow:false,errors};fs.writeFileSync(path.join(root,'evidence/mutations-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
