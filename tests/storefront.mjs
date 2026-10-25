import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildCustomizationSteps, choiceRules, selectionIssue, customizationPrice, cartSelections } from '../assets/customization.js';
import { startFixtureServer } from './fixtures/server.mjs';

let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed++; };
const amount = text => Number(text.replace(/[^\d,.-]/g, '').replace(',', '.'));
const screenshotRoot = process.env.BIGTAC_SCREENSHOTS;
if (screenshotRoot) fs.mkdirSync(screenshotRoot, { recursive: true });

// The selection model is tested independently of its rendering.
const sample = { price: 22, mandatoryChoices: [{ title: 'Taille', type: 'radio', min: 1, max: 1, options: [{ name: 'M', price: 0 }, { name: 'L', price: 10 }] }], supplements: [{ name: 'Cheddar', price: 5 }] };
const steps = buildCustomizationSteps(sample);
check(steps.length === 2, 'Modifiers and supplements share one selection model');
check(Boolean(selectionIssue(steps[0], [])), 'Required selection is enforced');
check(!selectionIssue(steps[0], [{ name: 'L', price: 10 }]), 'A valid radio selection is accepted');
check(Boolean(selectionIssue(steps[0], [{}, {}])), 'Radio maximum is enforced');
const selections = { 0: [{ optionIndex: 1, name: 'L', price: 10 }], 1: [{ optionIndex: 0, name: 'Cheddar', price: 5 }] };
check(customizationPrice(sample, selections, 2) === 74, 'Options and quantity update the total');
check(customizationPrice(sample, { 0: [{ price: -2 }] }, 2) === 40, 'Existing negative size differences remain supported');
assert.deepEqual(cartSelections(steps, selections), { selectedOptions: [{ name: 'L', price: 10 }], supplements: [{ name: 'Cheddar', price: 5 }] }); passed++;
check(choiceRules({ type: 'choice', data: { min: 0, max: 0, options: [{}, {}] } }).max === 2, 'Legacy zero maximum means unspecified');
check(!selectionIssue({ type: 'choice', data: { type: 'radio', min: 0, max: 1, options: [{}] } }, []), 'Explicit optional radio choices remain optional');
check(Boolean(selectionIssue({ type: 'choice', data: { min: 2, max: 1, options: [{}] } }, [])), 'Impossible menu configuration cannot be added');

