import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { startFixtureServer } from './fixtures/server.mjs';

const fixture = fs.readFileSync(new URL('./fixtures/firebase.js', import.meta.url), 'utf8');
const { server, url } = await startFixtureServer();
const browser = await chromium.launch();
let passed = 0, productionRequests = 0;
const errors = [];
const check = (value, message) => { assert.ok(value, message); passed++; };
const many = `items.forEach(item => item.isPopular = true); promotions.push(...Array.from({length:3}, (_,i) => ({...promotions[0], id:'promo-'+i, name:'Menu Démo '+i})));`;
async function open(width, density = 'many') {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true, reducedMotion: 'reduce' });
    await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/, route => { productionRequests++; return route.abort(); });
    const setup = density === 'many' ? many : density === 'single' ? 'items.forEach((item,i) => item.isPopular = i === 0);' : density === 'normal' ? '' : 'items.forEach(item => item.isPopular = false); promotions.splice(0);';
    await context.route('**/firebase-config.js', route => route.fulfill({ contentType: 'text/javascript', body: fixture.replace('const categories=', setup + '\nconst categories=') }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#menuContent .product-card').first().waitFor();
    await page.clock.install();
    return { context, page };
}
const left = (page, selector) => page.locator(selector).evaluate(el => el.scrollLeft);
const blur = page => page.evaluate(() => document.activeElement?.blur());
async function reset(page, selector, position = 0) {
    await page.locator(selector).evaluate((el, value) => { el.scrollLeft = value; el.dispatchEvent(new Event('scroll')); }, position);
}

try {
    for (const width of [320, 390, 768, 1440]) {
        const { context, page } = await open(width);
        for (const [section, track] of [['#promotions', '#promotionsGrid'], ['#popular', '#popularGrid']]) {
            await page.locator(track).scrollIntoViewIfNeeded();
            check(await page.locator(track).evaluate(el => el.scrollWidth > el.clientWidth), `${width}/${track}: multiple cards form a horizontal rail`);
            await page.locator(track).focus();
            await page.keyboard.press('ArrowRight');
            check(await left(page, track) > 20, `${width}/${track}: next navigation works with reduced motion`);
            await page.locator(track).focus();
            await page.keyboard.press('Home');
            check(await left(page, track) <= 1, `${width}/${track}: keyboard Home reaches the first card`);
            await page.keyboard.press('ArrowRight');
            check(await left(page, track) > 20, `${width}/${track}: keyboard arrow navigation works`);
            await page.keyboard.press('End');
            const maximum = await page.locator(track).evaluate(el => el.scrollWidth - el.clientWidth);
            check(Math.abs(await left(page, track) - maximum) <= 1, `${width}/${track}: keyboard End reaches the final card`);
            await page.keyboard.press('ArrowRight');
            check(await left(page, track) <= 1, `${width}/${track}: manual next loops to the first card`);
            await reset(page, track, 35);
            await page.keyboard.press('ArrowRight');
            check(await page.locator(track).evaluate(el => {
                const step = el.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap);
                return Math.abs(el.scrollLeft - Math.min(step, el.scrollWidth - el.clientWidth)) <= 1;
            }), `${width}/${track}: manual navigation aligns a full card after partial autoplay/dragging`);
        }

        // A drag beginning on the ordering action must not open or order a product.
        await reset(page, '#promotionsGrid');
        const offerButton = page.locator('#promotionsGrid button').first();
        await offerButton.scrollIntoViewIfNeeded();
        const button = await offerButton.boundingBox();
        await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
        await page.mouse.down();
        await page.mouse.move(button.x + button.width / 2 - 90, button.y + button.height / 2, { steps: 12 });
        await page.mouse.up();
        check(!(await page.locator('#addItemModal').isVisible()), `${width}: dragging an offer action does not trigger a click`);
        check(await left(page, '#promotionsGrid') > 40, `${width}: mouse dragging scrolls offers`);
        check(await page.evaluate(() => window.cart.length === 0), `${width}: dragging never adds an order item`);

        // Real browser touch events exercise native horizontal swipe behaviour.
        await reset(page, '#popularGrid');
        await page.locator('#popularGrid').scrollIntoViewIfNeeded();
        const box = await page.locator('#popularGrid').boundingBox();
        const cdp = await context.newCDPSession(page);
        const x = box.x + box.width - 30, y = box.y + 85;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 12, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(100);
        check(await left(page, '#popularGrid') > 20, `${width}: native touch swipe scrolls favourites`);
        check(!(await page.locator('#addItemModal').isVisible()), `${width}: touch swipe cannot activate a product`);
        await cdp.detach();

        // All autoplay checks use virtual time, not long wall-clock waits.
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        for (const [section, track] of [['#promotions', '#promotionsGrid'], ['#popular', '#popularGrid']]) {
            await page.locator(track).scrollIntoViewIfNeeded();
            await page.mouse.move(0, 0);
            await blur(page);
            await reset(page, track);
            await page.waitForTimeout(80); // Flush native intersection/scroll delivery.
            await page.clock.runFor(6300);
            const initial = await left(page, track);
            await page.clock.runFor(1000);
            const advanced = await left(page, track);
            check(advanced - initial >= 10 && advanced - initial <= 24, `${width}/${track}: autoplay advances slowly at approximately 18px/s`);
            await page.locator(section).hover();
            const hovered = await left(page, track);
            await page.clock.runFor(1000);
            check(Math.abs(await left(page, track) - hovered) <= 1, `${width}/${track}: hover pauses autoplay`);
            await page.mouse.move(0, 0);
            await page.locator(track).focus();
            const focused = await left(page, track);
            await page.clock.runFor(1000);
            check(Math.abs(await left(page, track) - focused) <= 1, `${width}/${track}: keyboard focus pauses autoplay`);
            await blur(page);
            await page.locator(track).focus();
            await page.keyboard.press('Space');
            await blur(page); await page.mouse.move(0, 0);
            const paused = await left(page, track);
            await page.clock.runFor(1000);
            check(Math.abs(await left(page, track) - paused) <= 1, `${width}/${track}: explicit Pause persists without focus`);
            await page.locator(track).focus();
            await page.keyboard.press('Space');
            await blur(page); await page.mouse.move(0, 0);
            const maximum = await page.locator(track).evaluate(el => el.scrollWidth - el.clientWidth);
            await reset(page, track, maximum - 2);
            await page.waitForTimeout(60);
            await page.clock.runFor(8500);
            check(await left(page, track) < maximum - 10, `${width}/${track}: automatic loop reverses smoothly at the end`);
            await reset(page, track, 30);
            await page.waitForTimeout(60);
            const manual = await left(page, track);
            await page.clock.runFor(1000);
            check(Math.abs(await left(page, track) - manual) <= 1, `${width}/${track}: manual scrolling pauses autoplay`);
            await page.clock.runFor(7000);
            check(Math.abs(await left(page, track) - manual) > 5, `${width}/${track}: autoplay resumes after the interaction cooldown`);
            await page.emulateMedia({ reducedMotion: 'reduce' });
            const reduced = await left(page, track);
            await page.clock.runFor(1500);
            check(Math.abs(await left(page, track) - reduced) <= 1, `${width}/${track}: reduced motion stops automatic movement`);
            await page.emulateMedia({ reducedMotion: 'no-preference' });
        }
        check(await page.locator('#promotionsGrid .product-card').count() === 4 && await page.locator('#popularGrid .product-card').count() === 5, `${width}: looping never duplicates product cards`);
        check(await page.locator('[data-carousel] .section-heading button').count() === 0, `${width}: no visible Pause or arrow buttons are rendered`);

        await page.emulateMedia({ reducedMotion: 'reduce' });
        await reset(page, '#promotionsGrid');
        await offerButton.click();
        check(await page.locator('#modalItemName').innerText() === 'Menu Tacos', `${width}: an intentional click still opens the original offer`);
        await page.locator('#choice-0-0').check();
        await page.locator('#btnModalAddToCart').click();
        check(await page.evaluate(() => window.cart.length === 1 && window.cart[0].id === 'promo'), `${width}: offer customization adds exactly one correct cart item`);

        await page.locator('.intro-cta').click();
        await page.evaluate(() => scrollTo(0, document.getElementById('menu-unified').offsetTop + 260));
        check(await page.evaluate(() => {
            const header = document.querySelector('.store-header').getBoundingClientRect();
            const bar = document.getElementById('stickyFilterBar').getBoundingClientRect();
            const search = document.getElementById('menuSearch').getBoundingClientRect();
            const chips = document.getElementById('categoryFilters').getBoundingClientRect();
            return bar.top >= header.bottom - 1 && search.top >= header.bottom && chips.top >= search.bottom && chips.bottom <= bar.bottom;
        }), `${width}: search and categories stick together below the header`);
        check(await page.locator('#categoryFilters').evaluate(el => getComputedStyle(el).scrollbarWidth === 'none'), `${width}: category scrollbar is visually hidden`);
        if (width < 768) {
            await page.locator('#categoryFilters button').last().focus();
            check(await page.locator('#categoryFilters').evaluate(el => el.scrollLeft > 0), `${width}: keyboard focus scrolls category chips`);
            check(await page.evaluate(() => document.getElementById('stickyFilterBar').getBoundingClientRect().bottom < document.getElementById('fabCart').getBoundingClientRect().top), `${width}: sticky search cannot cover the mobile cart action`);
        }
        await page.locator('#promotions').scrollIntoViewIfNeeded();
        check(await page.evaluate(() => document.getElementById('stickyFilterBar').getBoundingClientRect().top >= document.getElementById('popular').getBoundingClientRect().bottom), `${width}: sticky controls remain below featured sections`);
        await page.setViewportSize({ width, height: 420 });
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        check(await page.evaluate(() => document.getElementById('stickyFilterBar').getBoundingClientRect().bottom <= document.querySelector('.store-header').getBoundingClientRect().bottom), `${width}: sticky controls leave with the menu`);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal page overflow`);
        check(await page.evaluate(() => window.__fixture.orders.length === 0), `${width}: tests never submit an order`);
        await context.close();
        for (const density of ['single', 'empty']) {
            const small = await open(width, density);
            if (density === 'single') {
                await small.page.emulateMedia({ reducedMotion: 'no-preference' });
                await small.page.locator('#popularGrid').scrollIntoViewIfNeeded();
                await small.page.clock.runFor(2000);
                check(await left(small.page, '#popularGrid') === 0 && await left(small.page, '#promotionsGrid') === 0, `${width}: single cards never autoplay even with motion enabled`);
                check(await small.page.locator('[data-carousel] .section-heading button').count() === 0, `${width}: single items have no carousel buttons`);
                check(await small.page.locator('#promotionsGrid .product-card').count() === 1 && await small.page.locator('#popularGrid .product-card').count() === 1, `${width}: single featured items render without copies`);
            } else check(!(await small.page.locator('#promotions').isVisible()) && !(await small.page.locator('#popular').isVisible()), `${width}: zero featured items leave no empty carousel`);
            await small.context.close();
        }
        if (width === 1440) {
            const fitted = await open(width, 'normal');
            await fitted.page.emulateMedia({ reducedMotion: 'no-preference' });
            await fitted.page.locator('#popularGrid').scrollIntoViewIfNeeded();
            await fitted.page.clock.runFor(2000);
            check(await fitted.page.locator('#popularGrid .product-card').count() === 2, 'Desktop fixture contains two original favourites');
            check(await fitted.page.locator('#popular .section-heading button').count() === 0, 'Fully visible cards have no carousel buttons');
            check(await left(fitted.page, '#popularGrid') === 0, 'Fully visible cards do not autoplay');
            await fitted.context.close();
        }
        console.log(`PASS carousel and sticky-menu interactions: ${width}px`);
    }
    check(productionRequests === 0, 'No production Firebase requests');
    assert.deepEqual(errors, []); passed++;
    console.log(`PASS: ${passed} carousel/sticky checks, zero production Firebase requests.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
