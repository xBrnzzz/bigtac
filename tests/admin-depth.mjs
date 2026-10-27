import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';
const output=process.env.BIGTAC_VISUAL_SCREENSHOTS;assert.ok(output);fs.mkdirSync(output,{recursive:true});
const before=process.argv.includes('--before'),prefix=before?'before':'after',measurements=[];
const {server,url}=await startAdminFixtureServer(),browser=await chromium.launch();let checks=0,requests=0;const errors=[];
const check=(value,label)=>{assert.ok(value,label);checks++;};
try{
 for(const width of [320,390,768,1440,1535])for(const empty of [false,true]){
  const height=width>=1440?1000:844,context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/,route=>{requests++;return route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}/admin.html?${empty?'empty':'orders=rich'}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('overview-orders')?.textContent!=='—'&&!document.getElementById('admin-app')?.hidden);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(output,`${prefix}-overview-${empty?'empty':'populated'}-${width}x${height}.png`)});
  if(!before&&empty){check(await page.locator('#overview-hourly svg[role=img]').count()===0,'Zero orders use a compact empty state');check(await page.locator('[data-panel=hourly]').evaluate(el=>el.getBoundingClientRect().height<240),'Empty chart panel remains compact');}
  await page.evaluate(()=>switchView('orders'));await page.locator('#orders-summary').filter({hasText:'affichée'}).waitFor();
  const m=await page.evaluate(()=>{const root=document.querySelector('#view-orders').getBoundingClientRect(),board=document.querySelector('.orders-board').getBoundingClientRect();return {boardTop:board.top,headerHeight:board.top-root.top,firstCardHeight:document.querySelector('.order-card')?.getBoundingClientRect().height||0};});
  measurements.push({width,height,empty,...m});
  await page.screenshot({path:path.join(output,`${prefix}-orders-${empty?'empty':'populated'}-${width}x${height}.png`)});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  if(!before&&!empty){
   check(await page.locator('.order-age[data-age-tone=late]').count()===0,'No unconfigured overdue warnings');
   await page.evaluate(()=>{const rows=__adminFixture.data.orders;rows[0].createdAt={seconds:Math.floor((Date.now()-7*86400000)/1000)};rows[1].createdAt=null;rows[2].createdAt={seconds:Math.floor((Date.now()+3600000)/1000)};rows[0].items[0].name='Tacos poulet gratiné avec plusieurs accompagnements et une très longue description';rows[0].items[0].options=['Taille XL','Sauce algérienne','Supplément cheddar','Sans oignon'];__adminFixture.emit();});
   await page.locator('#orders-filters-toggle').click();await page.locator('#orders-threshold').fill('20');await page.locator('#orders-threshold').dispatchEvent('change');await page.locator('#orders-filters-toggle').click();
   check(await page.locator('[data-age-id="fixture-0"]').getAttribute('data-age-tone')!=='late','Old records remain neutral');
   check(await page.locator('[data-age-id="fixture-1"]').getAttribute('data-age-tone')==='unknown','Missing timestamp neutral');
   check(await page.locator('[data-age-id="fixture-2"]').getAttribute('data-age-tone')==='unknown','Future timestamp neutral');
   check(await page.locator('.order-age[data-age-tone=late]').count()>0,'Explicit local reference can highlight plausible active orders');
   await page.screenshot({path:path.join(output,`${prefix}-timing-and-long-content-${width}.png`)});
  }
  check(await page.evaluate(()=>__adminFixture.writes.length===0),'No fixture writes');await context.close();
 }
 check(requests===0,'No production Firebase requests');check(!errors.length,errors.join('\n'));
 fs.writeFileSync(path.join(output,`${prefix}-measurements.json`),JSON.stringify(measurements,null,2));console.log(JSON.stringify({checks,requests,measurements}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
