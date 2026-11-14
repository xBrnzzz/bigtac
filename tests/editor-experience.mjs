import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';

const {server,url}=await startAdminFixtureServer(),browser=await chromium.launch();
const output=process.env.BIGTAC_EDITOR_SCREENSHOTS;if(output)fs.mkdirSync(output,{recursive:true});
let checks=0,production=0;const errors=[];
const check=(value,label)=>{assert.ok(value,label);checks++;};
const fit=async(page,selector)=>page.locator(selector).evaluateAll(elements=>elements.filter(e=>e.getClientRects().length).every(e=>{
 const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;
}));
try{
 for(const width of [320,390,768,1366,1440]){
  const context=await browser.newContext({viewport:{width,height:width===320?740:width===1366?768:900},reducedMotion:'reduce'});
  await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/,r=>{production++;return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(url+'/admin.html?menu=rich',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.switchView&&!document.getElementById('admin-app').hidden);
  await page.evaluate(()=>{
   const group={title:'Choisissez votre boisson',type:'radio',min:1,max:1,options:[{name:'Coca-Cola',price:0,isAvailable:true},{name:'Jus d’orange',price:5,isAvailable:true}]};
   Object.assign(__adminFixture.data.menuItems[0],{description:'Poulet grillé, sauce fromagère et frites.',mandatoryChoices:[structuredClone(group)],supplements:[{name:'Double cheddar',price:5,isAvailable:true}]});
   Object.assign(__adminFixture.data.promotions[0],{description:'Deux tacos poulet, deux boissons et une portion de frites.',mandatoryChoices:[structuredClone(group)],supplements:[{name:'Double cheddar',price:5}],startsAt:'2030-01-01T12:00:00Z',endsAt:'2030-01-31T12:00:00Z'});__adminFixture.emit();switchView('menu');
  });
  await page.locator('[data-menu-action=new]').click();
  check(await page.locator('#menu-image-preview').isHidden(),`${width}: new product has an honest empty photo state`);
  const photo={name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6mkAAAAASUVORK5CYII=','base64')};
  if(width===390){const chooser=page.waitForEvent('filechooser');await page.locator('#item-editor .editor-image-frame').click();await(await chooser).setFiles(photo);}
  else await page.locator('#menu-image-file').setInputFiles(photo);
  check(await page.locator('#menu-image-preview').isVisible(),`${width}: selected photo replaces the empty state`);
  check(await page.locator('#menu-photo-filename').innerText()==='photo.png',`${width}: chosen product filename is visible`);
  await page.locator('[data-menu-action=remove-image]').click();
  check(await page.locator('#menu-image-preview').isHidden(),`${width}: removing the photo restores the empty state`);
  await page.keyboard.press('Escape');await page.locator('[data-menu-action=edit]').first().click();
  if(width===320){
   check(await page.locator('#item-editor>footer').evaluate(e=>e.getBoundingClientRect().height<=115),'320: product footer leaves room for editing');
   check(await page.locator('#input-name').evaluate(e=>e.getBoundingClientRect().top<260),'320: first product field starts earlier');
  }
  await page.locator('#input-price').fill('-1');await page.locator('#item-editor [data-tab=publish]').click();await page.locator('#btn-save-item').click();
  check(await page.locator('#item-editor [data-tab=basic]').getAttribute('aria-pressed')==='true',`${width}: product validation selects the information tab`);
  check(await page.locator('#input-price').evaluate(e=>document.activeElement===e),`${width}: product validation focuses the invalid price`);
  check(await fit(page,'#input-price,#menu-product-field-error'),`${width}: product validation keeps the inline explanation visible`);
  if(output)await page.screenshot({path:path.join(output,`product-error-${width}.png`)});
  await page.locator('#input-price').fill('45');
  await page.locator('#item-editor [data-tab=choices]').focus();await page.keyboard.press('Enter');
  check(await page.locator('#item-editor [data-tab=choices]').evaluate(e=>document.activeElement===e),`${width}: keyboard section change preserves focus`);
  await page.keyboard.press('Tab');
  check(await page.locator('#item-editor [data-tab=extras]').evaluate(e=>document.activeElement===e),`${width}: keyboard navigation continues from the selected tab`);
  for(const tab of ['basic','choices','extras','publish','preview']){
   await page.locator('#item-editor .menu-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
   await page.locator(`#item-editor [data-tab=${tab}]`).click();
   check(await page.locator('#item-editor .menu-dialog-body').evaluate(e=>e.scrollTop===0),`${width}/${tab}: switching sections starts at the heading`);
   check(await page.locator('#item-editor .menu-dialog-body').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${width}/${tab}: populated product content fits`);
   check(await fit(page,'#item-editor footer button'),`${width}/${tab}: every product action is visible`);
   check(await page.locator('#item-editor .menu-editor-tabs [aria-pressed=true]').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;}),`${width}/${tab}: selected product section stays visible`);
  }
  await page.locator('#item-editor [data-tab=basic]').click();await page.locator('#input-name').fill('Tacos poulet modifié');
  await page.locator('#btn-save-item').click();await page.locator('#item-editor').waitFor({state:'hidden'});
  check(await page.evaluate(()=>__adminFixture.data.menuItems[0].mandatoryChoices[0].options.length===2&&__adminFixture.data.menuItems[0].supplements[0].price===5),`${width}: saving preserves populated choices and supplements`);
  await page.evaluate(()=>switchView('promotions'));await page.locator('[data-promo-action=edit]').first().click();
  await page.waitForFunction(()=>!document.getElementById('btn-save-promo').disabled);
  await page.locator('#promo-name').fill('');await page.locator('#promo-tab-publish').click();await page.locator('#btn-save-promo').click();
  check(await page.locator('#promo-name').getAttribute('aria-invalid')==='true',`${width}: promotion marks the missing name`);
  check(await page.locator('#promo-name').evaluate(e=>document.activeElement===e),`${width}: promotion focuses its missing name`);
  check(await fit(page,'#promo-name,#promo-field-error'),`${width}: invalid promotion field and persistent explanation are visible`);
  check(await page.locator('#promo-tab-basic').getAttribute('aria-pressed')==='true',`${width}: promotion validation opens its information section`);
  if(output){await page.locator('.admin-toast').last().waitFor({state:'hidden'});await page.screenshot({path:path.join(output,`promotion-error-${width}.png`)});}
  await page.locator('#promo-name').fill('Menu duo');await page.locator('#promo-price').fill('-1');await page.locator('#btn-save-promo').click();
  check(await page.locator('#promo-price').getAttribute('aria-invalid')==='true',`${width}: promotion marks an invalid price`);
  await page.locator('#promo-price').fill('80');
  for(const tab of ['choices','supplements']){
   await page.locator('#promo-tab-'+tab).click();
   check(await page.locator('#promo-editor .overflow-y-auto').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${width}/${tab}: populated promotion content fits`);
   check(await fit(page,'#promo-editor .promo-editor-footer button'),`${width}/${tab}: promotion actions remain visible`);
  }
  await page.locator('#promo-tab-publish').click();
  await page.locator('#promo-end').fill('2029-01-01T12:00');await page.locator('#btn-save-promo').click();
  check(await page.locator('#promo-end').evaluate(e=>document.activeElement===e),`${width}: promotion date validation focuses its calendar field`);
  await page.locator('#promo-end').fill('2030-01-31T13:00');
  await page.locator('#promo-tab-basic').click();await page.locator('#promo-name').fill('Menu duo modifié');await page.locator('#btn-save-promo').click();await page.locator('#promo-editor').waitFor({state:'hidden'});
  check(await page.evaluate(()=>__adminFixture.data.promotions[0].mandatoryChoices[0].options.length===2&&__adminFixture.data.promotions[0].supplements[0].price===5),`${width}: promotion save preserves options`);
  await page.evaluate(()=>openPromoEditor());
  check(await page.locator('#promo-image-preview img').count()===0,`${width}: new promotion clears the prior photo`);
  check(await page.locator('#promo-image-url').inputValue()==='',`${width}: new promotion does not inherit the prior photo URL`);
  check(await page.locator('#promo-editor .overflow-y-auto').evaluate(e=>e.scrollTop===0),`${width}: new promotion starts at its first field`);
  await page.locator('#promo-image-file').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6mkAAAAASUVORK5CYII=','base64')});
  check(await page.locator('#promo-photo-filename').innerText()==='photo.png',`${width}: chosen promotion filename is visible`);
  check(await page.locator('#promo-image-preview img').isVisible(),`${width}: selected promotion photo replaces empty state`);
  await page.locator('#promo-tab-choices').click();await page.locator('#promo-tab-basic').click();
  check(await page.locator('#promo-image-file').evaluate(e=>e.files[0]?.name==='photo.png'),`${width}: changing promotion sections preserves the selected file`);
  if(width===390){
   const chooser=page.waitForEvent('filechooser');await page.locator('#promo-photo-frame').click();await(await chooser).setFiles(photo);
   check(await page.locator('#promo-photo-filename').innerText()==='photo.png','Photo frame opens the promotion file picker');
   await page.locator('#promo-image-file').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
   check(await page.locator('#promo-image-file').inputValue()==='','Unsupported promotion image is rejected before upload');
   check(await page.locator('#promo-image-preview img').count()===0,'Rejected replacement restores the saved empty preview');
   check(await page.locator('#promo-field-error').isVisible(),'Unsupported image has persistent inline guidance');
   await page.locator('#promo-image-file').setInputFiles(photo);
   check(await page.locator('#promo-image-file').getAttribute('aria-describedby')==='promo-photo-filename promo-photo-help','Correcting an image preserves its accessible help');
  }
  await page.locator('#promo-editor .overflow-y-auto').evaluate(e=>e.scrollTop=e.scrollHeight);await page.evaluate(()=>closePromoEditor());
  await page.evaluate(()=>openPromoEditor());
  check(await page.locator('#promo-editor .overflow-y-auto').evaluate(e=>e.scrollTop===0),`${width}: reopened promotion resets prior scroll`);
  for(const height of [500,430]){
   await page.setViewportSize({width,height});
   check(await fit(page,'#promo-editor .promo-editor-footer button'),`${width}/${height}: promotion footer fits a short viewport`);
   await page.locator('#btn-save-promo').focus();await page.keyboard.press('Tab');
   check(await page.evaluate(()=>document.getElementById('promo-editor').contains(document.activeElement)),`${width}/${height}: focus remains inside promotion editor`);
  }
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: document has no horizontal overflow`);
  await context.close();
 }
 check(production===0,'No production Firebase calls');check(errors.length===0,errors.join('\n'));
 console.log(`${checks} editor experience checks passed at 320/390/768/1366/1440px, including populated options and short viewports`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
