import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { foreground, glovoURL, GLOVO_LISTING, siteTheme, storefrontAppearance, storefrontAppearanceIssue } from '../assets/storefront-appearance.js';
import { startAdminFixtureServer } from './fixtures/admin-server.mjs';
import { startFixtureServer } from './fixtures/server.mjs';

assert.equal(glovoURL(GLOVO_LISTING), GLOVO_LISTING);
for (const invalid of ['javascript:alert(1)', 'http://glovoapp.com/x', 'https://glovoapp.com.example.test/x', 'https://glovoapp.com@evil.test/x', 'https://glovoapp.com:1234/x']) {
    assert.equal(glovoURL(invalid), '');
}
assert.equal(foreground('#000000'), '#ffffff');
assert.equal(foreground('#ffffff'), '#000000');
// Themes: BIGTAC light stays the default with no palette of its own; dark presets fill the roles saved colours leave empty.
assert.equal(storefrontAppearance({}).theme, 'bigtac');
assert.equal(storefrontAppearance({storefront:{theme:'neon'}}).theme, 'bigtac');
assert.deepEqual(siteTheme({}), {id:'bigtac', mode:'light', palette:{accent:'', background:'', surface:'', hero:'', footer:'', glovo:''}});
const charcoal = siteTheme({storefront:{theme:'charbon', palette:{accent:'#3159ac'}}});
assert.equal(charcoal.mode, 'dark');
assert.equal(charcoal.palette.accent, '#3159ac', 'A saved colour overrides the theme colour');
assert.equal(charcoal.palette.background, '#141416');
assert.equal(storefrontAppearanceIssue({...storefrontAppearance({}), theme:'neon'}), 'Thème inconnu.');
assert.equal(storefrontAppearanceIssue(storefrontAppearance({storefront:{theme:'charbon'}})), '');

const admin = await startAdminFixtureServer();
const store = await startFixtureServer();
const browser = await chromium.launch();
const errors = [];
let production = 0;
const contexts = [];
const heroFile = fileURLToPath(new URL('../assets/tacos-campaign.jpg', import.meta.url));
async function visit(url, width) {
    const context = await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce'});
    contexts.push(context);
    await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/, route => {
        production++;
        return route.abort();
    });
    await context.route('https://api.cloudinary.com/**', route => route.fulfill({
        contentType:'application/json', body:JSON.stringify({secure_url:'https://example.test/hero.webp'})
    }));
    await context.route('https://example.test/hero.webp', route => route.fulfill({ path:heroFile, contentType:'image/jpeg'}));
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, {waitUntil:'domcontentloaded'});
    return page;
}

