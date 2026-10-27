import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';
import {startFixtureServer} from './fixtures/server.mjs';
const output=process.env.BIGTAC_MENU_SCREENSHOTS;if(output)fs.mkdirSync(output,{recursive:true});
const admin=await startAdminFixtureServer(),store=await startFixtureServer(),browser=await chromium.launch();
let passed=0,productionRequests=0,uploadRequests=0;const errors=[];
const check=(value,label)=>{assert.ok(value,label);passed++;};
const shot=async(page,name)=>{if(output)await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});};
async function open(width=1440,params='') {
    const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce',hasTouch:width<768});
    await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/,route=>{productionRequests++;return route.abort();});
    await context.route('https://api.cloudinary.com/**',route=>{uploadRequests++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({secure_url:'https://example.test/fixture-image.png'})});});
    const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(45000);page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${admin.url}/admin.html?${params}#menu`,{waitUntil:'domcontentloaded'});
    return {page,context};
}
const action=(page,name,scope='#view-menu')=>page.locator(`${scope} [data-menu-action="${name}"]`);
const closeEditor=async page=>{if(!page.listenerCount('dialog'))page.once('dialog',dialog=>dialog.accept());await page.keyboard.press('Escape');await page.locator('#item-editor').waitFor({state:'hidden'});};
try {
    for(const width of [320,375,390,768,1024,1440]) {
        const {page,context}=await open(width,'menu=rich');await page.locator('.menu-product').first().waitFor();
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Menu page fits ${width}`);
        check(await page.locator('#view-menu').evaluate(el=>el.scrollWidth<=el.clientWidth),`Menu content fits ${width}`);
        await shot(page,`menu-${width}`);
        await page.locator('#menu-admin-search').fill('burger');check(await page.locator('.menu-product').count()===1,'Search works');await page.locator('#menu-admin-search').fill('');
        await action(page,'filter').filter({hasText:'Burgers'}).click();check(await page.locator('.menu-product').count()===1,'Category filter');await action(page,'filter').first().click();
        await action(page,'edit').first().click();check(await page.locator('#item-editor').isVisible(),'Editor opens');
        check(await page.locator('#btn-save-item').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'Save visible');
        check(await page.locator('#item-editor').evaluate(el=>el.scrollWidth<=el.clientWidth),'Editor fits');
        await shot(page,`editor-${width}`);
        await action(page,'editor-tab','#item-editor').filter({hasText:'Choix'}).click();await action(page,'add-choice','#item-editor').click();
        check(await page.locator('.menu-choice-group').count()===1,'Choice group editor');
        check(await page.locator('#item-editor').evaluate(el=>el.scrollWidth<=el.clientWidth),'Choice editor fits');
        await page.locator('#btn-save-item').click();check(await page.locator('#menu-product-errors').isVisible(),'Invalid empty group cannot save');
        await page.locator('#item-editor [data-group-field=title]').fill('Votre sauce');await page.locator('#item-editor [data-option-field=name]').fill('Algérienne');await shot(page,`choices-${width}`);
        await action(page,'editor-tab','#item-editor').filter({hasText:'Aperçu'}).click();await shot(page,`preview-${width}`);check(await page.locator('#menu-preview-total').innerText().then(text=>text.includes('45')),'Draft preview shows real base price');
        await closeEditor(page);
        await action(page,'categories').click();check(await page.locator('#menu-categories-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),'Categories fit');await shot(page,`categories-${width}`);await page.keyboard.press('Escape');
        check(await page.evaluate(()=>__adminFixture.writes.length===0),'Read-only browsing creates no writes');
        await context.close();
    }
    {
        const {page,context}=await open(1440);page.on('dialog',dialog=>dialog.accept());await page.locator('.menu-product').first().waitFor();
        const history=await page.evaluate(()=>JSON.stringify(__adminFixture.data.orders));
        await page.evaluate(()=>{__adminFixture.data.menuItems[0].customFlag={keep:true};__adminFixture.emit();});
        await action(page,'new').click();await page.locator('#input-name').fill('Burger test');await page.locator('#input-price').fill('-1');await page.locator('#btn-save-item').click();
        check(await page.locator('#input-price').getAttribute('aria-invalid')==='true','Invalid price identified inline');
        check(await page.evaluate(()=>__adminFixture.writes.length===0),'Invalid price makes no writes');
        await page.locator('#input-price').fill('42.50');await page.locator('#btn-save-item').click();await page.locator('#item-editor').waitFor({state:'hidden'});
        check(await page.evaluate(()=>__adminFixture.data.menuItems.some(row=>row.name==='Burger test'&&row.price===42.5)),'Product created');
        await action(page,'edit').filter({has:page.locator('svg')}).first().click();await page.locator('#input-name').fill('Tacos modifié');await page.locator('#btn-save-item').click();await page.locator('#item-editor').waitFor({state:'hidden'});
        check(await page.evaluate(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').customFlag.keep),'Unknown legacy product fields preserved');
        await page.locator('[data-product=tacos] summary').click();await page.locator('[data-product=tacos] [data-menu-action=duplicate]').click();
        await page.locator('#btn-save-item').click();await page.locator('#item-editor').waitFor({state:'hidden'});
        check(await page.evaluate(()=>__adminFixture.data.menuItems.some(row=>row.name==='Tacos modifié (copie)'&&row.id!=='tacos'&&row.isVisible===false)),'Duplicate creates new unpublished product');
        check(await page.evaluate(()=>new Set(__adminFixture.data.menuItems.map(row=>row.order)).size===__adminFixture.data.menuItems.length),'New products have unique positions');
        await page.evaluate(()=>__adminFixture.writeDelay=300);const stock=page.locator('[data-product=tacos] [data-menu-action=stock]');await stock.click();check(await stock.isDisabled(),'Pending stock toggle disabled');await page.waitForFunction(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').isAvailable===false);
        check(await stock.getAttribute('aria-checked')==='false','Stock success confirmed');await page.evaluate(()=>{__adminFixture.writeDelay=0;__adminFixture.failWrites=true;});await stock.click();await page.locator('#menu-feedback').filter({hasText:'Enregistrement non confirmé'}).waitFor();check(await stock.getAttribute('aria-checked')==='false','Failed stock save keeps confirmed state');
        await page.evaluate(()=>__adminFixture.failWrites=false);await stock.click();await page.waitForFunction(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').isAvailable===true);
        await page.locator('[data-product=tacos] summary').click();await page.locator('[data-product=tacos] [data-menu-action=visibility]').click();await page.waitForFunction(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').isVisible===false);check(await stock.getAttribute('aria-checked')==='true','Hidden does not imply out of stock');
        await action(page,'categories').click();await page.locator('#menu-category-name').fill('Desserts');await action(page,'save-category','#menu-categories-dialog').click();await page.waitForFunction(()=>__adminFixture.data.categories.some(row=>row.name==='Desserts'));
        check(await page.locator('#menu-category-name').inputValue()==='','Category form resets');
        await page.locator('[data-menu-action=edit-category][data-id=tacos]').click();await page.locator('#menu-category-name').fill('Tacos maison');await action(page,'save-category','#menu-categories-dialog').click();await page.waitForFunction(()=>__adminFixture.data.categories.find(row=>row.id==='tacos').name==='Tacos maison');
        check(await page.evaluate(()=>__adminFixture.data.menuItems.filter(row=>row.categoryId==='tacos').every(row=>row.category==='Tacos maison')),'Category rename updates product snapshots');
        await page.locator('[data-menu-action=delete-category][data-id=tacos]').click();await page.locator('#menu-categories-dialog [data-save-state]').filter({hasText:'destination'}).waitFor();check(await page.evaluate(()=>__adminFixture.data.categories.some(row=>row.id==='tacos')),'Non-empty deletion refuses orphaning');
        await page.locator('[data-destination=tacos]').selectOption('burgers');await page.locator('[data-menu-action=delete-category][data-id=tacos]').click();await page.waitForFunction(()=>!__adminFixture.data.categories.some(row=>row.id==='tacos'));
        check(await page.evaluate(()=>!__adminFixture.data.menuItems.some(row=>row.categoryId==='tacos'||row.category==='Tacos maison')),'Delete moves products atomically');await page.keyboard.press('Escape');
        await action(page,'groups').click();await action(page,'new-group','#menu-groups-dialog').click();await page.locator('#menu-group-editor [data-group-field=title]').fill('Sauces communes');await page.locator('#menu-group-editor [data-option-field=name]').fill('Barbecue');await action(page,'save-group','#menu-group-editor').click();await page.locator('#menu-group-editor').waitFor({state:'hidden'});
        const groupId=await page.evaluate(()=>__adminFixture.data.modifierGroups[0].id);check(!!groupId,'Reusable group created');await page.keyboard.press('Escape');
        for(const id of ['tacos','burger']) {await page.locator(`[data-product=${id}] [data-menu-action=edit]`).click();await action(page,'editor-tab','#item-editor').filter({hasText:'Choix'}).click();await page.locator('#menu-attach-group').selectOption(groupId);await action(page,'attach-group','#item-editor').click();await page.locator('#btn-save-item').click();await page.locator('#item-editor').waitFor({state:'hidden'});}
        check(await page.evaluate(()=>__adminFixture.data.modifierGroups[0].productIds.length===2),'Group linked to two products');
        await action(page,'groups').click();await action(page,'edit-group','#menu-groups-dialog').first().click();await page.locator('#menu-group-editor [data-option-field=price]').fill('3');await action(page,'save-group','#menu-group-editor').click();await page.locator('#menu-group-editor').waitFor({state:'hidden'});
        check(await page.evaluate(()=>__adminFixture.data.menuItems.filter(row=>['tacos','burger'].includes(row.id)).every(row=>row.mandatoryChoices.find(group=>group.sourceGroupId).options[0].price===3)),'Shared edit propagates to every linked snapshot');
        await action(page,'duplicate-group','#menu-groups-dialog').first().click();await action(page,'save-group','#menu-group-editor').click();await page.locator('#menu-group-editor').waitFor({state:'hidden'});check(await page.evaluate(()=>__adminFixture.data.modifierGroups.length===2&&__adminFixture.data.modifierGroups[1].productIds.length===0),'Group duplication independent');
        await page.locator(`#menu-groups-dialog [data-menu-action=delete-group][data-id="${groupId}"]`).click();await page.waitForFunction(()=>__adminFixture.data.modifierGroups.length===1);check(await page.evaluate(()=>__adminFixture.data.menuItems.filter(row=>['tacos','burger'].includes(row.id)).every(row=>row.modifierGroupIds.length===0&&row.mandatoryChoices.length===1&&!row.mandatoryChoices[0].sourceGroupId)),'Shared group deletion freezes independent snapshots');await page.keyboard.press('Escape');
        await page.locator('[data-product=tacos] [data-menu-action=edit]').click();await page.locator('#input-name').fill('Modification locale');await page.evaluate(()=>{__adminFixture.data.menuItems.find(row=>row.id==='tacos').name='Modification distante';__adminFixture.emit();});await page.locator('#btn-save-item').click();await page.locator('#item-editor [data-save-state]').filter({hasText:'autre appareil'}).waitFor();check(await page.evaluate(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').name==='Modification distante'),'Stale editor cannot overwrite remote changes');await closeEditor(page);
        await page.locator('[data-product=tacos] [data-menu-action=edit]').click();await page.locator('#menu-image-file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c1ioAAAAASUVORK5CYII=','base64')});await page.locator('#btn-save-item').click();await page.locator('#item-editor').waitFor({state:'hidden'});check(uploadRequests===1,'Image upload uses mocked endpoint only');check(await page.evaluate(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').imageUrl==='https://example.test/fixture-image.png'),'Uploaded image persisted');
        check(await page.evaluate(()=>JSON.stringify(__adminFixture.data.orders))===history,'Historical order snapshots unchanged');
        for(const [kind,expectedValue] of [['show',true],['stock',false],['available',true]]) {
            for(const id of ['tacos','burger'])await page.locator(`[data-select=${id}]`).check();
            await page.locator('#menu-bulk-action').selectOption(kind);await action(page,'bulk').click();
            await page.waitForFunction(({kind,value})=>__adminFixture.data.menuItems.filter(row=>['tacos','burger'].includes(row.id)).every(row=>row[kind==='show'?'isVisible':'isAvailable']===value),{kind,value:expectedValue});
            check(await page.locator('#menu-bulk').isHidden(),'Bulk operation confirms and clears selection');
        }
        for(const id of ['tacos','burger'])await page.locator(`[data-select=${id}]`).check();await page.locator('#menu-bulk-action').selectOption('move');await page.locator('#menu-bulk-category').selectOption({label:'Desserts'});await action(page,'bulk').click();
        await page.waitForFunction(()=>__adminFixture.data.menuItems.filter(row=>['tacos','burger'].includes(row.id)).every(row=>row.category==='Desserts'));check(true,'Bulk category move');
        await page.locator('[data-product=burger] summary').click();await page.locator('[data-product=burger] [data-menu-action=up]').click();await page.locator('#menu-feedback').waitFor({state:'hidden'});check(await page.evaluate(()=>new Set(__adminFixture.data.menuItems.map(row=>row.order)).size===__adminFixture.data.menuItems.length),'Reordering preserves unique positions');
        await page.locator('[data-product=tacos] [data-menu-action=edit]').click();await page.locator('#input-name').fill('Brouillon non enregistré');page.removeAllListeners('dialog');page.once('dialog',dialog=>dialog.dismiss());await page.keyboard.press('Escape');check(await page.locator('#item-editor').isVisible(),'Unsaved change dismissal keeps editor');page.once('dialog',dialog=>dialog.accept());await page.keyboard.press('Escape');await page.locator('#item-editor').waitFor({state:'hidden'});page.on('dialog',dialog=>dialog.accept());check(await page.evaluate(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').name==='Modification distante'),'Discard does not save draft');
        await page.locator('[data-product=tacos] [data-menu-action=edit]').click();await page.locator('#menu-image-file').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});check(await page.locator('#menu-image-file').inputValue()==='','Unsupported image rejected');check(uploadRequests===1,'Rejected file never uploads');
        await context.route('https://api.cloudinary.com/**',route=>{uploadRequests++;return route.fulfill({status:500,body:'error'});});
        await page.locator('#menu-image-file').setInputFiles({name:'retry.png',mimeType:'image/png',buffer:Buffer.from('fixture')});await page.locator('#btn-save-item').click();await page.locator('#item-editor [data-save-state][role=alert]').waitFor();check(await page.locator('#item-editor').isVisible(),'Upload failure retains editor');check(await page.evaluate(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').imageUrl==='https://example.test/fixture-image.png'),'Failed upload preserves saved image');
        await context.route('https://api.cloudinary.com/**',route=>{uploadRequests++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({secure_url:'https://example.test/retried.png'})});});await page.locator('#btn-save-item').click();await page.locator('#item-editor').waitFor({state:'hidden'});check(await page.evaluate(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').imageUrl.endsWith('retried.png')),'Image save retries successfully');
        const concurrent=await page.evaluate(async()=>{
            const {createMenuService}=await import('./assets/admin-menu-service.js');const actor={uid:'fixture-staff',role:'admin',epoch:0};const service=createMenuService(()=>actor),categories=__adminFixture.data.categories;
            const draft={name:'Création simultanée',price:12,categoryId:categories[0].id,isVisible:false,isAvailable:true,mandatoryChoices:[],supplements:[],modifierGroupIds:[],order:50};
            return Promise.all([service.product(draft,null,categories),service.product({...draft,name:'Seconde création'},null,categories)]);
        });check(concurrent[0]!==concurrent[1],'Simultaneous creates get distinct IDs');check(await page.evaluate(()=>new Set(__adminFixture.data.menuItems.map(row=>row.order)).size===__adminFixture.data.menuItems.length),'Simultaneous creates get distinct positions');
        await action(page,'groups').click();await action(page,'edit-group','#menu-groups-dialog').first().click();await page.locator('#menu-group-editor [data-option-field=price]').fill('7');await page.evaluate(()=>{
            __adminFixture.beforeCommit=()=>{const group=__adminFixture.data.modifierGroups[0],product=__adminFixture.data.menuItems.find(row=>row.id==='tacos');group.productIds=['tacos'];product.modifierGroupIds=[group.id];product.mandatoryChoices.push({...group,sourceGroupId:group.id});__adminFixture.emit();};
        });await action(page,'save-group','#menu-group-editor').click();await page.locator('#menu-group-editor').waitFor({state:'hidden'});check(await page.evaluate(()=>__adminFixture.data.menuItems.find(row=>row.id==='tacos').mandatoryChoices.find(row=>row.sourceGroupId).options[0].price===7),'Shared edit retries and includes concurrent attachment');await page.keyboard.press('Escape');
        await page.evaluate(()=>{__adminFixture.cached=true;__adminFixture.emit();});check(await action(page,'new').isDisabled(),'Cached menu disables mutations');await page.evaluate(()=>{__adminFixture.cached=false;__adminFixture.emit();});
        await page.evaluate(()=>{__adminFixture.failMenu=true;__adminFixture.emit();});check(await action(page,'new').isDisabled(),'Failed reads disable mutations');await page.evaluate(()=>__adminFixture.failMenu=false);await action(page,'refresh').click();await page.locator('#menu-feedback').waitFor({state:'hidden'});check(await action(page,'new').isEnabled(),'Refresh recovers failed reads');
        await page.evaluate(()=>{__adminFixture.originalItems=__adminFixture.data.menuItems;__adminFixture.data.menuItems=[...__adminFixture.originalItems,...Array.from({length:301},(_,index)=>({...__adminFixture.originalItems[0],id:`cap-${index}`}))];__adminFixture.emit();});check(await action(page,'new').isDisabled(),'Partial catalog disables destructive writes');await page.evaluate(()=>{__adminFixture.data.menuItems=__adminFixture.originalItems;__adminFixture.emit();});
        await page.evaluate(()=>switchView('overview'));check(await page.locator('#view-overview').isVisible(),'Overview preserved');await page.evaluate(()=>switchView('orders'));await page.locator('#list-pending .order-card').first().waitFor();check(await page.locator('#view-orders').isVisible(),'Orders preserved');
        await context.close();
    }
    for(const role of ['manager','caissier','livreur']) {
        const {page,context}=await open(390,`role=${role}`);await page.waitForFunction(()=>__adminFixture&&window.switchView);
        if(role==='manager'){await page.locator('.menu-product').first().waitFor();check(await action(page,'new').isEnabled(),'Manager menu access');}
        else{check(await page.evaluate(()=>switchView('menu'))===false,`${role} denied menu route`);check(await page.evaluate(()=>openItemEditor('tacos'))===false,`${role} denied editor`);check(await page.evaluate(()=>__adminFixture.writes.length===0),'Unauthorized role makes no catalog writes');}
        await context.close();
    }
    {
        const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
        await context.route(/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs)/,route=>{productionRequests++;return route.abort();});
        await page.goto(store.url);await page.locator('#menuContent .product-card').first().waitFor();await page.evaluate(()=>openItemModal('simple'));await page.locator('#btnModalAddToCart').click();
        await page.evaluate(()=>{__fixture.menuItems.find(row=>row.id==='simple').isAvailable=false;__fixture.emitCatalog();});
        await page.waitForFunction(()=>document.getElementById('btnGoToCheckout').disabled);
        check(await page.locator('#menuContent .product-card').filter({hasText:'Poulet Gratiné'}).getByRole('button').isDisabled(),'Stock state reflected in storefront');
        await page.evaluate(()=>openCart());check(await page.locator('#cartMenuWarning').innerText().then(text=>text.includes('plus disponible')),'Existing cart reports changed stock');
        await page.evaluate(()=>openCheckoutModal());check(await page.locator('#nameModal').isHidden(),'Invalid cart cannot proceed');
        check(await page.evaluate(()=>__fixture.orders.length===0),'Availability test creates no order');
        await page.evaluate(()=>{__fixture.menuItems.find(row=>row.id==='simple').isAvailable=true;__fixture.emitCatalog();});await page.waitForFunction(()=>!document.getElementById('btnGoToCheckout').disabled);
        await page.evaluate(()=>{__fixture.categories.find(row=>row.name==='Gratinés').isVisible=false;__fixture.emitCatalog();});await page.waitForFunction(()=>document.getElementById('btnGoToCheckout').disabled);
        check(await page.locator('#menuContent .product-card').filter({hasText:'Poulet Gratiné'}).count()===0,'Hidden category removes its products');await context.close();
    }
    check(productionRequests===0,'Zero production Firebase requests');check(errors.length===0,errors.join('\n'));
    console.log(JSON.stringify({passed,productionRequests,uploadRequests,errors,screenshots:output||null}));
} finally {await browser.close();await Promise.all([admin,store].map(({server})=>new Promise(resolve=>server.close(resolve))));}
