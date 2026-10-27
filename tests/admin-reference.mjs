import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { startAdminFixtureServer } from './fixtures/admin-server.mjs';

// Reference-size comparisons; only the isolated in-memory Firebase fixture runs.
const output=process.env.BIGTAC_VISUAL_SCREENSHOTS;
assert.ok(output,'Set BIGTAC_VISUAL_SCREENSHOTS outside Git');
fs.mkdirSync(output,{recursive:true});
const before=process.argv.includes('--before'), prefix=before?'before':'after';
const {server,url}=await startAdminFixtureServer();
const browser=await chromium.launch();
let checks=0, firebaseRequests=0;
const errors=[];
const check=(value,label)=>{assert.ok(value,label);checks++;};
try {
    for(const [width,height] of [[1024,1024],[1920,1254],[390,844],[768,1024]]) {
        const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<1000});
        await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/,route=>{firebaseRequests++;return route.abort();});
        if(before)await context.route(/\/assets\/admin[^/]*\.(css|js)$/,route=>{
            const file=new URL(route.request().url()).pathname.slice(1);
            const body=execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'}).replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[^"'\s]+/g,'/fixture-sdk.js');
            return route.fulfill({body,contentType:file.endsWith('.js')?'text/javascript':'text/css'});
        });
        const page=await context.newPage();
        page.on('pageerror',error=>errors.push(error.message));
        await page.clock.setFixedTime(new Date('2026-10-27T11:50:00+01:00'));
        await page.goto(`${url}/admin.html?orders=rich`,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>document.getElementById('overview-orders')?.textContent!=='—'&&!document.getElementById('admin-app')?.hidden);
        await page.evaluate(()=>{
            const states=['pending','confirmed','en_livraison','delivered','pending','confirmed','confirmed','delivered','confirmed','pending','en_livraison','confirmed','confirmed','en_livraison','delivered','pending'];
            const ages=[5,9,14,18,22,30,35,42,48,55,70,85,95,120,145,170];
            const products=['Tacos poulet','Burger maison','Tacos mixte','Tacos nuggets'];
            __adminFixture.data.orders.forEach((order,i)=>{
                order.status=states[i];
                order.createdAt.seconds=Math.floor((Date.now()-ages[i]*60000)/1000);
                order.items[0].name=products[i%products.length];
                order.customer.note=i%5===0?'Sauces à part. Sans oignon, merci.':'';
            });
            __adminFixture.emit();
        });
        await page.evaluate(()=>document.fonts.ready);
        for(const screen of ['overview','orders','kitchen']) {
            if(screen==='orders') {await page.evaluate(()=>switchView('orders'));await page.locator('#list-pending .order-card').first().waitFor();await page.evaluate(()=>showOrderCol('history'));await page.locator('#list-history .order-card').first().waitFor();await page.evaluate(()=>showOrderCol('pending'));}
            if(screen==='kitchen')await page.locator('#orders-mode-kitchen').click();
            await page.screenshot({path:path.join(output,`${prefix}-reference-${screen}-${width}x${height}.png`),fullPage:true,animations:'disabled'});
            check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${screen} fits ${width}`);
            if(!before&&screen==='overview') {
                check(await page.locator('.admin-recent-table tbody tr').count()===4,'Four real loaded orders shown');
                const first=await page.locator('.admin-recent-table tbody tr').first().innerText();
                check(first.includes('#1040')&&first.includes('105,00'),'Recent order uses recorded ID and line total');
                check(await page.locator('#overview-products').innerText().then(text=>text.includes('Burger maison')),'Ranking uses actual fixture product names');
                await page.locator('#view-overview').evaluate(el=>el.scrollTop=el.scrollHeight);
                await page.screenshot({path:path.join(output,`${prefix}-reference-overview-lower-${width}.png`),animations:'disabled'});
                await page.locator('#view-overview').evaluate(el=>el.scrollTop=0);
            }
            if(!before&&screen==='kitchen') {
                check(await page.locator('#list-confirmed .order-card').count()===6,'Six real preparation tickets');
                check(await page.locator('#list-confirmed .order-card').evaluateAll(cards=>cards.every(card=>[...card.children].every(child=>child.getBoundingClientRect().bottom<=card.getBoundingClientRect().bottom+1))),'All ticket content remains inside its card');
                check(await page.locator('#list-confirmed').innerText().then(text=>!text.includes('0600000000')),'Kitchen retains contact privacy');
                if(width===390)check(await page.locator('#list-confirmed .order-card').first().evaluate(card=>card.getBoundingClientRect().width>=card.parentElement.clientWidth-8),'Mobile ticket uses the available width');
            }
        }
        if(!before) {
            await page.evaluate(()=>switchView('overview'));
            await page.locator('.admin-recent-table tbody tr a').first().click();
            check(await page.locator('#view-orders').isVisible(),'Recent order link opens existing queue');
            if(width===390) {
                await page.evaluate(()=>{__adminFixture.data.orders[0].items[0].name='<img src=x onerror=alert(1)>';__adminFixture.emit();switchView('overview');});
                await page.locator('.admin-recent-table tbody tr').first().waitFor();
                check(await page.locator('#overview-recent').textContent().then(text=>text.includes('<img src=x')),'Recent product text stays literal');
                check(await page.locator('#overview-recent img').count()===0,'Recent product text cannot insert HTML');
            }
        }
        check(await page.evaluate(()=>__adminFixture.writes.length===0),'Reference capture performs no writes');
        await context.close();
    }
    check(firebaseRequests===0,'Zero production Firebase requests');
    check(errors.length===0,errors.join('\n'));
    console.log(`${checks} reference comparison checks passed; screenshots: ${output}`);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
