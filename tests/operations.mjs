import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';
import {startFixtureServer} from './fixtures/server.mjs';
import {staffAdministration} from '../assets/staff-service.js';
const admin=await startAdminFixtureServer(),store=await startFixtureServer(),browser=await chromium.launch();let checks=0,production=0;const errors=[];
const check=(value,label)=>{assert.ok(value,label);checks++;};
const logoFile=fileURLToPath(new URL('../assets/logo.png',import.meta.url));
const logoUrl='https://logo.example.test/restaurant.png';
const uploadedLogo='https://logo.example.test/uploaded.png';
const bundledLogo='assets/logo.png';
const serveLogo=route=>route.fulfill({path:logoFile,contentType:'image/png'});
async function waitForLogo(page, selector, src) {
    await page.waitForFunction(({selector,src})=>{
        const logo=document.querySelector(selector);
        return logo?.getAttribute('src')===src && logo.complete && logo.naturalWidth>0;
    },{selector,src});
}
async function open(url,width=390){const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/,r=>{production++;return r.abort();});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(url,{waitUntil:'domcontentloaded'});return {page,context};}
try{
 for(const operation of Object.values(staffAdministration)){await assert.rejects(operation);checks++;}
 const {page:p,context}=await open(admin.url+'/admin.html?orders=rich');await p.waitForFunction(()=>window.switchView);
 await p.evaluate(()=>{__adminFixture.data.promotions[0].unknownField='keep';switchView('promotions');});await p.locator('[data-promo-action=edit]').first().click();await p.locator('#btn-save-promo').waitFor({state:'visible'});await p.waitForFunction(()=>!document.getElementById('btn-save-promo').disabled);
  await p.evaluate(()=>addPromoChoiceGroup());await p.locator('[data-pfield="g.0.title"]').fill('Sauce');await p.locator('[data-pfield="g.0.options.0.name"]').fill('Algérienne');await p.locator('#promo-tab-basic').click();await p.locator('#promo-price').fill('-1');await p.locator('#btn-save-promo').click();check(await p.locator('#promo-edit-error').innerText().then(t=>!!t),'Invalid offer price rejected');await p.locator('#promo-price').fill('79.99');await p.locator('#btn-save-promo').click();await p.locator('#promo-editor').waitFor({state:'hidden'});
 check(await p.evaluate(()=>__adminFixture.data.promotions[0].mandatoryChoices[0].options[0].name==='Algérienne'),'Embedded choice saved');check(await p.evaluate(()=>__adminFixture.data.promotions[0].unknownField==='keep'),'Unknown offer field retained');
 await p.locator('[data-promo-action=duplicate]').first().click();await p.waitForFunction(()=>__adminFixture.data.promotions.length===2);check(await p.evaluate(()=>__adminFixture.data.promotions[1].isVisible===false),'Copies start disabled');
 await p.locator('[data-promo-action=edit]').first().click();await p.waitForFunction(()=>!document.getElementById('btn-save-promo').disabled);const future=await p.evaluate(async()=>{const {localInput}=await import('/assets/operations-model.js');return localInput(new Date(Date.now()+86400000).toISOString());});await p.locator('#promo-tab-publish').click();await p.locator('#promo-start').fill(future);await p.locator('#btn-save-promo').click();await p.locator('#promo-editor').waitFor({state:'hidden'});check(await p.locator('#promotions-list').innerText().then(t=>t.includes('Programmée')),'Schedule derived from actual dates');
 await p.locator('[data-promo-action=edit]').first().click();await p.waitForFunction(()=>!document.getElementById('btn-save-promo').disabled);await p.evaluate(()=>{__adminFixture.data.promotions[0].description='Concurrent edit';__adminFixture.emit();});await p.locator('#btn-save-promo').click();check(await p.locator('#promo-edit-error').innerText().then(t=>t.includes('ailleurs')),'Stale offer save refused');await p.evaluate(()=>closePromoEditor());
 await p.evaluate(()=>{__adminFixture.data.users.push({id:'d1',uid:'d1',name:'Livreur 1',role:'livreur'},{id:'d2',uid:'d2',name:'Livreur 2',role:'livreur'});switchView('orders');});await p.evaluate(()=>showOrderCol('delivery'));await p.locator('#list-delivery .order-card').first().waitFor();await p.locator('#list-delivery [data-open="fixture-6"]').first().click();await p.locator('#delivery-assign').waitFor({state:'visible'});await p.waitForFunction(()=>!document.getElementById('delivery-assign').disabled);await p.locator('#delivery-assignee').selectOption('d1');await p.locator('#delivery-assign').click();await p.waitForFunction(()=>__adminFixture.data.orders.some(o=>o.id==='fixture-6'&&o.deliveryGuyId==='d1'));
 check(await p.locator('#order-detail-body').innerText().then(t=>t.includes('Livreur 1')),'Assignment updates live detail');await p.waitForFunction(()=>!document.getElementById('delivery-assign').disabled);await p.locator('#delivery-assignee').selectOption('d2');await p.locator('#delivery-assign').click();await p.waitForFunction(()=>__adminFixture.data.orders.find(o=>o.id==='fixture-6').deliveryGuyId==='d2');checks++;
 const conflict=await p.evaluate(async()=>{const {operationsService}=await import('/assets/operations-service.js');const actor={uid:'fixture-staff',role:'admin',epoch:1};try{await operationsService(()=>actor).assign({id:'fixture-6',driverId:'d1',expected:'d1'});return false;}catch{return true;}});check(conflict,'Stale assignment rejected');await p.keyboard.press('Escape');
 await p.evaluate(()=>switchView('drivers'));await p.locator('#drivers-table-body tr').first().waitFor();check(await p.locator('#btn-add-user').isDisabled(),'Browser provisioning disabled');const writes=await p.evaluate(()=>__adminFixture.writes.length);await p.evaluate(()=>deleteDriver('d1'));check(await p.evaluate(()=>__adminFixture.writes.length)===writes,'Legacy removal entry point cannot write');
 await p.evaluate(()=>{__adminFixture.data.settings[0].unknownConfig='keep';__adminFixture.emit();switchView('settings');});await p.locator('#restaurant-restaurantName').fill('Restaurant local');await p.locator('#restaurant-email').fill('bad');await p.locator('#restaurant-profile-form button[type=submit],#restaurant-profile-form button:not([type])').first().click();check(await p.locator('#restaurant-profile-feedback').innerText().then(t=>t.includes('invalide')),'Invalid settings rejected');await p.locator('#restaurant-email').fill('local@example.test');await p.locator('#restaurant-profile-form button:not([type])').click();await p.waitForFunction(()=>__adminFixture.data.settings[0].restaurantName==='Restaurant local');check(await p.evaluate(()=>__adminFixture.data.settings[0].unknownConfig==='keep'),'Unknown settings retained');

 await p.setViewportSize({width:1440,height:900});
 await context.route(logoUrl,serveLogo);
 await context.route(uploadedLogo,serveLogo);
 await context.route('https://logo.example.test/missing.png',route=>route.fulfill({status:404,body:'Not found'}));
 await context.route('https://api.cloudinary.com/**',route=>route.fulfill({json:{secure_url:uploadedLogo}}));
 const logoSelector='.admin-brand img';
 const logoField=p.locator('#restaurant-logoUrl');
 const saveProfile=p.locator('#restaurant-profile-form button:not([type])');
 await waitForLogo(p,logoSelector,bundledLogo);
 await logoField.fill(logoUrl);
 await saveProfile.click();
 await waitForLogo(p,logoSelector,logoUrl);
 check(await p.locator('#admin-favicon').getAttribute('href')===logoUrl,'Saved Settings URL updates Admin branding without reloading');

 await p.locator('[name=logoFile]').setInputFiles(logoFile);
 await saveProfile.click();
 await waitForLogo(p,logoSelector,uploadedLogo);
 check(await p.locator('#admin-favicon').getAttribute('href')===uploadedLogo,'Uploaded logo updates Admin branding');

 await logoField.fill('https://logo.example.test/missing.png');
 await saveProfile.click();
 await p.waitForFunction(()=>__adminFixture.data.settings[0].logoUrl.endsWith('/missing.png'));
 await waitForLogo(p,logoSelector,bundledLogo);
 check(await p.locator('#admin-favicon').getAttribute('href')===bundledLogo,'An image load failure falls back to the built-in logo');

 await logoField.fill(logoUrl);
 await saveProfile.click();
 await waitForLogo(p,logoSelector,logoUrl);
 await logoField.fill('');
 await saveProfile.click();
 await waitForLogo(p,logoSelector,bundledLogo);
 check(await p.locator('#admin-favicon').getAttribute('href')===bundledLogo,'Clearing the logo URL restores the built-in logo');
 await context.close();
 const driver=await open(admin.url+'/admin.html?role=livreur&orders=rich');await driver.page.locator('#view-driver').waitFor({state:'visible'});check(await driver.page.locator('#available-runs-list').innerText().then(t=>t.includes('attribuées')),'Unassigned feed restricted');check(await driver.page.evaluate(()=>!__adminFixture.queries.some(q=>q.name==='orders'&&q.filters?.some(f=>f.field==='status'&&f.value==='en_livraison')&&!q.filters?.some(f=>f.field==='deliveryGuyId'))),'No unassigned customer query');await driver.page.locator('#driver-nav-deliveries').click();
 await driver.context.route(logoUrl,serveLogo);
 await driver.page.evaluate(url=>{__adminFixture.data.settings[0].logoUrl=url;__adminFixture.emit();},logoUrl);
 await waitForLogo(driver.page,'#view-driver .driver-topbar img',logoUrl);
 check(await driver.page.locator('#admin-favicon').getAttribute('href')===logoUrl,'Driver Admin uses the confirmed restaurant logo');
 check(await driver.page.locator('#my-deliveries-list a[href*="maps"]').count()===0,'Zone label does not fabricate a Maps address');
 await driver.page.evaluate(()=>{__adminFixture.data.orders.find(o=>o.id==='fixture-6').customer.address='12 rue Exemple';__adminFixture.emit();});
 check(await driver.page.locator('#my-deliveries-list a[href*="maps"]').getAttribute('href').then(href=>href.includes('12%20rue%20Exemple')),'Assigned driver gets actual address Maps link');
 await driver.page.evaluate(()=>{__adminFixture.data.orders.find(o=>o.id==='fixture-6').deliveryGuyId='other-driver';__adminFixture.emit();});
 check(await driver.page.locator('#my-deliveries-list [data-driver-action=complete]').count()===0,'Reassignment removes delivery from previous driver');
 await driver.page.evaluate(()=>{__adminFixture.data.orders.find(o=>o.id==='fixture-6').deliveryGuyId='fixture-staff';__adminFixture.emit();});
 driver.page.once('dialog',dialog=>dialog.accept());await driver.page.locator('[data-driver-action=complete]').first().click();await driver.page.waitForFunction(()=>__adminFixture.data.orders.find(o=>o.id==='fixture-6').status==='delivered');checks++;await driver.context.close();
 const customer=await open(store.url+'/index.html');await customer.page.locator('#menuContent .product-card').first().waitFor();await customer.page.evaluate(()=>{__fixture.settings={...__fixture.settings,restaurantName:'Restaurant local',orderingModes:{livraison:false,emporter:true,sur_place:true}};__fixture.emitSettings();});check(await customer.page.locator('.store-brand').innerText().then(t=>t.includes('Restaurant local')),'Brand config synchronized');check(await customer.page.locator('.service-choice').first().isDisabled(),'Disabled checkout mode cannot be selected');await customer.page.evaluate(()=>selectService('livraison'));check(await customer.page.locator('#deliveryZoneModal').isHidden(),'Disabled mode does not open delivery flow');check(await customer.page.evaluate(()=>__fixture.orders.length===0),'Customer test created no order');await customer.page.evaluate(()=>openItemModal('simple'));await customer.page.locator('#btnModalAddToCart').click();await customer.page.locator('#addItemModal').waitFor({state:'hidden'});await customer.page.evaluate(()=>openCheckoutModal());await customer.page.locator('#customerName').fill('Local Client');await customer.page.locator('#customerPhone').fill('0612345678');await customer.page.evaluate(()=>nextCheckoutStep());await customer.page.locator('#serviceModal').waitFor({state:'visible'});await customer.page.evaluate(()=>selectService('emporter'));await customer.page.locator('#summaryModal').waitFor({state:'visible'});await customer.page.evaluate(()=>{__fixture.settings.orderingModes.emporter=false;__fixture.emitSettings();});await customer.page.evaluate(()=>finalizeOrder());check(await customer.page.evaluate(()=>__fixture.orders.length===0),'Mode disabled during checkout blocks submission');
 check(await customer.page.locator('#btnFinalize').isDisabled(),'Disabled mode prevents confirmation action');
 await customer.page.evaluate(()=>{__fixture.settings.orderingModes.emporter=true;__fixture.emitSettings();});
 check(await customer.page.locator('#btnFinalize').isEnabled(),'Re-enabled mode restores confirmation without a stuck button');await customer.context.close();
 check(production===0,'No production Firebase requests');check(!errors.length,errors.join('\n'));console.log(`${checks} Phase 4 browser/boundary checks passed`);
}finally{await browser.close();await new Promise(r=>admin.server.close(r));await new Promise(r=>store.server.close(r));}
