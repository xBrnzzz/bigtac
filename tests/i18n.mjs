import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startFixtureServer } from './fixtures/server.mjs';
import { startAdminFixtureServer } from './fixtures/admin-server.mjs';

let passed = 0;
const check = (val, msg) => { assert.ok(val, msg); passed++; };

// Part 1: Storefront i18n
const { server: storeServer, url: storeUrl } = await startFixtureServer();
let browser;
let errors = [];

try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/, route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));

    // Test 1: Storefront default language (FR)
    await page.goto(`${storeUrl}/index.html?scenario=normal`, { waitUntil: 'domcontentloaded' });
    check(await page.locator('html').getAttribute('lang') === 'fr', 'Initial html lang is fr');
    check(await page.locator('#btnLang').isVisible(), 'Language selector button is present in storefront header');

    // Test 2: Switch Storefront to English (EN)
    await page.locator('#btnLang').click();
    check(await page.locator('#langDropdown').isVisible(), 'Language dropdown opens on click');
    await page.locator('#langDropdown button[data-lang-btn="en"]').click();

    check(await page.locator('html').getAttribute('lang') === 'en', 'HTML lang updated to en');
    check(await page.locator('html').getAttribute('dir') === 'ltr', 'HTML dir is ltr for English');
    check(await page.locator('#currentLangLabel').textContent() === 'EN', 'Current lang code badge displays EN');
    check((await page.locator('a[data-i18n="nav.menu"]').textContent()).trim() === 'Menu', 'Nav menu translated to English');
    check((await page.locator('#menu-title').textContent()).trim() === 'Our Menu', 'Menu section title translated to English');
    check((await page.locator('#store-title .hero-lead').textContent()).trim() === 'Hungry?', 'Hero title translated to English');
    check((await page.locator('.intro-cta').textContent()).includes('Order now'), 'Hero CTA translated to English');
    check((await page.locator('#promotions-title').textContent()).trim() === 'Promotions', 'Promotions title translated to English');
    check((await page.locator('#popular-title').textContent()).trim() === 'Best Sellers', 'Best Seller title translated to English');
    check(await page.locator('#menuSearch').getAttribute('placeholder') === 'A taco, a burger…', 'Search placeholder translated to English');

    check(!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(await page.locator('#btnLang, #langDropdown').allTextContents().then(parts => parts.join(' '))), 'Storefront language controls contain no emoji');
    await page.evaluate(() => {
        __fixture.settings.restaurantName = 'Fermer';
        __fixture.settings.storefront = {copy: {en:{heroLead:'Catégories'}, ar:{heroLead:'Disponible'}}};
        __fixture.emitSettings();
    });
    check(await page.locator('#hero-brand').textContent() === 'Fermer', 'A restaurant name matching an interface label stays literal');
    check(await page.locator('.hero-lead').textContent() === 'Catégories', 'Storefront uses saved custom English hero copy verbatim');

    // Test 3: Switch Storefront to Arabic (AR) with RTL
    await page.locator('#btnLang').click();
    await page.locator('#langDropdown button[data-lang-btn="ar"]').click();

    check(await page.locator('html').getAttribute('lang') === 'ar', 'HTML lang updated to ar');
    check(await page.locator('html').getAttribute('dir') === 'rtl', 'HTML dir is rtl for Arabic');
    check(await page.locator('#currentLangLabel').textContent() === 'AR', 'Current lang code badge displays AR');
    check((await page.locator('a[data-i18n="nav.menu"]').textContent()).trim() === 'القائمة', 'Nav menu translated to Arabic');
    check((await page.locator('#menu-title').textContent()).trim() === 'قائمتنا', 'Menu section title translated to Arabic');
    check(await page.locator('.hero-lead').textContent() === 'Disponible', 'Storefront uses saved custom Arabic hero copy verbatim');
    check(await page.locator('#hero-brand').textContent() === 'Fermer', 'Switching languages leaves the custom restaurant name unchanged');
    await page.evaluate(() => { delete __fixture.settings.storefront; __fixture.emitSettings(); });
    check((await page.locator('#store-title').textContent()).includes('جيعان ؟'), 'Default hero title translated to Arabic');
    check((await page.locator('.intro-cta').textContent()).includes('اطلب دابا'), 'Hero CTA translated to Arabic');
    check((await page.locator('#promotions-title').textContent()).trim() === 'العروض الخاصة', 'Promotions title translated to Arabic');
    check((await page.locator('#popular-title').textContent()).trim() === 'الأكثر طلباً', 'Best Seller title translated to Arabic');
    check(await page.locator('#menuSearch').getAttribute('placeholder') === 'تاكوس، برغر…', 'Search placeholder translated to Arabic');

    // Test 4: Reload preserves language
    await page.reload({ waitUntil: 'domcontentloaded' });
    check(await page.locator('html').getAttribute('lang') === 'ar', 'Saved Arabic language persists across reload');
    check(await page.locator('html').getAttribute('dir') === 'rtl', 'RTL layout persists across reload');

    // Reset back to French
    await page.locator('#btnLang').click();
    await page.locator('#langDropdown button[data-lang-btn="fr"]').click();
    check(await page.locator('html').getAttribute('lang') === 'fr', 'Successfully reset back to French');
    await context.close();
} finally {
    storeServer.close();
}

