import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startAdminFixtureServer } from './fixtures/admin-server.mjs';

// Isolated visual review: the server substitutes every Firebase import.
const output = process.env.BIGTAC_VISUAL_SCREENSHOTS;
assert.ok(output, 'Set BIGTAC_VISUAL_SCREENSHOTS outside the repository');
fs.mkdirSync(output, { recursive: true });
const before = process.argv.includes('--before');
const { server, url } = await startAdminFixtureServer();
const browser = await chromium.launch();
let checks = 0, firebaseRequests = 0;
const errors = [];
const check = (value, label) => { assert.ok(value, label); checks++; };
async function completeCapture(page,name,overflow) {
    const viewport=page.viewportSize();
    await page.setViewportSize({...viewport,height:Math.min(6000,viewport.height+Math.ceil(overflow)+2)});
    await page.screenshot({path:path.join(output,name+'.png'),fullPage:true,animations:'disabled'});
    await page.setViewportSize(viewport);
}
try {
    for (const width of [320, 390, 768, 1024, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, reducedMotion: 'reduce', hasTouch: width < 1440 });
        await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/, route => { firebaseRequests++; return route.abort(); });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${url}/admin.html?orders=rich`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.getElementById('overview-orders')?.textContent !== '—' && document.getElementById('admin-app')?.hidden === false);
        await page.evaluate(() => document.fonts.ready);
        for (const screen of ['overview', 'orders', 'kitchen', 'detail']) {
            if (screen === 'orders') { await page.evaluate(() => switchView('orders')); await page.locator('#list-pending .order-card').first().waitFor(); }
            if (screen === 'kitchen') await page.locator('#orders-mode-kitchen').click();
            if (screen === 'detail') await page.locator('#list-confirmed [data-open]').first().click();
            await page.screenshot({ path: path.join(output, `${before ? 'before' : 'after'}-${screen}-${width}.png`), fullPage:true });
            check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen}: page fits ${width}`);
            if (screen === 'detail') {
                check(await page.locator('#order-detail-actions').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Drawer footer visible');
                await page.keyboard.press('Escape');
            }
            if (!before) {
                const root = screen === 'overview' ? '#view-overview' : '#view-orders';
                check(await page.locator(`${root} .admin-glyph`).count() > 3, `${screen}: local outline icons rendered`);
                check(await page.locator('[aria-current="page"]').first().evaluate(el => getComputedStyle(el).color !== getComputedStyle(el.parentElement).color), 'Active navigation is distinct');
                const contrast = await page.locator(root).evaluate(root => {
                    const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
                    const lum = value => rgb(value).map(n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [.2126,.7152,.0722][i], 0);
                    return [...root.querySelectorAll('.admin-kpi dt,.admin-kpi dd,.admin-kpi small,.order-status,.order-service,.order-age,.order-actions .primary'),...document.querySelectorAll('.admin-sidebar .admin-nav-link')].filter(el => el.getClientRects().length).map(el => {
                        let background = el;
                        while (background.parentElement && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background = background.parentElement;
                        const a = lum(getComputedStyle(el).color), b = lum(getComputedStyle(background).backgroundColor);
                        return { label:el.textContent, ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05) };
                    }).filter(result => result.ratio < 4.5);
                });
                check(contrast.length === 0, `${screen}: text contrast ${width}: ${JSON.stringify(contrast)}`);
                if (screen === 'overview') {
                    const ticks=await page.locator('#overview-hourly svg text[text-anchor=end]').evaluateAll(nodes=>nodes.map(node=>({value:Number(node.textContent),y:node.getBoundingClientRect().y})));
                    check(ticks.length>=2&&ticks.length<=6&&ticks.every(tick=>Number.isInteger(tick.value)),'Count chart keeps a small integer axis');
                    check(ticks.slice(1).every((tick,index)=>Math.abs(tick.y-ticks[index].y)>=14),'Chart tick labels do not overlap');
                    if([390,1440].includes(width))await completeCapture(page,`after-overview-full-${width}`,await page.locator('#view-overview').evaluate(el=>el.scrollHeight-el.clientHeight));
                    await page.locator('#view-overview').evaluate(el => el.scrollTop = el.scrollHeight);
                    await page.screenshot({ path:path.join(output, `after-overview-lower-${width}.png`) });
                    await page.locator('#view-overview').evaluate(el => el.scrollTop = 0);
                }
                if (screen === 'orders' || screen === 'kitchen') {
                    const action = page.locator(screen === 'kitchen' ? '#list-confirmed .primary' : '#list-pending .primary').first();
                    await action.focus();
                    const bounds = await action.evaluate(el => { const rect=el.getBoundingClientRect(), list=el.closest('.orders-workspace').getBoundingClientRect(); return { height:rect.height, top:rect.top, bottom:rect.bottom, listTop:list.top, listBottom:list.bottom, focused:document.activeElement===el }; });
                    check(bounds.focused && bounds.height>=44 && bounds.top>=bounds.listTop && bounds.bottom<=bounds.listBottom+1, `${screen} primary action reachable ${width}: ${JSON.stringify(bounds)}`);
                }
            }
        }
        if (!before) {
            await page.locator('#orders-mode-service').click();
            await page.evaluate(()=>showOrderCol('history'));
            await page.locator('#list-history .order-card').first().waitFor();
            await page.screenshot({path:path.join(output,`after-orders-history-${width}.png`),fullPage:true});
            if([390,1440].includes(width)) {
                await page.evaluate(()=>showOrderCol('pending'));
                await completeCapture(page,`after-orders-full-${width}`,await page.locator('.orders-workspace').evaluate(el=>Math.max(0,el.scrollHeight-el.clientHeight)));
            }
            check(await page.locator('#list-history .order-card').count()>0,'Existing bounded history can be viewed');
            for(const view of ['menu','promotions','drivers','settings']) {
                await page.evaluate(view=>switchView(view),view);
                await page.locator(`#view-${view}`).waitFor({state:'visible'});
                if(view==='menu')await page.locator('#items-grid .menu-product').first().waitFor();
                if(view==='drivers')await page.locator('#drivers-table-body tr').first().waitFor();
                check(await page.locator(`#view-${view}`).evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${view} frame fits ${width}`);
                await page.screenshot({path:path.join(output,`after-${view}-${width}.png`),fullPage:true});
            }
            if(width===1440) {
                await page.locator('#admin-profile-button').click();
                check(await page.locator('#admin-more').isVisible(),'Desktop profile menu works');
                await page.keyboard.press('Escape');
                await page.locator('#admin-more').waitFor({state:'hidden'});
                check(await page.locator('#admin-profile-button').getAttribute('aria-expanded')==='false','Profile dismissal updates expanded state');
            }
            for (const tone of ['success','error','info']) {
                await page.evaluate(tone => showToast(`Vérification ${tone}`, tone), tone);
                const toast = page.locator(`.admin-toast[data-tone=${tone}]`).last();
                check(await toast.getAttribute('role') === 'status' && await toast.locator('svg[aria-hidden=true]').count() === 1, 'Toast has accessible feedback and local icon');
                check(await toast.evaluate(el => getComputedStyle(el).backgroundColor !== 'rgb(255, 255, 255)' && getComputedStyle(el).color !== 'rgb(255, 255, 255)'), 'Toast uses a semantic tint with dark text');
            }
        }
        check(await page.evaluate(() => __adminFixture.writes.length === 0), 'Visual review creates no writes');
        await context.close();
    }
    if(!before) for(const role of ['livreur','caissier','manager']) {
        const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
        await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/,route=>{firebaseRequests++;return route.abort();});
        const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
        await page.goto(`${url}/admin.html?role=${role}`,{waitUntil:'domcontentloaded'});
        const view=role==='livreur'?'driver':role==='caissier'?'orders':'overview';
        await page.locator(`#view-${view}`).waitFor({state:'visible'});
        // Phase 4 intentionally withholds the unassigned feed until a trusted,
        // redacted backend exists; do not wait for fictional claimable cards.
        if(role==='livreur')check(await page.locator('[data-driver-action=claim]').count()===0,'Unassigned delivery claim remains unavailable');
        await page.screenshot({path:path.join(output,`after-role-${role}-390.png`),fullPage:true});
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${role} landing fits`);
        check(await page.evaluate(()=>__adminFixture.writes.length===0),`${role} visual review creates no writes`);
        if(role==='livreur')check(await page.locator('#admin-bottom-nav').isHidden(),'Driver retains dedicated navigation');
        if(role==='caissier')check(await page.locator(':is(#admin-desktop-nav,#admin-bottom-nav,#admin-more-nav) [data-view=menu]').count()===0,'Cashier has no menu navigation');
        await context.close();
    }
    check(firebaseRequests === 0, 'Zero production Firebase requests');
    check(errors.length === 0, errors.join('\n'));
    console.log(`${checks} visual checks passed; zero production Firebase requests. Screenshots: ${output}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
