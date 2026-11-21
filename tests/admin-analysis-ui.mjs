import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startAdminFixtureServer } from './fixtures/admin-server.mjs';

const { server, url } = await startAdminFixtureServer();
const browser = await chromium.launch();
const errors = [];
let externalRequests = 0;
const output = process.env.BIGTAC_ANALYSIS_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });

try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 940 }, reducedMotion: 'reduce' });
    await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/, route => {
        externalRequests++;
        return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(10000);
    await page.clock.setFixedTime(new Date('2026-11-21T18:00:00Z'));
    await page.goto(url + '/admin.html#overview', { waitUntil: 'domcontentloaded' });
    await page.locator('#overview-analysis-button').waitFor();
    await page.evaluate(() => {
        const ticket = (id, day, hour, type, status, total, name, qty) => ({
            id, shortId: id, createdAt: new Date(`2026-11-${day}T${hour}:00:00Z`),
            type, status, total, items: [{ name, qty }]
        });
        __adminFixture.data.orders = [
            ticket('A1', 21, 12, 'livraison', 'delivered', 90, 'Tacos poulet', 2),
            ticket('A2', 21, 17, 'emporter', 'pending', 55, 'Burger maison', 1),
            ticket('A3', 21, 13, 'livraison', 'rejected', 999, 'Produit refusé', 30),
            ticket('A4', 20, 18, 'livraison', 'delivered', 45, 'Tacos poulet', 1),
            ticket('A5', 20, 19, 'sur_place', 'delivered', 110, 'Burger maison', 2),
            ticket('A6', 19, 20, 'emporter', 'delivered', 30, 'Frites cheddar', 2),
            ticket('A7', 18, 12, 'sur_place', 'delivered', 90, 'Tacos poulet', 2),
            ticket('A8', 16, 11, 'emporter', 'delivered', 15, 'Frites cheddar', 1),
            ticket('A9', 15, 13, 'sur_place', 'delivered', 55, 'Burger maison', 1),
            ticket('A0', 14, 19, 'livraison', 'delivered', 505, 'Ancien produit', 40)
        ];
        __adminFixture.emit();
    });
    const liveCount = await page.locator('#overview-orders').innerText();
    const analysisButton = page.locator('#overview-analysis-button');
    const liveButton = page.locator('#overview-live-button');
    const report = page.locator('#overview-analysis');
    const period = page.locator('#analysis-period');
    const service = page.locator('#analysis-service');
    await analysisButton.focus();
    await page.keyboard.press('Enter');
    await report.waitFor();
    assert.equal(await period.inputValue(), 'week');
    assert.equal(await service.inputValue(), 'all');
    for (const field of [period, service]) {
        assert.ok(await field.evaluate(el => el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')), 'Filter has an accessible name');
    }
    const text = id => page.locator('#analysis-' + id).innerText();
    const amount = async id => Number((await text(id)).replace(/[^\d.,-]/g, '').replace(',', '.'));
    assert.equal(await text('count'), '9');
    assert.equal(await amount('value'), 490);
    assert.equal(await amount('average'), 61.25);
    assert.match(await text('products'), /Tacos poulet/);
    assert.doesNotMatch(await text('products'), /Produit refusé|Ancien produit/);
    assert.match(await text('services'), /Livraison/);
    const buckets = page.locator('#analysis-chart li .report-bar b');
    assert.deepEqual(await buckets.allTextContents(), ['1','1','0','1','1','2','3'], 'Every local date has the correct received count');
    assert.match(await page.locator('#analysis-products li').first().innerText(), /Tacos poulet[\s\S]*5/);
    const beforeFilters = await page.evaluate(() => __adminFixture.queries.filter(q => q.name === 'orders').length);

    for (const width of [320, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: width < 600 ? 844 : 940 });
        assert.ok(await report.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Dashboard fits ' + width + 'px');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page fits ' + width + 'px');
        if (output && (width === 390 || width === 1440)) {
            await analysisButton.scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(output, 'analysis-' + width + '.png'), animations: 'disabled' });
            await page.locator('#analysis-services').scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(output, 'analysis-services-' + width + '.png'), animations: 'disabled' });
            await analysisButton.scrollIntoViewIfNeeded();
        }
    }

    await period.selectOption('today');
    await page.setViewportSize({ width: 320, height: 844 });
    assert.ok(await report.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Hourly chart fits the narrowest viewport');
    const hourlyCounts = (await buckets.allTextContents()).map(Number);
    assert.equal(hourlyCounts.length, 24);
    const localHours = await page.evaluate(()=> {
        const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Casablanca',hour:'2-digit',hourCycle:'h23'});
        return ['12','13','17'].map(hour=>Number(clock.format(new Date(`2026-11-21T${hour}:00:00Z`))));
    });
    assert.deepEqual(hourlyCounts.map((n,i)=>n ? i : null).filter(i=>i!==null),localHours,'Adjacent local hours remain distinct');
    assert.equal(await text('count'), '3');
    assert.equal(await amount('value'), 145);
    await service.selectOption('livraison');
    assert.equal(await text('count'), '2');
    assert.equal(await amount('average'), 90);
    assert.equal((await text('rejections')).replace(/\s/g, ''), '50%');
    assert.equal((await buckets.allTextContents()).map(Number).reduce((sum, n) => sum + n, 0), 2);
    assert.equal(await page.locator('#analysis-services tbody tr').count(), 1);
    await period.selectOption('yesterday');
    assert.equal(await text('count'), '1');
    assert.equal(await amount('value'), 45);
    await service.selectOption('other');
    assert.equal(await text('count'), '0');
    assert.ok(await page.locator('#analysis-detail').isHidden());
    await liveButton.focus();
    await page.keyboard.press('Space');
    assert.ok(await report.isHidden());
    assert.equal(await page.locator('#overview-orders').innerText(), liveCount, 'Report filters do not alter live KPIs');
    await analysisButton.click();
    await period.selectOption('week');
    await service.selectOption('all');
    assert.equal(await page.evaluate(() => __adminFixture.queries.filter(q => q.name === 'orders').length), beforeFilters, 'Filtering reuses the loaded orders');
    await period.selectOption('month');
    const month = page.locator('#analysis-month');
    await page.waitForFunction(()=>document.querySelector('#analysis-count').textContent==='10');
    assert.equal(await month.inputValue(),'2026-11');
    assert.equal(await buckets.count(),21,'Current calendar month ends today');
    assert.equal(await amount('value'),995,'Monthly query includes tickets beyond the seven-day window');
    assert.match(await page.locator('#analysis-peaks li').first().innerText(),/21.*3/s);
    assert.ok(await report.evaluate(el => el.scrollWidth<=el.clientWidth+1),'Monthly chart and controls fit 320px');
    await service.selectOption('livraison');
    assert.equal(await text('count'),'4');
    assert.match(await page.locator('#analysis-peaks li').first().innerText(),/21.*2/s);
    await page.evaluate(()=>{
        const item={...__adminFixture.data.orders[0],id:'oct-end',createdAt:new Date('2026-10-31T22:59:00Z')};
        __adminFixture.data.orders.push(item);
        __adminFixture.emit();
    });
    await month.fill('2026-10');
    await month.dispatchEvent('change');
    await page.waitForFunction(()=>document.querySelector('#analysis-count').textContent==='1');
    assert.equal(await buckets.count(),31,'Completed calendar month includes all dates');
    assert.match(await page.locator('#analysis-peaks li').first().innerText(),/31/);
    await service.selectOption('all');
    await period.selectOption('week');
    await page.waitForFunction(()=>document.querySelector('#analysis-count').textContent==='9');
    await page.evaluate(() => {
        __adminFixture.data.orders[0].total = 'invalid';
        __adminFixture.data.orders[0].items[0].qty = -2;
        __adminFixture.emit();
    });
    assert.equal(await text('count'), '9');
    assert.match(await text('value'), /—|indisponible/i);
    assert.match(await text('average'), /—|indisponible/i);
    assert.doesNotMatch(await text('products'), /Tacos poulet|Burger maison/);
    await page.evaluate(() => {
        const order = __adminFixture.data.orders[0];
        __adminFixture.data.orders = Array.from({ length: 1002 }, (_, i) => ({ ...order, id: 'cap-' + i }));
        __adminFixture.emit();
    });
    assert.match(await text('count'), /—|indisponible/i);
    await page.evaluate(() => { __adminFixture.data.orders = []; __adminFixture.emit(); });
    assert.equal(await text('count'), '0');
    await page.evaluate(() => { __adminFixture.failOrders = true; __adminFixture.emit(); });
    assert.match(await text('count'), /—|indisponible/i);
    const duringRefresh = await page.evaluate(() => {
        __adminFixture.failOrders = false;
        document.getElementById('analysis-refresh').click();
        return {
            count: document.getElementById('analysis-count').textContent,
            busy: document.getElementById('overview-analysis').getAttribute('aria-busy')
        };
    });
    assert.equal(duringRefresh.busy, 'true');
    assert.match(duringRefresh.count, /—|chargement/i);
    await page.waitForFunction(() => document.getElementById('analysis-count').textContent === '0');
    await page.evaluate(() => { __adminFixture.cached = true; __adminFixture.emit(); });
    assert.match(await text('message'), /cache/i);
    assert.equal(await page.evaluate(() => __adminFixture.writes.length), 0);
    await page.goto(url + '/admin.html?rapport=analyse#overview', { waitUntil: 'domcontentloaded' });
    await report.waitFor();
    await page.evaluate(() => setAppLanguage('en'));
    assert.match(await service.locator('option:checked').innerText(), /all/i);
    await page.evaluate(() => setAppLanguage('ar'));
    assert.match(await period.locator('option:checked').innerText(), /[\u0600-\u06ff]/);
    assert.equal(await report.evaluate(el => getComputedStyle(el).direction), 'rtl');
    assert.ok(await report.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Arabic report fits a 320px viewport');
    await page.goto(url + '/admin.html?rapport=analyse&role=caissier#overview', { waitUntil: 'domcontentloaded' });
    await page.locator('#view-orders').waitFor();
    assert.ok(await report.isHidden(), 'The report link respects the cashier role');
    assert.equal(externalRequests, 0);
    assert.deepEqual(errors, []);
    console.log('Dashboard browser checks passed at 320, 375, 390, 768, 1024 and 1440px.');
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