// Part 2: Admin & Livreur i18n
const { server: adminServer, url: adminUrl } = await startAdminFixtureServer();
try {
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await adminContext.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/, route => route.abort());
    const adminPage = await adminContext.newPage();
    adminPage.on('pageerror', err => errors.push(err.message));

    await adminPage.goto(`${adminUrl}/admin.html`, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForFunction(() => window.__adminFixture);
    await adminPage.locator('#login-section').waitFor({ state: 'hidden' });

    // Admin topbar language switcher
    check(await adminPage.locator('#btnAdminLang').isVisible(), 'Admin topbar has language switcher');
    await adminPage.locator('#btnAdminLang').click();
    check(await adminPage.locator('#adminLangDropdown').isVisible(), 'Admin language dropdown opens on click');

    check(!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(await adminPage.locator('.lang-selector').allTextContents().then(parts => parts.join(' '))), 'All Admin language controls contain no emoji');
    await adminPage.locator('#adminLangDropdown button[data-lang-btn="en"]').click();
    check(await adminPage.locator('[data-metric="orders"] dt').innerText() === 'Orders today', 'Overview KPI labels switch to English');
    await adminPage.evaluate(() => switchView('orders'));
    await adminPage.getByText('Accept for preparation', {exact:true}).first().waitFor();
    check(await adminPage.locator('#orders-title').innerText() === 'Orders', 'Live order heading switches with the workspace');
    await adminPage.evaluate(() => switchView('menu'));
    check(await adminPage.locator('#menu-admin-search').getAttribute('placeholder') === 'Product name…', 'Catalog placeholder switches to English');
    await adminPage.locator('[data-menu-action=new]').click();
    const editor = adminPage.locator('#item-editor');
    check(await editor.locator('h2').innerText() === 'New product', 'Dynamically opened editor is in English');
    await editor.locator('#input-name').fill('Fermer');
    await adminPage.evaluate(() => setAppLanguage('ar'));
    check(await editor.locator('#input-name').inputValue() === 'Fermer', 'Switching Admin language keeps product draft text');
    check(await editor.locator('h2').innerText() === 'منتج جديد', 'Open editor responds to Arabic');
    adminPage.once('dialog', dialog => dialog.accept());
    await editor.locator('header button').click();
    await adminPage.locator('[data-menu-action=import]').click();
    check((await adminPage.locator('#menu-import-prompt-text').inputValue()).startsWith('اقرأ الصور'), 'Copyable import instructions are in Arabic');
    await adminPage.locator('#menu-import-dialog header button').click();

    // Switch admin to Arabic using the menu
    await adminPage.locator('#btnAdminLang').click();
    await adminPage.locator('#adminLangDropdown button[data-lang-btn="ar"]').click();
    check(await adminPage.locator('html').getAttribute('lang') === 'ar', 'Admin HTML lang switched to ar');
    check(await adminPage.locator('html').getAttribute('dir') === 'rtl', 'Admin HTML dir switched to rtl');

    // Driver dedicated interface element
    check(await adminPage.locator('#btnDriverLang').count() > 0, 'Driver interface has language switcher');

    // Reset back to French
    await adminPage.locator('#btnAdminLang').click();
    await adminPage.locator('#adminLangDropdown button[data-lang-btn="fr"]').click();
    check(await adminPage.locator('html').getAttribute('lang') === 'fr', 'Admin HTML lang reset to fr');

    await adminContext.close();
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    console.log(`PASS: ${passed} multi-language checks passed cleanly.`);
} finally {
    if (browser) await browser.close();
    adminServer.close();
}
