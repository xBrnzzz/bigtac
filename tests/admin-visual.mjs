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
try {
    for (const width of [320, 390, 768, 1440]) {
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
            await page.screenshot({ path: path.join(output, `${before ? 'before' : 'after'}-${screen}-${width}.png`) });
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
                    return [...root.querySelectorAll('.admin-kpi dt,.admin-kpi dd,.admin-kpi small,.order-status,.order-service,.order-age,.order-actions .primary')].filter(el => el.getClientRects().length).map(el => {
                        let background = el;
                        while (background.parentElement && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background = background.parentElement;
                        const a = lum(getComputedStyle(el).color), b = lum(getComputedStyle(background).backgroundColor);
                        return { label:el.textContent, ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05) };
                    }).filter(result => result.ratio < 4.5);
                });
                check(contrast.length === 0, `${screen}: text contrast ${width}: ${JSON.stringify(contrast)}`);
                if (screen === 'overview') {
                    await page.locator('#view-overview').evaluate(el => el.scrollTop = el.scrollHeight);
                    await page.screenshot({ path:path.join(output, `after-overview-lower-${width}.png`) });
                    await page.locator('#view-overview').evaluate(el => el.scrollTop = 0);
                }
                if (screen === 'orders' || screen === 'kitchen') {
                    const action = page.locator(screen === 'kitchen' ? '#list-confirmed .primary' : '#list-pending .primary').first();
                    await action.focus();
                    const bounds = await action.evaluate(el => { const rect=el.getBoundingClientRect(), list=el.closest('.orders-list').getBoundingClientRect(); return { height:rect.height, top:rect.top, bottom:rect.bottom, listTop:list.top, listBottom:list.bottom, focused:document.activeElement===el }; });
                    check(bounds.focused && bounds.height>=44 && bounds.top>=bounds.listTop && bounds.bottom<=bounds.listBottom+1, `${screen} primary action reachable ${width}: ${JSON.stringify(bounds)}`);
                }
            }
        }
        if (!before) {
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
    check(firebaseRequests === 0, 'Zero production Firebase requests');
    check(errors.length === 0, errors.join('\n'));
    console.log(`${checks} visual checks passed; zero production Firebase requests. Screenshots: ${output}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
