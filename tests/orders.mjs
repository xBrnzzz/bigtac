import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startAdminFixtureServer } from './fixtures/admin-server.mjs';
const output=process.env.BIGTAC_ORDERS_SCREENSHOTS;
if(output)fs.mkdirSync(output,{recursive:true});
const {server,url}=await startAdminFixtureServer();
const browser=await chromium.launch({headless:true});
let passed=0,productionRequests=0;const errors=[];
const check=(value,label)=>{assert.ok(value,label);passed++;};
async function open(width,role='admin') {
    const context=await browser.newContext({viewport:{width,height:width>=900?960:844},hasTouch:width<900,reducedMotion:'reduce'});
    await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/,route=>{productionRequests++;return route.abort();});
    const page=await context.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(45000);page.on('pageerror',error=>errors.push(error.message));
    if(width===1440)await page.clock.install();
    await page.goto(`${url}/admin.html?orders=rich&role=${role}#orders`,{waitUntil:'domcontentloaded'});
    await page.locator('#list-pending .order-card').first().waitFor();await page.waitForFunction(()=>document.getElementById('orders-connection').textContent==='Synchronisé en direct');
    return {page,context};
}
async function screenshot(page,name){if(output)await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});}
try {
    for(const width of [320,375,390,768,900,1024,1440]) {
        const {page,context}=await open(width);
        await screenshot(page,`orders-${width}`);
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No page overflow ${width}`);
        check(await page.locator('#view-orders').evaluate(el=>el.scrollWidth<=el.clientWidth),`Orders fit ${width}`);
        check(await page.locator('#list-pending').innerText().then(text=>text.includes('Sauce algérienne')||text.includes('algérienne')),'Choices visible on cards');
        check(await page.locator('#list-pending').innerText().then(text=>text.includes('Ne pas ajouter d’oignon')),'Instructions highly visible');
        check(await page.locator('#orders-notification').isHidden(),'Startup does not notify historical orders');
        if(width<1100){await page.locator('#mtab-confirmed').click();check(await page.locator('#col-confirmed').isVisible(),`Kitchen queue ${width}`);check(!(await page.locator('#col-pending').isVisible()),'Only selected queue on mobile/tablet');await page.locator('#mtab-pending').click();}
        await page.locator('[data-open="fixture-0"]').first().click();
        check(await page.locator('#order-detail').isVisible(),'Order details open');
        check(await page.locator('#order-detail-body').innerText().then(text=>text.includes('Cheddar')&&text.includes('Sans')===false&&text.includes('Ne pas ajouter d’oignon')),'Detail preserves products, modifiers and notes');
        check(await page.locator('#order-detail-actions').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'Detail actions fit viewport');
        check(await page.locator('#order-detail').evaluate(el=>el.scrollWidth<=el.clientWidth),'Drawer has no horizontal clipping');
        if([390,768,1440].includes(width))await screenshot(page,`order-detail-${width}`);
        await page.keyboard.press('Escape');check(await page.locator('#order-detail').isHidden(),'Detail supports keyboard dismissal');
        await page.locator('#orders-mode-kitchen').click();
        check(await page.locator('#list-confirmed .order-card').count()===4,'Kitchen focuses preparation queue');
        check(await page.locator('#col-pending').isHidden(),'Kitchen hides acceptance queue');
        if([390,768,1440].includes(width))await screenshot(page,`kitchen-${width}`);
        await page.locator('#orders-mode-service').click();
        await page.evaluate(()=>showOrderCol('pending'));
        await page.locator('#orders-search').fill('#1040');
        check(await page.locator('#list-pending .order-card').count()===1,'Order-number search');
        await page.locator('#orders-search').fill('');
        await page.locator('#orders-filters-toggle').click();await page.locator('#orders-service').selectOption('emporter');
        check(await page.locator('#list-pending .order-card').count()===1,'Service filter narrows pending queue');
        check(!(await page.locator('#list-pending .order-card').innerText()).includes('Livraison'),'Service filtering');
        await page.locator('#orders-clear').click();
        await page.locator('#orders-filters-toggle').click();
        await page.evaluate(()=>switchView('overview'));check(await page.locator('#view-overview').isVisible(),'Phase 1 Overview preserved');
        check(await page.evaluate(()=>__adminFixture.writes.length===0),'Browsing creates no writes');
        await context.close();
    }
    {
        const {page,context}=await open(1440);
        check(await page.evaluate(()=>[...__adminFixture.listeners].filter(listener=>listener.ref.name==='orders').every(listener=>listener.ref.id||listener.ref.filters.some(filter=>filter.limit))),'All order list subscriptions are bounded');
        await page.evaluate(()=>{
            const Original=window.AudioContext;
            window.__audioAlerts=0;
            window.AudioContext=class extends Original { createOscillator(){window.__audioAlerts++;return super.createOscillator();} };
        });
        await page.locator('#orders-sound').click();
        check(await page.locator('#orders-sound').getAttribute('aria-pressed')==='true','Sound requires explicit activation');
        check(await page.evaluate(()=>__audioAlerts===0),'Enabling sound does not replay old orders');
        await page.evaluate(()=>{
            const source=__adminFixture.data.orders[0];
            __adminFixture.data.orders.push({...source,id:'new-order',shortId:'2000',createdAt:new Date(Date.now()+50)});__adminFixture.emit();
        });
        check(await page.locator('#orders-notification').isVisible(),'Genuine new incoming order alerts visually');
        check(await page.evaluate(()=>__audioAlerts===1),'New order sounds once');
        await page.evaluate(()=>__adminFixture.emit());
        check(await page.evaluate(()=>__audioAlerts===1),'Repeated snapshots do not duplicate sound');
        await page.evaluate(()=>{
            __adminFixture.data.orders.push({...__adminFixture.data.orders[0],id:'backfill',shortId:'999',createdAt:new Date(Date.now()-3600000)});__adminFixture.emit();
        });
        check(await page.evaluate(()=>__audioAlerts===1),'Backfilled old orders do not sound');
        await page.locator('#orders-show-new').click();
        check(await page.locator('#orders-notification').isHidden(),'New order banner can be acknowledged');
        await page.locator('#orders-sound').click();
        check(await page.locator('#orders-sound').getAttribute('aria-pressed')==='false','Sound can be disabled');
        await page.evaluate(()=>{__adminFixture.writeDelay=350;});
        const results=await page.evaluate(()=>Promise.all([setStatus('fixture-0','confirmed'),setStatus('fixture-0','confirmed')]));
        check(results[0]===true&&results[1]===false,'Repeated action is locked during submission');
        check(await page.evaluate(()=>__adminFixture.writes.filter(write=>write.ref.id==='fixture-0').length===1),'Only one transition write occurs');
        await page.evaluate(()=>{__adminFixture.writeDelay=0;__adminFixture.failWrites=true;});
        check(await page.evaluate(()=>setStatus('fixture-4','confirmed'))===false,'Rejected save returns failure');
        check(await page.locator('[data-order-id="fixture-4"] .order-operation-error').innerText().then(text=>text.includes('Connexion indisponible')),'Useful failed-write feedback');
        check(await page.evaluate(()=>__adminFixture.data.orders.find(order=>order.id==='fixture-4').status==='pending'),'Failed write never mutates local order');
        await page.evaluate(()=>__adminFixture.failWrites=false);
        await page.locator('[data-retry="fixture-4"]').click();
        await page.waitForFunction(()=>__adminFixture.data.orders.find(order=>order.id==='fixture-4').status==='confirmed');
        check(await page.evaluate(()=>__adminFixture.writes.filter(write=>write.ref.id==='fixture-4').length===1),'Explicit retry succeeds once');
        await page.evaluate(()=>{
            __adminFixture.beforeCommit=()=>{__adminFixture.data.orders.find(order=>order.id==='fixture-8').status='confirmed';__adminFixture.emit();};
        });
        page.once('dialog',dialog=>dialog.accept());
        check(await page.evaluate(()=>setStatus('fixture-8','rejected'))===false,'Competing stale rejection is refused');
        check(await page.evaluate(()=>__adminFixture.data.orders.find(order=>order.id==='fixture-8').status==='confirmed'),'Another employee’s acceptance is preserved');
        check(await page.evaluate(()=>!__adminFixture.writes.some(write=>write.ref.id==='fixture-8')),'Conflict produces no stale write');
        check(await page.locator('#list-confirmed').innerText().then(text=>text.includes('autre appareil')),'Conflict explained beside moved order');
        await page.evaluate(()=>{
            const order=__adminFixture.data.orders.find(order=>order.id==='fixture-12');order.createdAt=new Date(Date.now()-19*60000);__adminFixture.emit();
        });
        await page.locator('#orders-filters-toggle').click();
        await page.locator('#orders-threshold').fill('20');
        await page.locator('#orders-threshold').dispatchEvent('change');
        await page.locator('#orders-filters-toggle').click();
        const reads=await page.evaluate(()=>__adminFixture.queries.length);
        await page.locator('[data-open="fixture-12"]').first().focus();
        await page.clock.fastForward(61000);
        check(await page.locator('[data-age-id="fixture-12"]').getAttribute('data-age-tone')==='late','Age updates to local reference exceeded');
        check(await page.evaluate(()=>__adminFixture.queries.length)===reads,'Timer updates cause no Firestore reads');
        check(await page.evaluate(()=>document.activeElement.dataset.open==='fixture-12'),'Timer update preserves keyboard focus');
        await page.evaluate(()=>{
            const order=__adminFixture.data.orders.find(order=>order.id==='fixture-12');order.customer.note='<img src=x onerror="window.__xss=true"> sauces à part';order.items[0].name='<script>bad()</script>';__adminFixture.emit();
        });
        check(!(await page.evaluate(()=>window.__xss)),'Customer markup is inert');
        check(await page.locator('#list-pending').innerText().then(text=>text.includes('<img')&&text.includes('<script>')),'Untrusted text remains literal and readable');
        await page.locator('[data-open="fixture-12"]').first().click();
        await page.evaluate(()=>window.__printed=0);
        await page.evaluate(()=>window.print=()=>window.__printed++);
        await page.locator('#order-print').click();
        check(await page.evaluate(()=>window.__printed===1),'Receipt action requests print once');
        await page.emulateMedia({media:'print'});
        check(await page.locator('#order-print-receipt').isVisible(),'Print styles expose receipt');
        check(await page.locator('#order-print-receipt').innerText().then(text=>text.includes('Paiement non vérifié')),'Receipt never claims payment');
        check(await page.locator('#order-print-receipt').innerText().then(text=>text.includes('90,00 MAD')&&!text.includes('180,00 MAD')),'Recorded line amount is not multiplied by quantity twice');
        if(output)await screenshot(page,'receipt-print-1440');
        await page.emulateMedia({media:'screen'});
        await page.keyboard.press('Escape');
        await context.setOffline(true);
        const writesBefore=await page.evaluate(()=>__adminFixture.writes.length);
        check(await page.evaluate(()=>setStatus('fixture-12','confirmed'))===false,'Offline transition blocked');
        check(await page.evaluate(()=>__adminFixture.writes.length)===writesBefore,'Offline action makes no write');
        await context.setOffline(false);await page.evaluate(()=>__adminFixture.emit());
        await page.evaluate(()=>{
            const row=__adminFixture.data.orders[0];
            for(let i=0;i<75;i++)__adminFixture.data.orders.push({...row,id:`history-${i}`,shortId:`H${i}`,status:'delivered',createdAt:new Date(Date.now()-i*60000)});
            __adminFixture.emit();
        });
        await page.locator('#mtab-history').click();
        await page.waitForFunction(()=>document.getElementById('orders-history-note').textContent.startsWith('30 chargée'));
        await page.waitForFunction(()=>document.getElementById('orders-history-note').textContent.startsWith('30 chargée'));
        check(await page.locator('#list-history .order-card').count()===30,'History is paginated, not loaded entirely');
        await page.locator('#orders-history-more').click();
        await page.waitForFunction(()=>document.getElementById('orders-history-note').textContent.startsWith('60 chargée'));
        check(await page.locator('#list-history .order-card').count()===60,'History cursor loads next page without duplicates');
        check(await page.evaluate(()=>__adminFixture.queries.filter(query=>query.filters?.some(filter=>filter.cursor)).every(query=>query.filters.some(filter=>filter.limit===31))),'Cursor history requests remain bounded');
        await page.locator('#orders-filters-toggle').click();
        await page.locator('#orders-status').selectOption('history');
        await page.locator('#orders-date').fill('2026-01-01');await page.locator('#orders-date').dispatchEvent('change');
        await page.waitForFunction(()=>document.getElementById('orders-history-note').textContent.startsWith('0 chargée'));
        check(await page.locator('#list-history .order-card').count()===0,'Date filter queries selected civil day');
        await page.locator('#orders-clear').click();await page.locator('#orders-filters-toggle').click();
        await page.evaluate(()=>{__adminFixture.failOrders=true;__adminFixture.emit();});
        check(await page.locator('#orders-error').innerText().then(text=>text.length>0),'Live read error visible');
        check(await page.locator('#list-pending .order-card').count()===0,'Failed live queue does not present stale actionable cards');
        await page.evaluate(()=>__adminFixture.failOrders=false);await page.locator('#orders-refresh').click();await page.locator('#mtab-pending').click();
        await page.locator('#list-pending .order-card').first().waitFor();
        check(await page.locator('#orders-error').isHidden(),'Successful live retry clears error');
        await page.evaluate(()=>{const row=__adminFixture.data.orders[0];__adminFixture.data.orders=Array.from({length:250},(_,i)=>({...row,id:`queue-${i}`,status:'pending'}));__adminFixture.emit();});
        check(await page.locator('#orders-error').innerText().then(text=>text.includes('compteurs sont partiels')),'Active queue cap is explicitly disclosed');
        check(await page.locator('#list-pending .order-card').count()===200,'Large queue remains bounded');
        await context.close();
    }
    {
        const {page,context}=await open(390);
        await page.evaluate(()=>switchView('settings'));
        await page.evaluate(()=>{__adminFixture.beforeCommit=()=>{__adminFixture.data.orders.find(order=>order.id==='fixture-0').status='confirmed';__adminFixture.emit();};});
        page.once('dialog',dialog=>dialog.accept());await page.locator('#toggle-store').click();
        await page.waitForFunction(()=>document.getElementById('admin-settings-feedback').textContent==='Modification enregistrée.');
        check(await page.evaluate(()=>__adminFixture.data.settings[0].isOpen===false),'Restaurant closure preserved');
        check(await page.evaluate(()=>__adminFixture.data.orders.find(order=>order.id==='fixture-0').status==='confirmed'),'Closing does not reject an order accepted concurrently');
        check(await page.evaluate(()=>__adminFixture.data.orders.filter(order=>['fixture-4','fixture-8','fixture-12'].includes(order.id)).every(order=>order.status==='rejected')),'Closing still rejects remaining pending orders');
        await context.close();
    }
    for(const role of ['caissier','manager','livreur']) {
        if(role==='livreur') {
            const context=await browser.newContext();const page=await context.newPage();
            await page.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/,route=>{productionRequests++;return route.abort();});
            await page.goto(`${url}/admin.html?orders=rich&role=livreur`,{waitUntil:'domcontentloaded',timeout:45000});
            await page.waitForFunction(()=>window.__adminFixture);
            const denied=await page.evaluate(async()=>{const sdk=await import('/firebase-config.js');try{await sdk.runTransaction(sdk.db,async transaction=>{const ref=sdk.doc(sdk.db,'orders','fixture-0');await transaction.get(ref);transaction.update(ref,{status:'confirmed'});});return false;}catch(error){return error.code==='permission-denied';}});
            check(denied,'Isolated backend fixture denies driver staff transition without relying on UI visibility');
            await page.locator('#view-driver').waitFor();
            await page.evaluate(()=>{const order=__adminFixture.data.orders.find(order=>order.id==='fixture-6');order.customer.name='<img src=x onerror="window.__driverXss=true">';order.location='<svg onload="window.__driverXss=true">';__adminFixture.emit();});
            check(await page.locator('#my-deliveries-list').innerText().then(text=>text.includes('<img')&&text.includes('<svg')),'Driver customer text remains literal');
            check(await page.evaluate(()=>!window.__driverXss),'Driver render does not execute customer markup');
            check(await page.evaluate(()=>claimDelivery('fixture-3'))===false,'Driver cannot claim a completed order');
            check(await page.evaluate(()=>claimDelivery('fixture-2'))===false,'Driver cannot claim a pickup order');
            await page.evaluate(()=>{__adminFixture.data.orders.find(order=>order.id==='fixture-6').deliveryGuyId='other-driver';__adminFixture.emit();});
            page.once('dialog',dialog=>dialog.accept());
            check(await page.evaluate(()=>markDelivered('fixture-6'))===false,'Driver cannot complete another driver’s assignment');
            check(await page.evaluate(()=>__adminFixture.writes.length===0),'Invalid driver actions produce no writes');
            await context.close();continue;
        }
        const {page,context}=await open(390,role);
        await page.locator('[data-open="fixture-0"]').first().click();
        const details=await page.locator('#order-detail-body').innerText();
        check(role==='manager'?details.includes('0600000000'):!details.includes('0600000000'),'Contact disclosure follows current staff role');
        await page.keyboard.press('Escape');await page.locator('#orders-mode-kitchen').click();
        await page.locator('[data-open="fixture-1"]').first().click();
        check(await page.locator('#order-detail-body').innerText().then(text=>!text.includes('0600000000')&&!text.includes('Youssef')),'Kitchen detail hides unnecessary personal data');
        await page.keyboard.press('Escape');
        await page.locator('#orders-mode-service').click();await page.evaluate(()=>showOrderCol('pending'));
        await page.evaluate(()=>{__adminFixture.writeDelay=150;__adminFixture.beforeCommit=()=>{__adminFixture.data.users[0].disabled=true;__adminFixture.emit();};});
        check(await page.evaluate(()=>setStatus('fixture-0','confirmed'))===false,'Permission loss during transaction cancels pending update');
        check(await page.evaluate(()=>__adminFixture.writes.length===0),'Revoked profile produces no status write');
        check(await page.locator('#admin-access').isVisible(),'Revocation returns to access gate');
        await context.close();
    }
    check(productionRequests===0,'No production Firebase requests');check(errors.length===0,`No browser errors: ${errors.join('; ')}`);
    console.log(JSON.stringify({passed,productionRequests,errors,screenshots:output||null}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
