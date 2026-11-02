import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';
import {startFixtureServer} from './fixtures/server.mjs';
const admin=await startAdminFixtureServer(),store=await startFixtureServer(),browser=await chromium.launch();
let checks=0,production=0;const errors=[];
const check=(value,label)=>{assert.ok(value,label);checks++;};
async function open(url,width){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    await context.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/,route=>{production++;return route.abort();});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(url,{waitUntil:'domcontentloaded'});return {page,context};
}
const act=(page,action)=>page.locator(`#item-editor [data-menu-action="${action}"]`);
try{
    for(const width of [320,390,768,1440]){
        const {page:p,context}=await open(admin.url+'/admin.html#menu',width);await p.locator('.menu-product').first().waitFor();
        const history=await p.evaluate(()=>JSON.stringify(__adminFixture.data.orders));
        await p.locator('[data-product=tacos] [data-menu-action=edit]').click();await act(p,'editor-tab').filter({hasText:'Choix'}).click();
        await p.locator('#menu-choice-template').selectOption('sizes');await act(p,'add-choice').click();
        check(await p.locator('#item-editor .menu-option-row').count()===3,'Template adds three draft options');
        await p.locator('#item-editor [data-selection-preset]').selectOption('upto');
        check(await p.locator('#item-editor [data-group-field=min]').inputValue()==='0'&&await p.locator('#item-editor [data-group-field=max]').inputValue()==='2','Preset maps to legacy min/max');
        await p.locator('#item-editor [data-group-required]').check();check(await p.locator('#item-editor [data-group-field=min]').inputValue()==='1','Required toggle updates canonical minimum');
        await p.locator('#item-editor [data-group-field=min]').fill('3');check(await p.locator('#item-editor [data-group-error]').isVisible(),'Invalid group feedback is inline');await p.locator('#item-editor [data-group-field=min]').fill('1');
        await act(p,'option-duplicate').first().click();check(await p.locator('#item-editor .menu-option-row').count()===4,'Option duplicated');
        check(await p.locator('#item-editor [data-option-field=name]').nth(1).inputValue()==='M (copie)','Duplicate gets a distinct editable name');
        await act(p,'option-down').first().click();check(await p.locator('#item-editor [data-option-field=name]').first().inputValue()==='M (copie)','Move Down reorders draft options');
        check(await p.locator('#item-editor').evaluate(el=>el.scrollWidth<=el.clientWidth)&&await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`New controls fit ${width}px`);
        p.once('dialog',dialog=>dialog.dismiss());await p.keyboard.press('Escape');check(await p.locator('#item-editor').isVisible(),'Unsaved changes remain protected');
        await p.locator('#btn-save-item').click();await p.locator('#item-editor').waitFor({state:'hidden'});
        check(await p.evaluate(()=>{const g=__adminFixture.data.menuItems.find(row=>row.id==='tacos').mandatoryChoices[0];return g.type==='checkbox'&&g.min===1&&g.max===2&&new Set(g.options.map(o=>o.id)).size===4&&!('preset'in g);}), 'Save preserves stable IDs and existing rule contract');
        check(await p.evaluate(()=>JSON.stringify(__adminFixture.data.orders))===history,'Historical orders unchanged');await context.close();
    }
    {
        const {page:p,context}=await open(admin.url+'/admin.html#menu',390);await p.locator('.menu-product').first().waitFor();await p.locator('[data-menu-action=groups]').click();await p.locator('#menu-groups-dialog [data-menu-action=new-group]').click();
        await p.locator('#menu-group-template').selectOption('sauces');p.once('dialog',dialog=>dialog.accept());await p.locator('#menu-group-editor [data-menu-action=group-template]').click();
        await p.locator('#menu-group-editor [data-selection-preset]').selectOption('atleast');await p.locator('#menu-group-editor [data-group-field=min]').fill('2');
        await p.locator('#menu-group-editor [data-menu-action=save-group]').click();await p.locator('#menu-group-editor').waitFor({state:'hidden'});
        check(await p.evaluate(()=>__adminFixture.data.modifierGroups[0].min===2&&__adminFixture.data.modifierGroups[0].max===0),'Shared group uses same preset contract');await p.keyboard.press('Escape');
        await p.locator('[data-product=tacos] [data-menu-action=edit]').click();await p.locator('#input-price').fill('0.001');await act(p,'editor-tab').filter({hasText:'Aperçu'}).click();
        check(await p.locator('#menu-product-preview').innerText().then(text=>text.includes('Corrigez les prix')),'Invalid draft money shows preview feedback');await context.close();
    }
    {
        const {page:p,context}=await open(store.url,390);await p.locator('#menuContent .product-card').first().waitFor();
        await p.evaluate(()=>{const item=__fixture.menuItems.find(item=>item.id==='tacos');item.price=.1;item.mandatoryChoices=[{id:'sauce-id',title:'Sauce précise',type:'radio',min:1,max:1,options:[{id:'a',name:'Alpha',price:.2},{id:'b',name:'Beta',price:.2},{id:'c',name:'Rupture',price:.2,isAvailable:false}]}];item.supplements=[];__fixture.emitCatalog();});
        await p.waitForFunction(()=>document.querySelector('#menuContent').textContent.includes('0,10'));
        await p.evaluate(()=>openItemModal('tacos'));check(await p.locator('#wizardContainer input').count()===2,'Sold-out option cannot be selected');
        await p.locator('#choice-0-0').check();await p.locator('#btnModalAddToCart').click();await p.locator('#addItemModal').waitFor({state:'hidden'});
        await p.evaluate(()=>{openItemModal('tacos');});await p.locator('#choice-0-1').check();await p.locator('#btnModalAddToCart').click();await p.locator('#addItemModal').waitFor({state:'hidden'});
        check(await p.evaluate(()=>cart.length===2&&cart[0].selectedOptions[0].id==='a'&&cart[1].selectedOptions[0].id==='b'&&cart[0].cartId!==cart[1].cartId),'Different configurations retain separate cart identities');
        check(await p.evaluate(()=>cart[0].choiceSelections[0].groupId==='sauce-id'),'Group identity retained in local cart');
        await p.evaluate(()=>updateCartItemQty(0,2));check(await p.evaluate(()=>cart[0].qty===3&&cart[0].totalPrice===.9),'Quantity total uses exact cents');
        await p.evaluate(()=>{__fixture.menuItems.find(item=>item.id==='tacos').mandatoryChoices[0].options[0].id='replaced';__fixture.emitCatalog();});await p.waitForFunction(()=>document.getElementById('btnGoToCheckout').disabled);
        check(await p.locator('#cartMenuWarning').innerText().then(text=>text.includes('changé')),'Replaced option identity requires explicit reconfiguration');check(await p.evaluate(()=>__fixture.orders.length===0),'No test order created');
        await p.evaluate(()=>{cart[0].totalPrice=.123;updateCartUI();updateCartItemQty(0,1);});
        check(await p.locator('#cartMenuWarning').innerText().then(text=>text.includes('montant'))&&await p.locator('#btnGoToCheckout').isDisabled(),'Malformed legacy cart amount fails with feedback instead of breaking the page');await context.close();
    }
    check(production===0,'No production Firebase requests');check(errors.length===0,errors.join('\n'));console.log(`${checks} focused menu-logic browser checks passed`);
}finally{await browser.close();await Promise.all([admin,store].map(({server})=>new Promise(resolve=>server.close(resolve))));}
