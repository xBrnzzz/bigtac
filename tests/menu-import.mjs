import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { join } from 'node:path';
import { menuImportExample, menuImportPrompt } from '../assets/menu-import-guide.js';
import { parseMenuImport } from '../assets/menu-import.js';
import { buildCustomizationSteps, customizationPrice, selectionIssue } from '../assets/customization.js';
import { startAdminFixtureServer } from './fixtures/admin-server.mjs';

assert.deepEqual(parseMenuImport('\uFEFF' + JSON.stringify(menuImportExample)).menuItems, menuImportExample.products);
assert(menuImportPrompt.includes(JSON.stringify(menuImportExample, null, 2)));
for (const [edit, error] of [
    [menu => { menu.products[0].price = '45'; }, /Prix en DH/],
    [menu => { menu.products[0].categoryId = 'introuvable'; }, /catégorie existante/],
    [menu => { menu.products[0].modifierGroupIds = ['introuvable']; }, /groupe partagé référencé/],
    [menu => { menu.products[0].mandatoryChoices[0].options.forEach(option => option.isAvailable = false); }, /assez d’options/],
    [menu => { menu.promotions[0].startsAt = '2026-02-30T10:00:00+01:00'; }, /Date ISO 8601/],
    [menu => { menu.categories[0].isVisible = true; }, /Champs attendus/]
]) {
    const changed = structuredClone(menuImportExample);
    edit(changed);
    assert.throws(() => parseMenuImport(JSON.stringify(changed)), error);
}
const sample = structuredClone(menuImportExample);
sample.categories.push({id: 'grillades-test', name: 'Grillades test'});
sample.products[0].name = 'Tacos poulet importé';
sample.products.push({...sample.products[0], id: 'tacos-existant', name: 'Tacos poulet', price: 1});
const source = JSON.stringify(sample);

const {server, url} = await startAdminFixtureServer();
const browser = await chromium.launch();
let external = 0;
const errors = [];
const timeout = { timeout: 10000 };
const visible = locator => locator.waitFor({state: 'visible', ...timeout});
const loadFile = (page, buffer = source) => page.locator('#menu-import-file').setInputFiles({
    name: 'restaurant-menu.json', mimeType: 'application/json', buffer: Buffer.from(buffer)
});
async function open(width, query = '') {
    const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
    await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/, route => {
        external++;
        return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(timeout.timeout);
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {value: {writeText: async value => { window.__copiedPrompt = value; }}});
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + '/admin.html' + query + '#menu', {waitUntil: 'domcontentloaded'});
    return {page, context};
}