const { server, url } = await startFixtureServer();
let browser;
let activePage;
const errors = [];
let blockedFirebase = 0;
async function contextAt(width) {
    const context = await browser.newContext({ viewport: { width, height: width >= 1000 ? 960 : 844 }, isMobile: width < 768, hasTouch: width < 768 });
    await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/, route => { blockedFirebase++; return route.abort(); });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.setDefaultNavigationTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    activePage = page;
    return { context, page };
}
async function snap(page, name) {
    if (screenshotRoot) await page.screenshot({ path: path.join(screenshotRoot, name + '.png'), animations: 'disabled' });
}
async function loaded(page, scenario = 'normal') {
    await page.goto(`${url}/?scenario=${scenario}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!['empty', 'error', 'loading'].includes(scenario)) await page.locator('#menuContent .product-card').first().waitFor();
}
async function price(page, selector) { return amount(await page.locator(selector).innerText()); }
async function choose(page, id = 'tacos') {
    const names = { tacos: 'Tacos Poulet', single: 'Tacos Mixte', simple: 'Poulet Gratiné', optional: 'Burger Maison', supplements: 'Frites' };
    await page.locator('#menuContent').getByRole('button', { name: `Choisir ${names[id]}`, exact: true }).click();
    await page.locator('#addItemModal').waitFor({ state: 'visible' });
}
async function closeProduct(page) { await page.keyboard.press('Escape'); }
async function fillDetails(page) {
    await page.locator('#customerName').fill('Amine Test');
    await page.locator('#customerPhone').fill('0612345678');
    await page.locator('#customerNote').fill('Note de test local');
    await page.getByRole('button', { name: 'Choisir la réception', exact: true }).click();
}

try {
    browser = await chromium.launch({ headless: true });
    for (const width of [320, 375, 390, 768, 1440]) {
        const { context, page } = await contextAt(width);
        await loaded(page);
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
        if (await page.evaluate(() => document.documentElement.classList.contains('dark'))) await page.locator('#btnDarkMode').click();
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no browsing overflow`);
        check(await page.locator('button:visible').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 44)), `${width}: visible buttons have 44px tap targets`);
        check(await page.locator('.restaurant-intro h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 32), `${width}: compact app title`);
        await snap(page, `${width}-browse`);
        await page.locator('#categoryFilters').getByRole('button', { name: 'Burgers', exact: true }).click();
        check(await page.locator('#menuContent .section-block:not(.hidden)').count() === 1, `${width}: category browsing`);
        check(await page.locator('#categoryFilters [aria-pressed=true]').innerText() === 'Burgers', `${width}: accessible category state`);
        await page.locator('#menuSearch').fill('aucun-plat-123');
        check(await page.locator('#noSearchResults').isVisible(), `${width}: useful empty search state`);
        await page.locator('#clearSearchBtn').click();
        await page.locator('#menuSearch').fill('gratine');
        check(await page.locator('#menuContent .product-card:visible').count() === 1, `${width}: accent-insensitive search`);
        await page.locator('#clearSearchBtn').click();
        await choose(page);
        await page.keyboard.press('Shift+Tab');
        check(await page.locator('#btnModalAddToCart').evaluate(el => el === document.activeElement), `${width}: focus wraps inside product sheet`);
        await page.keyboard.press('Tab');
        check(await page.getByRole('button', { name: 'Fermer le plat', exact: true }).evaluate(el => el === document.activeElement), `${width}: keyboard focus stays in dialog`);
        check(await page.locator('#modalQtyMinus').isDisabled(), `${width}: minimum quantity is one`);
        await page.locator('#btnModalAddToCart').click();
        check(await page.locator('.option-group.has-error').count() === 2, `${width}: missing required groups show inline errors`);
        check(await page.evaluate(() => window.cart.length) === 0, `${width}: invalid item never enters cart`);
        await snap(page, `${width}-required-errors`);
        await page.locator('#choice-0-0').focus();
        await page.keyboard.press('ArrowDown'); // Native radio keyboard selection: L +10
        check(await page.locator('#choice-0-1').isChecked(), `${width}: keyboard radio selection updates state`);
        await page.locator('#choice-1-1').check(); // Barbecue
        await page.locator('#choice-1-0').check(); // Algérienne
        await page.locator('#choice-1-2').click(); // rejected third sauce
        check(!(await page.locator('#choice-1-2').isChecked()), `${width}: maximum checkbox selections enforced`);
        check((await page.locator('#choice-error-1').innerText()).includes('maximum'), `${width}: max-selection feedback`);
        await page.locator('#choice-2-0').check(); // Cheddar +5
        check(await price(page, '#modalTotalPriceDisplay') === 37, `${width}: live option price`);
        await page.getByRole('button', { name: 'Augmenter la quantité', exact: true }).click();
        check(await price(page, '#modalTotalPriceDisplay') === 74, `${width}: quantity updates total`);
        const buttonOnScreen = await page.locator('#btnModalAddToCart').evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
        check(buttonOnScreen, `${width}: add action remains on screen`);
        await snap(page, `${width}-customization`);
        await page.locator('#btnModalAddToCart').click();
        const item = await page.evaluate(() => window.cart[0]);
        check(item.qty === 2 && item.totalPrice === 74 && item.selectedOptions.length === 3 && item.supplements[0].name === 'Cheddar', `${width}: cart preserves selections and totals`);
        check(await page.locator('#navCartCount').innerText() === '2', `${width}: cart count agrees`);
        if (width < 768) check(await page.locator('#fabCart').isVisible(), `${width}: thumb-accessible cart`);
        await page.locator('#btnNavCart').click();
        check((await page.locator('#cartItemsContainer').innerText()).includes('Algérienne') && (await page.locator('#cartItemsContainer').innerText()).includes('Cheddar'), `${width}: full cart choices are visible`);
        await page.getByRole('button', { name: 'Augmenter la quantité de Tacos Poulet', exact: true }).click();
        check(await price(page, '#cartFinalTotal') === 111, `${width}: cart increment total`);
        await page.getByRole('button', { name: 'Diminuer la quantité de Tacos Poulet', exact: true }).click();
        check(await price(page, '#cartFinalTotal') === 74, `${width}: cart decrement total`);
        await snap(page, `${width}-cart`);
        await page.getByRole('button', { name: 'Retirer Tacos Poulet', exact: true }).click();
        check(await page.locator('#btnGoToCheckout').isDisabled(), `${width}: empty cart cannot checkout`);
        await page.locator('#toastRegion').getByRole('button', { name: 'Annuler', exact: true }).click();
        check(await price(page, '#cartFinalTotal') === 74, `${width}: removal can be undone`);
        await page.locator('#btnGoToCheckout').click();
        check(await page.locator('#customerNote').inputValue() === '', `${width}: optional notes start empty and show their placeholder`);
        await page.getByRole('button', { name: 'Choisir la réception', exact: true }).click();
        check(await page.locator('#nameError').isVisible() && await page.locator('#phoneError').isVisible(), `${width}: inline contact validation`);
        await fillDetails(page);
        await page.getByRole('button', { name: /^Livraison À Fès/ }).click();
        check(await page.locator('#btnConfirmZone').isDisabled(), `${width}: delivery zone required`);
        await page.locator('.zone-option').first().click();
        await page.locator('#btnConfirmZone').click();
        check(await price(page, '#summaryTotal') === 78, `${width}: delivery fee included exactly once`);
        check((await page.locator('#summaryItems').innerText()).includes('Cheddar'), `${width}: summary keeps supplements`);
        await snap(page, `${width}-checkout`);
        await page.locator('#summaryModal .summary-detail').nth(1).getByRole('button', { name: 'Modifier' }).click();
        await page.getByRole('button', { name: /^À emporter Récupérez/ }).click();
        check(await price(page, '#summaryTotal') === 74 && !(await page.locator('#summaryDeliveryFee').isVisible()), `${width}: takeaway clears delivery fee`);
        await page.locator('#summaryModal .summary-detail').nth(1).getByRole('button', { name: 'Modifier' }).click();
        await page.getByRole('button', { name: /^Sur place On se retrouve/ }).click();
        check((await page.locator('#summaryType').innerText()) === 'Sur place', `${width}: dine-in preserved`);
        await page.keyboard.press('Escape');
        check(!(await page.locator('#summaryModal').isVisible()) && !(await page.locator('#app-shell').evaluate(el => el.inert)), `${width}: Escape closes dialog and restores page`);
        await choose(page, 'single');
        await page.locator('#btnModalAddToCart').click();
        check(await page.locator('#choice-error-0').isVisible(), `${width}: single-group minimum enforced`);
        await page.locator('#choice-0-0').check();
        await page.locator('#choice-0-1').check();
        await page.locator('#choice-0-2').click();
        check(!(await page.locator('#choice-0-2').isChecked()), `${width}: single-group maximum enforced`);
        await closeProduct(page);
        await choose(page, 'optional');
        check(await page.locator('#btnModalAddToCart').getAttribute('data-ready') === 'true', `${width}: optional group is not made required`);
        await closeProduct(page);
        await choose(page, 'supplements');
        await page.locator('#choice-0-0').check();
        check(await price(page, '#modalTotalPriceDisplay') === 14, `${width}: supplement-only flow updates price`);
        await closeProduct(page);
        await page.locator('#btnDarkMode').click();
        check(await page.evaluate(() => document.documentElement.classList.contains('dark')), `${width}: dark mode`);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no dark-mode overflow`);
        await choose(page);
        await snap(page, `${width}-dark-customization`);
        await closeProduct(page);
        await page.evaluate(() => localStorage.setItem('activeOrderId', 'fixture-order'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('#orderTracker').waitFor({ state: 'visible' });
        await page.evaluate(() => window.__fixture.setStatus('confirmed'));
        check((await page.locator('#trackerStatus').innerText()).includes('préparation'), `${width}: live order tracking`);
        if (width < 768) check(await page.evaluate(() => document.querySelector('#orderTracker').getBoundingClientRect().bottom <= document.querySelector('#fabCart').getBoundingClientRect().top), `${width}: tracker and cart do not overlap`);
        await snap(page, `${width}-tracking`);
        for (const status of ['en_livraison', 'ready', 'delivered', 'rejected']) {
            await page.evaluate(value => window.__fixture.setStatus(value), status);
            check((await page.locator('#trackerStatus').innerText()).length > 5, `${width}: ${status} tracking state`);
        }
        await page.getByRole('button', { name: 'Fermer le suivi', exact: true }).click();
        check(await page.evaluate(() => !localStorage.getItem('activeOrderId')), `${width}: tracker dismissal`);
        await context.close();
        console.log(`PASS responsive ordering flow: ${width}px`);
    }

    // Loading, failure, empty and retry states use no live services.
    const { context, page } = await contextAt(390);
    await loaded(page, 'loading');
    check(await page.locator('#menuContent').getAttribute('aria-busy') === 'true', 'Loading state is announced');
    await snap(page, 'state-loading');
    await page.locator('#menuContent .product-card').first().waitFor();
    await loaded(page, 'empty');
    await page.getByRole('heading', { name: 'La carte revient bientôt' }).waitFor();
    await snap(page, 'state-empty');
    await loaded(page, 'error');
    await page.getByRole('heading', { name: 'La carte se fait attendre' }).waitFor();
    await snap(page, 'state-error');
    await page.evaluate(() => { window.__fixture.failMenu = false; });
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await page.locator('#menuContent .product-card').first().waitFor();
    check(true, 'Failed menu can be retried');
    await loaded(page, 'closed');
    check(await page.locator('#closedBanner').isVisible(), 'Closed restaurant notice');
    await choose(page, 'simple');
    await page.locator('#btnModalAddToCart').click();
    await page.locator('#btnNavCart').click();
    check(await page.locator('#btnGoToCheckout').isDisabled(), 'Closed store checkout is clearly unavailable');
    await page.keyboard.press('Escape');
    await page.evaluate(() => localStorage.clear());

    await loaded(page, 'submit-error');
    await choose(page, 'simple');
    await page.locator('#btnModalAddToCart').click();
    await page.locator('#btnNavCart').click();
    await page.locator('#btnGoToCheckout').click();
    await fillDetails(page);
    await page.getByRole('button', { name: /^À emporter Récupérez/ }).click();
    await page.locator('#btnFinalize').click();
    await page.locator('#orderSubmissionError').waitFor({ state: 'visible' });
    check(await page.evaluate(() => window.cart.length === 1), 'Failed submission keeps cart');
    check(!(await page.locator('#btnFinalize').isDisabled()), 'Failed submission permits retry');
    await snap(page, 'state-submit-error');
    await page.evaluate(() => { window.__fixture.failSubmission = false; });
    await page.locator('#btnFinalize').click();
    await page.locator('#orderTracker').waitFor({ state: 'visible' });
    const payload = await page.evaluate(() => window.__fixture.orders[0]);
    check(payload.status === 'pending' && payload.type === 'emporter' && payload.total === 27 && payload.items[0].qty === 1, 'Mock order retains existing payload format');
    check(await page.evaluate(() => window.cart.length === 0), 'Successful mock submission clears cart');
    await page.evaluate(() => localStorage.clear());

    await loaded(page, 'tracker-error');
    await page.evaluate(() => localStorage.setItem('activeOrderId', 'fixture-order'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#trackerRetry').waitFor({ state: 'visible' });
    await page.evaluate(() => { window.__fixture.failTracking = false; });
    await page.locator('#trackerRetry').click();
    check(!(await page.locator('#trackerRetry').isVisible()), 'Tracking can recover after a connection error');
    await page.evaluate(() => localStorage.clear());

    await loaded(page, 'whatsapp');
    await page.evaluate(() => { window.__opened = []; window.open = url => { window.__opened.push(url); return null; }; });
    await choose(page);
    await page.locator('#choice-0-1').check();
    await page.locator('#choice-1-0').check();
    await page.locator('#choice-2-0').check();
    await page.locator('#btnModalAddToCart').click();
    await page.locator('#btnNavCart').click();
    await page.locator('#btnGoToCheckout').click();
    await fillDetails(page);
    await page.getByRole('button', { name: /^À emporter Récupérez/ }).click();
    check((await page.locator('#confirmationHint').innerText()).includes('WhatsApp'), 'WhatsApp handoff is explained');
    await page.locator('#btnFinalize').click();
    const whatsapp = await page.evaluate(() => decodeURIComponent(window.__opened[0]));
    check(whatsapp.startsWith('https://wa.me/') && whatsapp.includes('Cheddar') && whatsapp.includes('37.00 Dh'), 'WhatsApp message preserves selections and price');
    check(await page.evaluate(() => window.__fixture.orders.length) === 0, 'WhatsApp flow does not create a Firestore order');
    await context.close();

    const short = await contextAt(320);
    await short.page.setViewportSize({ width: 320, height: 568 });
    await loaded(short.page);
    await short.page.locator('#promotions .product-card__choose').first().click();
    check(await short.page.locator('#modalItemName').innerText() === 'Menu Tacos', 'Promotion opens its own customization');
    await short.page.locator('#choice-0-1').check();
    check(await price(short.page, '#modalTotalPriceDisplay') === 45, 'Promotion price and modifier are preserved');
    check(await short.page.locator('#btnModalAddToCart').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Add action fits a 320×568 screen');
    await snap(short.page, '320-short-product');
    await short.page.locator('#btnModalAddToCart').click();
    check(await short.page.evaluate(() => window.cart[0].id === 'promo' && window.cart[0].totalPrice === 45), 'Promotion is added with the correct price');
    await short.page.locator('#btnNavCart').click();
    await short.page.locator('#btnGoToCheckout').click();
    await short.page.setViewportSize({ width: 320, height: 420 });
    await short.page.locator('#customerNote').fill('Une note sur un petit écran');
    check(await short.page.getByRole('button', { name: 'Choisir la réception', exact: true }).evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Checkout action fits reduced viewport height');
    check(await short.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No overflow with reduced viewport height');
    await snap(short.page, '320-short-checkout');
    await short.context.close();
    check(blockedFirebase === 0, 'No Firebase SDK or production requests were attempted');
    assert.deepEqual(errors, [], 'No JavaScript runtime errors'); passed++;
    console.log(`PASS: ${passed} checks, zero production Firebase requests.`);
} catch (error) {
    if (activePage && !activePage.isClosed()) await snap(activePage, 'failure');
    throw error;
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
