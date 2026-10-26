import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startFixtureServer } from './fixtures/server.mjs';

const { server, url } = await startFixtureServer();
const browser = await chromium.launch();
const screenshots = process.env.BIGTAC_CUSTOMIZATION_SCREENSHOTS;
if (screenshots) fs.mkdirSync(screenshots, { recursive: true });
const fixture = fs.readFileSync(new URL('./fixtures/firebase.js', import.meta.url), 'utf8');
let checks = 0, productionRequests = 0;
const errors = [];
const check = (value, label) => { assert.ok(value, label); checks++; };
async function capture(page, name) {
    if (screenshots) await page.screenshot({ path: path.join(screenshots, name + '.png'), animations: 'disabled' });
}
async function choose(page, name = 'Tacos Poulet') {
    await page.locator('#menuContent').getByRole('button', { name: `Choisir ${name}`, exact: true }).click();
}
async function visibleTitle(page, index) {
    return page.locator(`#choice-group-${index} legend`).evaluate(el => {
        const box = el.getBoundingClientRect(), viewport = document.getElementById('modalContent').getBoundingClientRect();
        return box.top >= viewport.top - 1 && box.bottom <= viewport.bottom + 1;
    });
}
async function open(width, dark, reduced, unbounded = false) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: dark ? 'dark' : 'light' });
    await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/, route => { productionRequests++; return route.abort(); });
    let source = fixture.replaceAll("imageUrl:'assets/tacos-hero.jpg'", "imageUrl:'assets/tacos-campaign.jpg'");
    if (unbounded) source = source.replace('const categories=', 'choices[1].max = 0;\nconst categories=');
    await context.route('**/firebase-config.js', route => route.fulfill({ contentType: 'text/javascript', body: source }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#menuContent .product-card').first().waitFor();
    if (await page.evaluate(() => document.documentElement.classList.contains('dark')) !== dark) await page.locator('#btnDarkMode').click();
    return { context, page };
}
try {
    for (const [width, dark, reduced] of [[390, false, true], [390, true, false], [1440, false, false], [1440, true, true]]) {
        const { context, page } = await open(width, dark, reduced);
        const prefix = `${width}-${dark ? 'dark' : 'light'}`;
        const settle = () => page.waitForTimeout(reduced ? 320 : 800);
        check((await page.locator('#promotions-title').textContent()).trim() === 'Promotions', 'Promotion label is updated');
        check((await page.locator('#popular-title').textContent()).trim() === 'Best Seller', 'Best Seller label is updated');
        const colours = await page.locator('#popularGrid .product-card').first().evaluate(el => ({ background: getComputedStyle(el).backgroundColor, text: getComputedStyle(el).color }));
        check(colours.background === (dark ? 'rgb(41, 38, 32)' : 'rgb(58, 58, 48)'), `${prefix}: historical light card surface/current dark surface`);
        check(colours.text === (dark ? 'rgb(246, 247, 246)' : 'rgb(255, 250, 244)'), `${prefix}: readable light text, unchanged dark text`);
        check(await page.locator('#popular .section-heading p').evaluate(el => getComputedStyle(el).color) === (dark ? 'rgb(204, 192, 177)' : 'rgb(107, 98, 88)'), `${prefix}: section caption retains its readable neutral colour`);
        await page.locator('#popular').scrollIntoViewIfNeeded();
        await capture(page, prefix + '-best-seller');
        await choose(page);
        const pageY = await page.evaluate(() => scrollY);
        check(await page.locator('#choice-next-0').isDisabled(), 'Required single choice cannot be skipped');
        await page.locator('#choice-0-1').check();
        check((await page.locator('#modalTotalPriceDisplay').innerText()).includes('32'), 'Price changes immediately after size selection');
        await settle();
        check(await visibleTitle(page, 1), 'Single choice advances to the full next title');
        check(await page.locator('#modalContent').evaluate(el => el.scrollTop > 0), 'Only the customization content scrolls');
        check(await page.evaluate(() => scrollY) === pageY, 'Outer document is stable');
        const beforeSauce = await page.locator('#modalContent').evaluate(el => el.scrollTop);
        await page.locator('#choice-1-0').check();
        await settle();
        check(await page.locator('#modalContent').evaluate((el, before) => Math.abs(el.scrollTop - before) <= 1, beforeSauce), 'Multi-choice does not advance after its first selection');
        check(await page.locator('#choice-next-1').isEnabled(), 'Continue is available once the minimum is met');
        await page.locator('#choice-next-1').click();
        await settle();
        check(await visibleTitle(page, 2), 'Continue reaches optional supplements without clipping');
        check((await page.locator('#choice-next-2').innerText()).includes('Passer'), 'Empty supplements offer Skip');
        await page.locator('#choice-2-0').check();
        await page.locator('#choice-2-1').check();
        const supplementsTop = await page.locator('#modalContent').evaluate(el => el.scrollTop);
        await settle();
        check(await page.locator('#modalContent').evaluate((el, before) => Math.abs(el.scrollTop - before) <= 1, supplementsTop), 'Even all optional supplements do not force progression');
        check(await page.evaluate(() => window.cart.length === 0), 'No item is automatically added');
        await capture(page, prefix + '-supplements');
        await page.locator('#choice-next-2').click();
        await settle();
        check(await page.locator('#customizationHint').evaluate(el => el === document.activeElement), 'Final Continue directs attention to the total/add footer');
        check(await page.locator('#btnModalAddToCart').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Final add action remains visible');
        check(await page.evaluate(() => scrollY) === pageY, 'Progression never scrolls the outer website');
        await page.getByRole('button', { name: 'Augmenter la quantité', exact: true }).click();
        check((await page.locator('#modalTotalPriceDisplay').innerText()).includes('82'), 'Quantity includes the selected options and supplements');
        await page.locator('#btnModalAddToCart').click();
        check(await page.evaluate(() => window.cart.length === 1 && window.cart[0].qty === 2 && window.cart[0].totalPrice === 82 && window.cart[0].supplements.length === 2), 'Explicit Add preserves options, quantity and cart calculation');

        await choose(page, 'Tacos Mixte');
        await page.locator('#choice-0-0').check();
        await settle();
        check(await page.locator('#choice-next-0').isDisabled(), 'Required meats keep Continue disabled below minimum');
        check(await page.locator('#choice-0-0').evaluate(el => el === document.activeElement), 'Incomplete meats do not advance');
        await page.locator('#choice-0-1').check();
        await settle();
        check(await page.locator('#customizationHint').evaluate(el => el === document.activeElement), 'Explicit maximum completes the last required group');
        check(await page.evaluate(() => window.cart.length === 1), 'Automatic final progression does not add a second item');
        await page.keyboard.press('Escape');

        await choose(page);
        await page.locator('#choice-1-0').check();
        await page.locator('#choice-1-1').check();
        await settle();
        check(!(await page.locator('#choice-group-2').evaluate(el => el === document.activeElement)), 'Later completed groups cannot skip an earlier required group');
        await page.locator('#choice-next-1').click();
        await settle();
        check(await page.locator('#choice-group-0').getAttribute('aria-invalid') === 'true' && await visibleTitle(page, 0), 'Continue reveals the earlier missing required choice');
        await page.locator('#choice-0-0').focus();
        await page.keyboard.press('ArrowDown');
        await settle();
        check(await page.locator('#choice-0-1').isChecked(), 'Native keyboard radio navigation is retained');
        check(await page.locator('#choice-0-1').evaluate(el => el === document.activeElement), 'Automatic scrolling does not steal keyboard option focus');
        await page.locator('#choice-next-0').click();
        await settle();
        check(await visibleTitle(page, 1), 'Backward editing remains available and can continue again');
        await page.locator('#choice-1-1').uncheck();
        await page.locator('#choice-1-1').check();
        await settle();
        check(await visibleTitle(page, 2), 'Reaching the explicit sauce maximum advances to supplements');
        await page.locator('#choice-next-2').click();
        check(await page.evaluate(() => window.cart.length === 1), 'Skipping optional supplements does not add automatically');
        await page.keyboard.press('Escape');
        await choose(page, 'Frites');
        check((await page.locator('#choice-next-0').innerText()).includes('Passer'), 'Supplement-only flow exposes the same Skip action');
        await page.locator('#choice-next-0').click();
        check(await page.locator('#customizationHint').evaluate(el => el === document.activeElement), 'Supplement-only Skip reaches the existing footer');
        await page.keyboard.press('Escape');
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
        check(await page.evaluate(() => window.__fixture.orders.length === 0), 'No order was submitted');
        await context.close();
        console.log(`PASS guided customization: ${prefix}, ${reduced ? 'reduced' : 'smooth'} motion`);
    }
    const unbounded = await open(390, false, true, true);
    await choose(unbounded.page);
    await unbounded.page.locator('#choice-0-0').check();
    await unbounded.page.waitForTimeout(320);
    for (const index of [0, 1, 2]) await unbounded.page.locator(`#choice-1-${index}`).check();
    await unbounded.page.waitForTimeout(320);
    check(await unbounded.page.locator('#choice-1-2').evaluate(el => el === document.activeElement), 'Unspecified maximum requires explicit Continue even when all choices are selected');
    check(await unbounded.page.locator('#choice-next-1').isEnabled(), 'Unbounded multi-choice keeps Continue available');
    await unbounded.context.close();
    check(productionRequests === 0, 'No production Firebase requests');
    assert.deepEqual(errors, []); checks++;
    console.log(`PASS: ${checks} customization/style checks, zero production Firebase requests.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