try {
    for (const width of [320, 390, 768, 1440]) {
        const {page, context} = await open(width);
        const trigger = page.locator('#view-menu [data-menu-action="import"]');
        await trigger.click();
        const dialog = page.getByRole('dialog', {name: 'Importer un menu', exact: true});
        await visible(dialog);
        await dialog.getByRole('button', {name: 'Copier le prompt'}).click();
        assert.equal(await page.evaluate(() => window.__copiedPrompt), menuImportPrompt);
        await dialog.getByText('Voir le prompt complet', {exact: true}).click();
        assert.equal(await page.locator('#menu-import-prompt-text').inputValue(), menuImportPrompt);
        await dialog.getByText('Voir le prompt complet', {exact: true}).click();
        await loadFile(page);
        await dialog.getByRole('button', {name: 'Vérifier le menu'}).click();
        await visible(dialog.getByRole('heading', {name: 'Aperçu de l’import'}));
        assert.match(await dialog.locator('.menu-import-results').innerText(), /Best Seller/);
        assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth && document.documentElement.scrollWidth <= innerWidth));
        assert(await dialog.locator('.menu-dialog-body').evaluate(el => el.scrollWidth <= el.clientWidth));
        assert.equal(await page.evaluate(() => __adminFixture.writes.length), 0, 'Preview does not persist anything');
        if (process.env.BIGTAC_IMPORT_SCREENSHOTS) {
            await dialog.screenshot({path: join(process.env.BIGTAC_IMPORT_SCREENSHOTS, `bigtac-import-${width}.png`)});
        }
        const reviewItem = dialog.locator('.menu-import-section details').filter({hasText: 'Tacos poulet importé'});
        await reviewItem.locator('summary').click();
        assert.match(await reviewItem.innerText(), /Taille[\s\S]*L · \+10 DH[\s\S]*Sauces[\s\S]*Cheddar · \+5 DH/);
        await page.keyboard.press('Escape');
        await dialog.waitFor({state: 'hidden'});
        await context.close();
    }

    const {page, context} = await open(390, '?role=manager');
    await page.locator('#view-menu [data-menu-action="categories"]').click();
    const categories = page.getByRole('dialog', {name: 'Catégories', exact: true});
    await categories.getByRole('button', {name: 'Importer un menu'}).click();
    const dialog = page.getByRole('dialog', {name: 'Importer un menu', exact: true});
    const verify = dialog.getByRole('button', {name: 'Vérifier le menu'});
    const commit = dialog.getByRole('button', {name: 'Importer les éléments'});
    await visible(dialog);
    await loadFile(page, '{ "version": 1 }');
    await verify.click();
    await visible(dialog.getByText(/Champs attendus/));
    assert.equal(await commit.isVisible(), false);
    await dialog.getByText('Coller le JSON', {exact: true}).click();
    await dialog.getByLabel('Contenu du fichier').fill(source);
    await verify.click();
    await visible(commit);
    await page.evaluate(() => { __adminFixture.failWrites = true; });
    await commit.click();
    await visible(dialog.getByText('Vérifiez à nouveau le fichier avant de reprendre.'));
    assert.equal(await page.evaluate(() => __adminFixture.writes.length), 0, 'Transaction rejection leaves no partial writes');

    await page.evaluate(() => { __adminFixture.failWrites = false; });
    await verify.click();
    await visible(commit);
    await page.evaluate(() => {
        __adminFixture.data.promotions.push({id: 'external-offer', name: 'Menu tacos poulet', price: 70});
    });
    await commit.click();
    await visible(dialog.locator('[data-save-state]').getByText(/Le catalogue a changé/));
    assert.equal(await page.evaluate(() => __adminFixture.writes.length), 0, 'A changed preview requires a new review');
    await page.evaluate(() => {
        __adminFixture.data.promotions = __adminFixture.data.promotions.filter(row => row.id !== 'external-offer');
    });
    await verify.click();
    await visible(commit);
    await commit.click();
    await visible(dialog.getByText(/Import terminé/));
    const imported = await page.evaluate(() => {
        const {categories, modifierGroups, menuItems, promotions, settings} = __adminFixture.data;
        const product = menuItems.find(row => row.description === 'Poulet grillé et frites.');
        return {
            product,
            category: categories.find(row => row.id === product.categoryId),
            groups: modifierGroups.filter(row => product.modifierGroupIds.includes(row.id)),
            promotion: promotions.find(row => row.name === 'Menu tacos poulet'),
            state: settings.find(row => row.id === 'menuState'),
            newCategory: categories.find(row => row.name === 'Grillades test'),
            existingProduct: menuItems.find(row => row.id === 'tacos'),
            writes: __adminFixture.writes.length
        };
    });
    assert.equal(imported.product.isVisible, false);
    assert.equal(imported.product.isPopular, true);
    assert.equal(imported.category.name, 'Tacos');
    assert.equal(imported.category.id, 'tacos', 'Existing category is reused');
    assert.equal(imported.newCategory.isVisible, false);
    assert.equal(imported.existingProduct.price, 45, 'Matching product keeps its original price');
    assert.equal(imported.groups.length, 2);
    assert(imported.groups.every(row => row.productIds.includes(imported.product.id)));
    assert.equal(imported.state.productCategories[imported.product.id], imported.category.id);
    assert.equal(imported.promotion.isVisible, false);
    assert.equal(imported.promotion.mandatoryChoices[0].title, 'Boisson');
    assert.equal(imported.promotion.supplements[0].price, 5);
    const steps = buildCustomizationSteps(imported.product);
    assert.deepEqual(steps.map(step => step.title), ['Taille', 'Sauces', 'Suppléments']);
    assert(selectionIssue(steps[0], []));
    assert.equal(customizationPrice(imported.product, {0: [steps[0].data.options[1]], 2: [steps[2].data[0]]}), 60);

    await loadFile(page);
    await verify.click();
    await visible(dialog.getByText('Tous les éléments de ce fichier existent déjà.'));
    assert.equal(await commit.isVisible(), false);
    assert.equal(await page.evaluate(() => __adminFixture.writes.length), imported.writes);
    await page.keyboard.press('Escape');
    await dialog.waitFor({state: 'hidden'});
    const productRow = page.locator('.menu-product').filter({hasText: 'Tacos poulet importé'});
    await productRow.getByRole('button', {name: 'Modifier', exact: true}).click();
    await visible(page.locator('#item-editor'));
    assert.equal(await page.locator('#input-name').inputValue(), 'Tacos poulet importé');
    assert(await page.locator('#input-popular').isChecked());
    assert.equal(await page.locator('#input-visible').isChecked(), false);
    await page.keyboard.press('Escape');
    await page.locator('#item-editor').waitFor({state: 'hidden'});
    await page.evaluate(() => switchView('promotions'));
    await page.locator('.promo-entry').filter({hasText: 'Menu tacos poulet'}).getByRole('button', {name: 'Modifier', exact: true}).click();
    await page.waitForFunction(() => document.getElementById('promo-name').value === 'Menu tacos poulet');
    assert.equal(await page.locator('#promo-price').inputValue(), '60');
    assert.equal(await page.locator('[data-pfield="g.0.options.1.name"]').inputValue(), 'Soda');
    await context.close();
    assert.equal(external, 0);
    assert.deepEqual(errors, []);
    console.log('PASS menu import: format, tutorial, file and paste, 4 viewports, atomic failure, stale preview, hidden items, shared links, checkout and repeat import.');
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
