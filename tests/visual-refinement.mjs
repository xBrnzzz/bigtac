import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startFixtureServer} from './fixtures/server.mjs';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';

const store=await startFixtureServer(),admin=await startAdminFixtureServer(),browser=await chromium.launch();
let checks=0,production=0;const errors=[];
const check=(value,message)=>{assert.ok(value,message);checks++;};
try{
 for(const width of [320,390,768,1366,1440]){
  const context=await browser.newContext({viewport:{width,height:width===320?740:width===1366?768:900},reducedMotion:'reduce'});
  await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/,route=>{production++;return route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(store.url);await page.locator('#menuContent .product-card').first().waitFor();
  check(await page.evaluate(()=>document.querySelector('.store-brand').getBoundingClientRect().right<=document.querySelector('.store-actions').getBoundingClientRect().left),`${width}: brand and header actions have separate space`);
  await page.locator('#menuContent').getByRole('button',{name:'Choisir Tacos Poulet',exact:true}).click();
  check(!await page.locator('#customizationHint').evaluate(e=>e.classList.contains('is-invalid')),`${width}: missing choices start as guidance`);
  await page.locator('#btnModalAddToCart').click();
  check(await page.locator('#customizationHint').evaluate(e=>e.classList.contains('is-invalid')),`${width}: attempted incomplete addition reveals errors`);
  await page.locator('#choice-0-0').check();await page.locator('#choice-1-0').check();
  check(!await page.locator('#customizationHint').evaluate(e=>e.classList.contains('is-invalid')),`${width}: completing choices clears the error tone`);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{__fixture.settings.isOpen=false;__fixture.emitSettings();});
  check(await page.locator('.intro-cta').innerText().then(t=>t.includes('Voir la carte')),`${width}: closed hero invites menu browsing`);
  check(await page.locator('.intro-cta').getAttribute('href')==='#menu-unified',`${width}: closed CTA preserves its destination`);
  await page.evaluate(()=>{setAppLanguage('en');});
  check(await page.locator('.intro-cta').innerText().then(t=>t.includes('Browse the menu')),`${width}: closed CTA remains correct after language change`);
  await page.evaluate(()=>{__fixture.settings.isOpen=true;__fixture.emitSettings();});
  check(await page.locator('.intro-cta').innerText().then(t=>t.includes('Order now')),`${width}: reopened hero restores ordering copy`);
  check(await page.evaluate(()=>__fixture.orders.length===0),`${width}: presentation checks create no orders`);

  await page.goto(admin.url+'/admin.html?orders=rich&menu=rich');await page.waitForFunction(()=>window.switchView&&!document.getElementById('admin-app').hidden);
  await page.evaluate(()=>switchView('settings'));
  check(!await page.locator('#view-overview').isVisible(),`${width}: hidden Overview cannot overlay another view`);
  check(await page.locator('#restaurant-profile-form').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${width}: grouped settings form fits`);
  await page.evaluate(()=>switchView('menu'));await page.locator('[data-menu-action=edit]').first().click();
  for(const name of ['Publication','Aperçu','Informations']){
   await page.locator('#item-editor [data-menu-action=editor-tab]').filter({hasText:name}).click();
   check(await page.locator('#item-editor .menu-editor-tabs [aria-pressed=true]').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;}),`${width}: active ${name} tab is visible`);
  }
  await page.keyboard.press('Escape');await page.evaluate(()=>switchView('orders'));await page.locator('#list-pending .order-card').first().waitFor();
  check(await page.locator('#list-pending .order-card').first().evaluate(e=>e.querySelector('.order-actions').getBoundingClientRect().top<e.querySelector('.order-contact-actions').getBoundingClientRect().top),`${width}: workflow action precedes contact actions`);
  if(width===320)check(await page.locator('#list-pending .primary').first().evaluate(e=>e.getBoundingClientRect().bottom<=document.getElementById('admin-bottom-nav').getBoundingClientRect().top), '320: first Accept action is visible above navigation');
  check(await page.locator('#list-pending .order-contact-actions').first().locator('a').count()===2,`${width}: authorized contact links remain available`);
  await page.evaluate(()=>{__adminFixture.failOrders=true;__adminFixture.emit();});
  check(await page.locator('#orders-error').innerText().then(t=>t.includes('charger les commandes')&&!t.includes('modification')),`${width}: load failure describes loading`);
  check(await page.evaluate(()=>__adminFixture.writes.length===0),`${width}: Admin inspection performs no writes`);
  await context.close();
 }
 check(production===0,'No production Firebase attempts');check(!errors.length,errors.join('\n'));
 console.log(`${checks} visual refinement checks passed across 320/390/768/1366/1440px; no production requests or writes`);
}finally{await browser.close();await Promise.all([new Promise(r=>store.server.close(r)),new Promise(r=>admin.server.close(r))]);}
