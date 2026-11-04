import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {translations} from '../assets/i18n.js';
import {startFixtureServer} from './fixtures/server.mjs';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';

let checks=0,production=0;const errors=[];
const check=(value,label)=>{assert.ok(value,label);checks++;};
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const keys=[...source.matchAll(/data-i18n(?:-(?:placeholder|aria|title))?="([^"]+)"/g),...source.matchAll(/\bt\(['"]([^'"]+)/g)].map(match=>match[1]);
for(const key of new Set(keys))for(const lang of ['fr','en','ar'])check(Boolean(translations[lang][key]?.trim()),`${lang}: ${key} has readable text`);
const store=await startFixtureServer(),admin=await startAdminFixtureServer(),browser=await chromium.launch();
async function open(width,url){
 const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',hasTouch:width<1000});
 await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/,route=>{production++;return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(45000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});return{context,page};
}
async function fits(page,selector){return page.locator(selector).evaluateAll(elements=>elements.filter(el=>el.checkVisibility()).every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&r.height>=44;}));}
async function modalFits(page,label){check(await page.locator('.app-modal:not(.hidden) .modal-panel').evaluateAll(elements=>elements.every(el=>el.scrollWidth<=el.clientWidth+1)),label);}
async function discard(page,action,accept=false){page.once('dialog',dialog=>{check(dialog.message()==='Quitter sans enregistrer les modifications ?','Shared discard wording');return accept?dialog.accept():dialog.dismiss();});return action();}
try{
 for(const width of [320,390,768,1440])for(const lang of ['fr','en','ar']){
  const{context,page}=await open(width,store.url+'/?scenario=submit-error');
  await page.locator('#menuContent .product-card').first().waitFor();await page.evaluate(l=>setAppLanguage(l),lang);
  check(await page.locator('html').getAttribute('dir')===(lang==='ar'?'rtl':'ltr'),`${width}/${lang}: direction`);
  await page.locator('#menuSearch').fill('zzzz-nothing');check(await page.locator('#noSearchResults h3').innerText()===translations[lang]['search.no_result'],`${width}/${lang}: empty search`);await page.locator('#clearSearchBtn').click();
  await page.evaluate(()=>openItemModal('tacos'));await page.locator('#btnModalAddToCart').click();
  await modalFits(page,`${width}/${lang}: modifier sheet fits`);
  check(await page.locator('#choice-count-0').evaluate(el=>getComputedStyle(el).direction==='ltr'),`${width}/${lang}: selection counts retain numeric order`);
  check(await page.locator('#choice-error-0').innerText()===translations[lang]['choice.minimum_one'],`${width}/${lang}: modifier minimum translated`);
  check(!(await page.locator('#choice-error-0').innerText()).includes('choice.'),`${width}/${lang}: no modifier key`);
  await page.locator('#choice-0-0').check();await page.locator('#choice-1-0').check();await page.locator('#choice-2-0').check();await page.locator('#btnModalAddToCart').click();
  await page.locator('#btnNavCart').click();check((await page.locator('#cartItemsContainer').innerText()).includes(translations[lang]['cart.choices']),`${width}/${lang}: cart choices`);await page.locator('#btnGoToCheckout').click();await page.evaluate(()=>nextCheckoutStep());
  await modalFits(page,`${width}/${lang}: contact sheet fits`);
  check(await page.locator('#nameError').innerText()===translations[lang]['checkout.name_error'],`${width}/${lang}: name validation`);check(await page.locator('#phoneError').innerText()===translations[lang]['checkout.phone_error'],`${width}/${lang}: phone validation`);
  await page.locator('#customerName').fill('Client local');await page.locator('#customerPhone').fill('0612345678');await page.evaluate(()=>nextCheckoutStep());await page.locator('.service-choice').nth(0).click();await page.locator('#customerAddress').fill('12 rue Exemple');await page.locator('#btnConfirmZone').click();
  check(await page.locator('#summaryDeliveryFee span').innerText()===translations[lang]['summary.delivery'],`${width}/${lang}: fee label`);
  await modalFits(page,`${width}/${lang}: summary sheet fits`);
  for(const [index,key]of [[1,'service.takeaway'],[2,'service.dinein']]){await page.locator('#summaryModal .summary-detail').nth(1).getByRole('button').click();await page.locator('.service-choice').nth(index).click();check(await page.locator('#summaryType').innerText()===translations[lang][key],`${width}/${lang}: reception ${key}`);}
  await page.locator('#btnFinalize').click();await page.locator('#orderSubmissionError').waitFor({state:'visible'});check(await page.locator('#orderSubmissionError').innerText()===translations[lang]['order.error'],`${width}/${lang}: submission error`);check(await page.locator('#btnFinalize').isEnabled(),`${width}/${lang}: retry enabled`);
  await page.evaluate(()=>__fixture.failSubmission=false);await page.locator('#btnFinalize').click();await page.locator('#orderTracker').waitFor({state:'visible'});
  for(const [status,key]of [['pending','tracker.pending'],['confirmed','tracker.confirmed'],['en_livraison','tracker.delivery'],['ready','tracker.pickup'],['delivered','tracker.delivered'],['rejected','tracker.rejected']]){await page.evaluate(s=>__fixture.setStatus(s),status);check(await page.locator('#trackerStatus').innerText()===translations[lang][key],`${width}/${lang}: tracking ${status}`);}
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${lang}: no page overflow`);
  await context.close();
 }
 for(const width of [320,390,768,1440]){
  const{context,page}=await open(width,admin.url+'/admin.html?menu=rich&orders=rich');await page.locator('#view-overview').waitFor({state:'visible'});await page.evaluate(()=>switchView('menu'));await page.locator('.menu-product').first().waitFor();
  check(await page.locator('.menu-product').evaluateAll(rows=>rows.every(row=>row.scrollWidth<=row.clientWidth+1)),`${width}: menu rows fit internally`);
  if(width>=768)check(await page.locator('.menu-product').first().evaluate(row=>{const es=[...row.querySelectorAll('.menu-price,.menu-stock,.menu-row-actions')];return Math.max(...es.map(e=>e.getBoundingClientRect().top))-Math.min(...es.map(e=>e.getBoundingClientRect().top))<30;}),`${width}: price, stock and actions share a row`);
  await page.evaluate(()=>openItemEditor('tacos'));check(await fits(page,'#item-editor footer button'),`${width}: all footer actions fully visible`);
  for(const height of [500,430]){await page.setViewportSize({width,height});await page.locator('#input-desc').focus();await page.locator('#item-editor .menu-dialog-body').evaluate(el=>el.scrollTop=el.scrollHeight);check(await fits(page,'#item-editor footer button'),`${width}/${height}: footer remains reachable with reduced height`);await page.locator('#btn-save-item').focus();await page.keyboard.press('Tab');check(await page.evaluate(()=>document.getElementById('item-editor').contains(document.activeElement)),`${width}/${height}: editor focus contained`);}
  await page.keyboard.press('Escape');await page.setViewportSize({width,height:844});await page.evaluate(()=>switchView('drivers'));await page.locator('#drivers-table-body tr').first().waitFor();check(await page.locator('.admin-employee-card').first().evaluate(el=>el.getBoundingClientRect().bottom<innerHeight-68),`${width}: existing account visible first`);check(await page.locator('.admin-employee-card button').first().getAttribute('aria-label')==='Modification indisponible',`${width}: employee action has accurate accessible text`);check(!(await page.locator('.admin-team-unavailable').getAttribute('open')),`${width}: unavailable form collapsed`);await page.locator('.admin-team-unavailable summary').click();check(await page.locator('#btn-add-user').isDisabled(),`${width}: provisioning stays disabled`);
  await page.evaluate(()=>switchView('promotions'));await page.locator('[data-promo-action=edit]').first().click();await page.waitForFunction(()=>!document.getElementById('btn-save-promo').disabled);await page.locator('#promo-name').fill('Draft local');
  await discard(page,()=>page.keyboard.press('Escape'));check(await page.locator('#promo-name').inputValue()==='Draft local',`${width}: Escape cancellation retains draft`);
  await discard(page,()=>page.locator('#promo-editor button[aria-label="Fermer"]').click());check(await page.locator('#promo-editor').isVisible(),`${width}: close cancellation keeps editor`);
  await discard(page,()=>page.evaluate(()=>switchView('menu')));check(await page.locator('#promo-editor').isVisible(),`${width}: navigation cancellation keeps editor`);
  await discard(page,()=>page.evaluate(()=>location.hash='menu'));await page.waitForFunction(()=>location.hash==='#promotions');check(await page.locator('#promo-editor').isVisible(),`${width}: cancelled hash navigation restores route`);
  check(await page.evaluate(()=>!dispatchEvent(new Event('beforeunload',{cancelable:true}))),`${width}: tab exit protected`);
  await discard(page,()=>page.evaluate(()=>switchView('menu')),true);await page.locator('#view-menu').waitFor({state:'visible'});check(await page.evaluate(()=>__adminFixture.writes.length===0),`${width}: discarded draft creates no writes`);
  await page.evaluate(()=>switchView('promotions'));await page.locator('[data-promo-action=edit]').first().click();await page.waitForFunction(()=>!document.getElementById('btn-save-promo').disabled);await page.locator('#promo-name').fill('Saved local');await page.locator('#btn-save-promo').click();await page.locator('#promo-editor').waitFor({state:'hidden'});check(await page.evaluate(()=>__adminFixture.data.promotions[0].name==='Saved local'),`${width}: save persists without discard prompt`);
  if(width===390){
   for(const change of [()=>page.locator('#promo-visible').uncheck(),()=>page.locator('#promo-start').fill('2030-01-01T12:00'),()=>page.evaluate(()=>addPromoChoiceGroup()),()=>page.locator('#promo-image-file').setInputFiles({name:'local.png',mimeType:'image/png',buffer:Buffer.from('fixture image')})]){
    await page.locator('[data-promo-action=edit]').first().click();await page.waitForFunction(()=>!document.getElementById('btn-save-promo').disabled);await change();await discard(page,()=>page.evaluate(()=>closePromoEditor()));check(await page.locator('#promo-editor').isVisible(),'Non-text edit protected');await discard(page,()=>page.evaluate(()=>closePromoEditor()),true);
   }
  }
  await context.close();
  const driver=await open(width,admin.url+'/admin.html?role=livreur&orders=rich');await driver.page.locator('#view-driver').waitFor({state:'visible'});check(await driver.page.locator('#driver-tab-deliveries').isVisible(),`${width}: driver defaults to assigned work`);check(await driver.page.locator('[data-driver-action=claim]').count()===0,`${width}: public feed restriction preserved`);check(await driver.page.evaluate(()=>!__adminFixture.queries.some(q=>q.name==='orders'&&q.filters?.some(f=>f.field==='status'&&f.value==='en_livraison')&&!q.filters?.some(f=>f.field==='deliveryGuyId'))),`${width}: no unassigned customer query`);await driver.context.close();
 }
 const fallback=await open(390,store.url+'/?scenario=error');await fallback.page.locator('#menuContent h3').waitFor();await fallback.page.evaluate(()=>{const p=document.createElement('p');p.id='fallback-copy';p.dataset.i18n='future.missing';p.textContent='Texte lisible';document.body.append(p);});
 for(const lang of ['fr','en','ar']){await fallback.page.evaluate(l=>setAppLanguage(l),lang);check(await fallback.page.locator('#fallback-copy').innerText()==='Texte lisible',`${lang}: readable unknown-key fallback`);check(await fallback.page.locator('#menuContent h3').innerText()===translations[lang]['menu.error_title'],`${lang}: menu load error`);}
 await fallback.page.evaluate(async()=>{const{translations}=await import('/assets/i18n.js');delete translations.en['checkout.name_label'];setAppLanguage('en');});check(await fallback.page.locator('[data-i18n="checkout.name_label"]').innerText()===translations.fr['checkout.name_label'],'Missing English entry falls back to readable French');
 await fallback.page.evaluate(()=>localStorage.setItem('activeOrderId','fixture-order'));await fallback.page.goto(store.url+'/?scenario=tracker-error',{waitUntil:'domcontentloaded'});await fallback.page.locator('#trackerRetry').waitFor({state:'visible'});
 for(const lang of ['fr','en','ar']){await fallback.page.evaluate(l=>setAppLanguage(l),lang);check(await fallback.page.locator('#trackerStatus').innerText()===translations[lang]['tracker.error'],`${lang}: tracking error translated`);}
 await fallback.context.close();check(production===0,'No production Firebase requests');check(errors.length===0,errors.join('\n'));console.log(`${checks} targeted UI/i18n checks passed at 320/390/768/1440px; no production requests or page errors`);
}finally{await browser.close();store.server.close();admin.server.close();}
