import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startAdminFixtureServer } from './fixtures/admin-server.mjs';

const before = process.argv.includes('--before');
const root = process.env.BIGTAC_ADMIN_SCREENSHOTS;
if (root) fs.mkdirSync(root, { recursive: true });
const { server, url } = await startAdminFixtureServer();
const browser = await chromium.launch({ headless: true });
let checks = 0, firebaseRequests = 0;
const errors = [];
function check(value, label) { assert.ok(value, label); checks++; }
async function open(width, params = '') {
    const context = await browser.newContext({ viewport: { width, height: width >= 900 ? 960 : 844 }, hasTouch: width < 900, reducedMotion: 'reduce' });
    await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/, route => { firebaseRequests++; return route.abort(); });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(45000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${url}/admin.html?${params}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__adminFixture);
    await page.waitForFunction(()=>window.switchView);
    return { context, page };
}
try {
    for (const width of [320, 375, 390, 768, 900, 1024, 1440]) {
        const { context, page } = await open(width);
        await page.locator('#login-section').waitFor({ state: 'hidden' });
        if (root) await page.screenshot({ path: path.join(root, `${before ? 'before' : 'after'}-${width}.png`), fullPage: true });
        if (!before) {
            check(await page.locator('#view-overview').isVisible(), `Overview visible at ${width}`);
            check(!(await page.locator('#view-orders').isVisible()), 'Only selected workspace visible');
            await page.waitForFunction(()=>document.querySelector('#overview-orders').textContent!=='—');
            check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}`);
            check(await page.evaluate(() => __adminFixture.writes.length === 0), 'No writes on initialization');
            check(await page.evaluate(()=>[...__adminFixture.listeners].filter(x=>x.ref.name==='orders').every(x=>x.ref.filters?.some(f=>f.limit))), 'Overview listeners are bounded');
            if (root && [390,768,1440].includes(width)) {
                await page.locator('#view-overview').evaluate(el=>el.scrollTop=el.scrollHeight);
                await page.screenshot({path:path.join(root,`overview-lower-${width}.png`)});
                await page.locator('#view-overview').evaluate(el=>el.scrollTop=0);
            }
            check(await page.evaluate(()=>{
                const el=document.getElementById('overview-value'); return el.scrollWidth<=el.clientWidth;
            }), `Currency fits at ${width}`);
            await page.evaluate(()=>switchView('orders'));
            await page.locator('#list-pending .order-card').first().waitFor();
            check(await page.locator('#view-orders').isVisible(), `Legacy orders accessible ${width}`);
            check(await page.locator('#view-orders').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`Orders fit ${width}`);
            if (width<1100) {
                await page.locator('#mtab-confirmed').click();
                check(await page.locator('#col-confirmed').isVisible(), `Kitchen tab accessible at ${width}`);
                check(!(await page.locator('#col-pending').isVisible()), 'One queue on phone/tablet');
            }
            await page.evaluate(()=>switchView('menu'));
            await page.locator('#items-grid>div').first().waitFor();
            check(await page.locator('#items-grid').innerText().then(text=>text.includes('Tacos poulet')), 'Catalog preserved');
            check(await page.locator('#view-menu').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`Catalog fits ${width}`);
            await page.evaluate(()=>openItemEditor('tacos'));
            check(await page.locator('#item-editor').isVisible(), `Product editor opens ${width}`);
            check(await page.evaluate(()=>document.getElementById('btn-save-item').getBoundingClientRect().bottom<=innerHeight), 'Save action stays visible');
            await page.locator('#btn-save-item').focus(); await page.keyboard.press('Tab');
            check(await page.evaluate(()=>document.getElementById('item-editor').contains(document.activeElement)), 'Editor keyboard focus remains contained');
            if (root && [390,768,1440].includes(width)) await page.screenshot({path:path.join(root,`editor-${width}.png`)});
            await page.keyboard.press('Escape');
            if(width===390) {
                await page.evaluate(()=>openItemEditor('tacos'));
                await page.locator('#input-name').fill('Tacos poulet modifié');
                await page.locator('#btn-save-item').click();
                await page.locator('#item-editor').waitFor({state:'hidden'});
                check(await page.evaluate(()=>__adminFixture.data.menuItems[0].name==='Tacos poulet modifié'),'Legacy product save persists in fixture');
                await page.evaluate(()=>openCategoryEditor('tacos'));
                check(await page.locator('#menu-categories-dialog').isVisible(),'Category editor preserved');
                await page.keyboard.press('Escape');
            }
            await page.evaluate(()=>switchView('promotions'));
            check(await page.locator('#promotions-list').innerText().then(text=>text.includes('Menu duo')), 'Promotions preserved');
            await page.evaluate(()=>switchView('drivers'));
            await page.locator('#drivers-table-body tr').first().waitFor();
            check(await page.locator('#view-drivers').isVisible(), 'Team screen preserved');
            check(await page.locator('#view-drivers').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`Team frame fits ${width}`);
            await page.evaluate(()=>switchView('settings'));
            check(await page.locator('#toggle-store').isEnabled(), 'Legacy settings available to admin');
            await page.evaluate(()=>switchView('overview'));
            if (width<1000) {
                await page.locator('#admin-more-button').click();
                check(await page.locator('#admin-more').isVisible(), 'Secondary menu opens');
                await page.keyboard.press('Escape');
                check(!(await page.locator('#admin-more').isVisible()), 'Menu keyboard dismissal');
            }
        }
        await context.close();
    }
    if (!before) {
        for (const params of ['missing=1','profile-error=1','disabled=1','role=owner','profile-cache=1','profile-pending=1']) {
            const {context,page}=await open(390,params);
            check(await page.locator('#admin-access').isVisible(), `Fail closed: ${params}`);
            check(!(await page.locator('#admin-app').isVisible()), 'No privileged workspace');
            check(await page.evaluate(()=>__adminFixture.writes.length===0), 'No automatic provisioning');
            check(await page.evaluate(()=>[...__adminFixture.listeners].every(x=>x.ref.name==='users')), 'Denied account never subscribes operational data');
            await page.evaluate(()=>{window.openItemEditor();window.setStatus('fixture-0','confirmed');});
            check(await page.evaluate(()=>__adminFixture.writes.length===0), 'Denied account cannot invoke guarded actions');
            await context.close();
        }
        for (const role of ['manager','caissier','livreur','delivery']) {
            const {context,page}=await open(390,`role=${role}`);
            await page.locator('#login-section').waitFor({state:'hidden'});
            const denied=role==='manager'?'drivers':'menu';
            check(await page.evaluate(view=>switchView(view),denied)===false,`${role} direct route denied`);
            await page.evaluate(()=>{openItemEditor();deleteDriver('someone');});
            if (role==='manager') await page.keyboard.press('Escape');
            check(await page.evaluate(()=>__adminFixture.writes.length===0),`${role} no prohibited writes`);
            if (['livreur','delivery'].includes(role)) {
                check(await page.locator('#view-driver').isVisible(), 'Driver view no longer hidden by parent');
                await page.locator('#driver-nav-deliveries').click();
                check(await page.locator('#driver-tab-deliveries').isVisible(), 'Driver bottom navigation works');
                if(root) await page.screenshot({path:path.join(root,`driver-${role}-390.png`)});
                await page.evaluate(()=>claimDelivery('fixture-20'));
                check(await page.evaluate(()=>__adminFixture.data.orders.find(x=>x.id==='fixture-20').deliveryGuyId==='fixture-staff'),'Legacy transactional driver claim works');
                page.once('dialog',dialog=>dialog.accept());
                await page.evaluate(()=>markDelivered('fixture-20'));
                check(await page.evaluate(()=>__adminFixture.data.orders.find(x=>x.id==='fixture-20').status==='delivered'),'Legacy driver completion works');
            }
            if (role==='caissier') {
                check(!(await page.locator('[data-view="overview"]').count()), 'Cashier sees only authorized destinations');
                await page.evaluate(()=>setStatus('fixture-0','confirmed'));
                check(await page.evaluate(()=>__adminFixture.writes.length===1),'Authorized cashier legacy update works in memory');
            }
            await page.evaluate(()=>__adminFixture.revoke());
            await page.locator('#admin-access').waitFor();
            check(await page.evaluate(()=>[...__adminFixture.listeners].every(x=>x.ref.name==='users')), 'Profile revocation removes data listeners');
            await context.close();
        }
        for (const params of ['empty=1','orders-error=1','config-missing=1']) {
            const {context,page}=await open(390,params);
            if(params==='empty=1') check(await page.locator('#overview-orders').innerText()==='0','Empty reports zero');
            if(params==='orders-error=1') {
                check(await page.locator('#overview-notice').innerText().then(text=>text.includes('Impossible')), 'Reporting error explained');
                check(await page.locator('#overview-orders').innerText()==='—','Error never shows fake zeros');
                await page.locator('#overview-refresh').click();
            }
            if(params==='config-missing=1') {
                await page.evaluate(()=>switchView('settings'));
                check(await page.locator('#toggle-store').isDisabled(), 'Missing config cannot be edited');
                check(await page.evaluate(()=>__adminFixture.writes.length===0), 'Missing config never auto-writes');
            }
            if(root) await page.screenshot({path:path.join(root,`state-${params.split('=')[0]}-390.png`)});
            await context.close();
        }
        const {context,page}=await open(1440);
        await page.evaluate(()=>{
            const f=__adminFixture, row=f.data.orders[0];
            f.data.orders=Array.from({length:1002},(_,i)=>({...row,id:`cap-${i}`})); f.emit();
        });
        check(await page.locator('#overview-orders').innerText()==='—','History cap hides incomplete metrics');
        check(await page.locator('#overview-notice').innerText().then(text=>text.includes('incomplets')),'History truncation disclosed');
        check(await page.locator('#overview-attention').innerText().then(text=>text.includes('indisponible')),'Active queue cap hides incomplete counts');
        await page.evaluate(()=>{__adminFixture.data.orders=[]; __adminFixture.cached=true; __adminFixture.emit();});
        check(await page.locator('#overview-notice').innerText().then(text=>text.includes('cache')),'Cache freshness explained');
        await page.evaluate(()=>{__adminFixture.failOrders=true; __adminFixture.emit();});
        check(await page.locator('#overview-orders').innerText()==='—','Realtime failure clears stale KPI');
        await page.evaluate(()=>{__adminFixture.failOrders=false; __adminFixture.cached=false;});
        await page.locator('#overview-refresh').click();
        await page.waitForFunction(()=>document.getElementById('overview-orders').textContent==='0');
        check(await page.locator('#overview-notice').isHidden(),'Successful retry clears error');
        await page.evaluate(()=>switchView('settings'));
        await page.evaluate(()=>__adminFixture.failWrites=true);
        await page.locator('#toggle-whatsapp').click();
        check(await page.locator('#admin-settings-feedback').innerText().then(text=>text.includes('non aboutie')),'Settings failure never reports success');
        check(!(await page.locator('#toggle-whatsapp').isChecked()),'Failed setting restored');
        await page.evaluate(()=>__adminFixture.failWrites=false);
        await page.locator('#toggle-whatsapp').check();
        check(await page.evaluate(()=>__adminFixture.data.settings[0].whatsappMode===true),'Confirmed settings write works');
        const writesBefore=await page.evaluate(()=>__adminFixture.writes.length);
        page.once('dialog',dialog=>dialog.dismiss());
        await page.locator('#toggle-store').click();
        check(await page.evaluate(()=>__adminFixture.writes.length)===writesBefore,'Cancel closure avoids config/order writes');
        await page.evaluate(()=>__adminFixture.setRole('caissier'));
        check(await page.locator('#view-orders').isVisible(),'Live downgrade routes cashier correctly');
        check(!(await page.locator('#view-overview').isVisible()),'Live downgrade hides Overview');
        await page.evaluate(()=>signOut(auth));
        check(await page.locator('#login-section').isVisible(),'Logout restores login');
        check(await page.evaluate(()=>__adminFixture.listeners.size===0),'Logout removes all Firestore listeners');
        await context.close();
    }
    check(firebaseRequests === 0, 'No Firebase SDK or production requests');
    check(errors.length === 0, `No browser errors: ${errors.join('; ')}`);
    console.log(JSON.stringify({ checks, firebaseRequests, errors, screenshots: root || null }));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