try {
    for (const width of [320, 390, 1440]) {
        const page = await visit(store.url + '/index.html?scenario=closed', width);
        await page.locator('#hero-photo[src]').waitFor();
        const copy = await page.locator('.hero-message').boundingBox();
        const cta = await page.locator('.intro-cta').boundingBox();
        const panel = await page.locator('.restaurant-intro__copy').boundingBox();
        assert(await page.locator('html').evaluate(el => el.scrollWidth <= innerWidth));
        if (width < 700) {
            assert(cta.x + cta.width < copy.x, 'Hero button sits in the left column');
            assert(copy.x >= panel.x + panel.width * .38, 'Hero headline uses the right column');
            assert.equal(await page.locator('.intro-cta').evaluate(el => getComputedStyle(el).textAlign), 'center');
        } else {
            assert(await page.locator('.hero-lead').evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= 88);
            assert(cta.height >= 60);
        }
        await page.context().close();
    }
    for (const width of [320, 390, 768, 1440]) {
        const page = await visit(admin.url + '/admin.html#settings', width);
        await page.locator('#edit-storefront').click();
        const dialog = page.locator('#storefront-editor');
        const frame = dialog.frameLocator('iframe');
        await frame.locator('[data-glovo-placement="hero"]').waitFor();
        assert.equal(await frame.locator('[data-glovo-placement="hero"]').getAttribute('href'), null);
        assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth && document.documentElement.scrollWidth <= innerWidth));
        await dialog.locator('#site-color-accent').fill('#3159ac');
        await dialog.getByText('Photo et texte du bandeau', {exact:true}).click();
        await dialog.locator('[name="heroLead"]').fill('Une nouvelle accroche');
        assert.equal(await frame.locator('.hero-lead').textContent(), 'Une nouvelle accroche');
        assert.equal(await frame.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--app-accent').trim()), '#3159ac');
        assert.equal(await page.evaluate(() => __adminFixture.writes.length), 0);
        if (process.env.BIGTAC_APPEARANCE_SCREENSHOTS) {
            if (width < 800) await dialog.locator('#jump-storefront-preview').click();
            await dialog.screenshot({path:join(process.env.BIGTAC_APPEARANCE_SCREENSHOTS, `bigtac-appearance-${width}.png`)});
        }
        await page.context().close();
    }
    const page = await visit(admin.url + '/admin.html?role=manager#settings', 1366);
    await page.locator('#edit-storefront').click();
    const dialog = page.locator('#storefront-editor');
    const frame = dialog.frameLocator('iframe');
    await frame.locator('[data-glovo-placement="hero"]').waitFor();
    await dialog.locator('#site-color-accent').fill('#3159ac');
    await dialog.locator('#site-color-background').fill('#edf7fa');
    await dialog.locator('#site-color-surface').fill('#f4f1fb');
    assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--admin-primary').trim()), '#c84a13', 'Admin keeps the saved palette while previewing a draft');
    await dialog.getByText('Glovo', {exact:true}).click();
    await dialog.locator('[name="glovoUrl"]').fill('https://glovoapp.com.example.test/x');
    await dialog.locator('button[type=submit]').click();
    assert.match(await dialog.locator('#storefront-editor-status').innerText(), /glovoapp.com/);
    assert.equal(await page.evaluate(() => __adminFixture.writes.length), 0);
    await dialog.locator('[name="glovoUrl"]').fill(GLOVO_LISTING);
    await dialog.locator('[name="glovoPlacement"]').selectOption('both');
    await dialog.locator('[name="glovoLabel"]').fill('Livraison via Glovo');
    assert.equal(await frame.locator('[data-glovo-placement="footer"] [data-glovo-label]').textContent(), 'Livraison via Glovo');
    await dialog.getByText('Photo et texte du bandeau', {exact:true}).click();
    await dialog.locator('[name="heroLead"]').fill('À table');
    await dialog.locator('[name="heroClosedCta"]').fill('Découvrir la carte');
    await dialog.locator('#storefront-preview-closed').check();
    assert.equal(await frame.locator('.intro-cta span:first-child').innerText(), 'Découvrir la carte');
    await dialog.locator('[name="heroFile"]').setInputFiles(heroFile);
    await frame.locator('#hero-photo[src^="blob:"]').waitFor();
    await dialog.locator('[name="locale"]').selectOption('ar');
    await dialog.locator('[name="heroLead"]').fill('اكتشف قائمتنا');
    assert.equal(await frame.locator('html').getAttribute('dir'), 'rtl');
    assert.equal(await frame.locator('.hero-lead').innerText(), 'اكتشف قائمتنا');
    await dialog.locator('#storefront-preview-dark').check();
    assert.match(await frame.locator('html').getAttribute('class'), /\bdark\b/);
    await dialog.locator('#storefront-preview-device').selectOption('desktop');
    assert.equal(await frame.locator('html').evaluate(el => el.clientWidth), 1200);
    await dialog.getByText('Navigation, carte et pied de page', {exact:true}).click();
    await dialog.locator('[name="showPopular"]').uncheck();
    assert(await frame.locator('#popular').isHidden());
    await dialog.locator('button[type=submit]').click();
    await dialog.getByText('Vitrine enregistrée.', {exact:true}).waitFor();
    const saved = await page.evaluate(() => __adminFixture.data.settings.find(row => row.id === 'config').storefront);
    assert.equal(saved.copy.fr.heroLead, 'À table');
    assert.equal(saved.copy.ar.heroLead, 'اكتشف قائمتنا');
    assert.equal(saved.heroImage, 'https://example.test/hero.webp');
    assert.equal(saved.showPopular, false);
    assert.equal(saved.glovo.placement, 'both');
    assert.equal(saved.palette.accent, '#3159ac');
    const adminButton = page.locator('#edit-storefront');
    assert.equal(await adminButton.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(244, 241, 251)');
    assert.equal(await page.locator('#views-container').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(237, 247, 250)');
    assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--admin-primary').trim()), '#3159ac');
    await page.evaluate(() => {
        const config = __adminFixture.data.settings[0];
        config.storefront.palette.accent = '#f8e36a';
        __adminFixture.emit();
    });
    assert.equal(await page.locator('#admin-desktop-nav [aria-current]').evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
    await dialog.locator('#site-color-accent').fill('#235f54');
    await page.evaluate(() => {
        __adminFixture.data.settings[0].address = 'Réglage modifié en parallèle';
        __adminFixture.emit();
    });
    await dialog.getByText(/Les réglages ont changé/).waitFor();
    assert(await dialog.locator('button[type=submit]').isDisabled());

    const customer = await visit(store.url + '/index.html', 390);
    const glovo = customer.locator('[data-glovo-placement="hero"]');
    await glovo.waitFor();
    assert.equal(await glovo.getAttribute('href'), GLOVO_LISTING);
    await customer.evaluate(config => {__fixture.settings.storefront = config; __fixture.emitSettings();}, saved);
    assert.equal(await customer.locator('.hero-lead').textContent(), 'À table');
    assert(await customer.locator('#popular').isHidden());
    assert.equal(await customer.locator('#hero-photo').getAttribute('src'), saved.heroImage);
    assert.equal(await customer.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(237, 247, 250)');
    assert.equal(await customer.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--app-accent').trim()), '#3159ac');
    assert.equal(await customer.locator('[data-glovo-placement="footer"] [data-glovo-label]').textContent(), 'Livraison via Glovo');
    await customer.evaluate(() => setAppLanguage('ar'));
    assert.equal(await customer.locator('.hero-lead').textContent(), 'اكتشف قائمتنا');
    await customer.evaluate(() => {__fixture.settings.storefront.glovo.enabled = false; __fixture.emitSettings();});
    assert(await glovo.isHidden());
    assert.equal(await glovo.getAttribute('href'), null);
    assert.equal(await customer.evaluate(() => __fixture.orders.length), 0);

    const delayed = await visit(store.url + '/index.html?scenario=settings-wait', 390);
    for (let entry = 0; entry < 2; entry++) {
        await delayed.waitForFunction(() => __fixture.settingsListeners.size === 1);
        await delayed.waitForTimeout(1100);
        assert(await delayed.locator('#storefront-startup').isVisible(), 'Slow config shows a neutral loading state');
        assert(await delayed.locator('#app-shell').isHidden(), 'Cached branding stays hidden');
        assert.equal(await delayed.locator('#hero-photo').getAttribute('src'), null);
        assert.equal(await delayed.title(), 'Carte du restaurant');
        await delayed.evaluate(config => {
            __fixture.settings.restaurantName = 'Maison Démo';
            __fixture.settings.storefront = config;
            __fixture.emitSettings();
        }, saved);
        await delayed.locator('#app-shell').waitFor();
        assert.equal(await delayed.locator('#store-brand-name').textContent(), 'Maison Démo');
        assert.equal(await delayed.locator('.hero-lead').textContent(), 'À table');
        assert.equal(await delayed.locator('#hero-photo').getAttribute('src'), saved.heroImage);
        assert(await delayed.locator('#storefront-startup').isHidden());
        if (entry === 0) await delayed.reload({waitUntil:'domcontentloaded'});
    }
    // Charbon is a whole interface: dark, the customer's toggle hidden, a tab bar on phones, a floating hero dish on desktop.
    // BIGTAC classique restores the customer's own light/dark choice and the classic layout.
    const themed = await visit(store.url + '/index.html', 390);
    await themed.locator('#app-shell').waitFor();
    assert.doesNotMatch(await themed.locator('html').getAttribute('class'), /\bdark\b/);
    assert(await themed.locator('.theme-tabbar').isHidden(), 'Charbon-only elements stay hidden in the classic theme');
    await themed.evaluate(() => {__fixture.settings.storefront = {theme:'charbon'}; __fixture.emitSettings();});
    assert.match(await themed.locator('html').getAttribute('class'), /\bdark\b/);
    assert.equal(await themed.locator('html').getAttribute('data-site-theme'), 'charbon');
    assert(await themed.locator('#btnDarkMode').isHidden());
    assert(await themed.locator('.theme-tabbar').isVisible(), 'Phones get the bottom tab bar');
    assert(await themed.locator('#hero-photo').isHidden(), 'Phones open on the menu heading, not the photo poster');
    assert.equal(await themed.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(29, 29, 31)');
    assert.equal(await themed.locator('meta[name="theme-color"]').getAttribute('content'), '#141416');
    assert.equal(await themed.locator('#menuContent .product-card__choose').first().evaluate(el => getComputedStyle(el).borderRadius), '50%');
    assert(await themed.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await themed.locator('#menuContent .product-card__choose').first().click();
    await themed.locator('#addItemModal .add-to-cart-icon').waitFor();
    await themed.evaluate(() => closeAddItemModal());
    await themed.setViewportSize({width:1366, height:900});
    assert(await themed.locator('.theme-tabbar').isHidden(), 'Desktop has no tab bar');
    assert.equal(await themed.locator('#hero-photo').evaluate(el => getComputedStyle(el).borderRadius), '50%', 'Desktop hero dish floats');
    assert.equal(await themed.locator('.intro-cta').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(225, 29, 56)');
    assert(await themed.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await themed.evaluate(() => {__fixture.settings.storefront = {theme:'bigtac'}; __fixture.emitSettings();});
    assert.doesNotMatch(await themed.locator('html').getAttribute('class'), /\bdark\b/);
    assert(await themed.locator('#btnDarkMode').isVisible());
    assert(await themed.locator('#btnThemeSearch').isHidden());

    // Admin follows the saved theme: Charbon brings the rail and glass cards; BIGTAC classique restores the light workspace.
    const studio = await visit(admin.url + '/admin.html#orders', 1366);
    await studio.locator('#view-orders .order-card').first().waitFor();
    const paper = () => studio.locator('#view-orders .order-card').first().evaluate(el => getComputedStyle(el).backgroundColor);
    const rail = () => studio.locator('.admin-sidebar').evaluate(el => Math.round(el.getBoundingClientRect().width));
    assert.equal(await paper(), 'rgb(255, 255, 255)');
    const classicRail = await rail();
    await studio.evaluate(() => {__adminFixture.data.settings[0].storefront = {theme:'charbon'}; __adminFixture.emit();});
    assert.equal(await studio.locator('html').getAttribute('data-site-mode'), 'dark');
    assert.equal(await studio.locator('html').getAttribute('data-site-theme'), 'charbon');
    assert.equal(await rail(), 104, 'Charbon uses the slim rail');
    assert.equal(await studio.locator('.admin-body').evaluate(el => getComputedStyle(el).color), 'rgb(244, 244, 243)');
    assert.equal(await studio.locator('#view-orders .order-card').first().evaluate(el => getComputedStyle(el).borderTopWidth), '1px');
    await studio.evaluate(() => {__adminFixture.data.settings[0].storefront = {theme:'bigtac'}; __adminFixture.emit();});
    assert.equal(await studio.locator('html').getAttribute('data-site-mode'), 'light');
    assert.equal(await paper(), 'rgb(255, 255, 255)');
    assert.equal(await rail(), classicRail, 'The classic sidebar returns unchanged');

    // The editor's theme choice resets saved colours to the theme's own and locks the preview to dark.
    const chooser = await visit(admin.url + '/admin.html#settings', 1366);
    await chooser.locator('#edit-storefront').click();
    const themeDialog = chooser.locator('#storefront-editor');
    await themeDialog.frameLocator('iframe').locator('#hero-photo').waitFor();
    await themeDialog.locator('#site-color-accent').fill('#3159ac');
    await themeDialog.getByText('Charbon', {exact:true}).click();
    assert.equal(await themeDialog.locator('#site-color-accent').inputValue(), '');
    assert.equal(await themeDialog.locator('#site-color-accent').getAttribute('placeholder'), '#e11d38');
    assert(await themeDialog.locator('#storefront-preview-dark').isChecked());
    assert(await themeDialog.locator('#storefront-preview-dark').isDisabled());
    assert.match(await themeDialog.frameLocator('iframe').locator('html').getAttribute('class'), /\bdark\b/);
    assert.equal(await themeDialog.frameLocator('iframe').locator('html').getAttribute('data-site-theme'), 'charbon');
    await themeDialog.locator('button[type=submit]').click();
    await themeDialog.getByText('Vitrine enregistrée.', {exact:true}).waitFor();
    assert.equal(await chooser.evaluate(() => __adminFixture.data.settings[0].storefront.theme), 'charbon');
    assert.equal(await chooser.locator('html').getAttribute('data-site-mode'), 'dark');

    const unavailable = await visit(store.url + '/index.html?scenario=settings-error', 390);
    await unavailable.locator('#storefront-startup-retry').waitFor();
    assert(await unavailable.locator('#app-shell').isHidden(), 'A failed configuration read stays neutral and offers retry');
    assert.equal(production, 0);
    assert.deepEqual(errors, []);
    console.log('PASS storefront appearance: Glovo defaults and validation, live preview, four widths, photo upload, translations, persisted storefront and light/dark restaurant themes.');
} finally {
    for (const context of contexts) await context.close();
    await browser.close();
    await Promise.all([new Promise(resolve => admin.server.close(resolve)), new Promise(resolve => store.server.close(resolve))]);
}
