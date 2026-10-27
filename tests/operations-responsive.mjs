import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';

const {server,url}=await startAdminFixtureServer(),browser=await chromium.launch();
let checks=0,production=0;const errors=[];
try{
    const page=await browser.newPage({reducedMotion:'reduce'});
    await page.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|gstatic\.com\/firebasejs/,route=>{production++;return route.abort();});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url+'/admin.html');await page.waitForFunction(()=>window.switchView);
    for(const width of [320,390,768,1440]){
        await page.setViewportSize({width,height:900});
        await page.evaluate(()=>switchView('promotions'));
        await page.locator('[data-promo-action=edit]').first().click();
        await page.waitForFunction(()=>!document.getElementById('btn-save-promo').disabled);
        await page.evaluate(()=>addPromoChoiceGroup());
        assert.ok(await page.evaluate(()=>{
            const form=document.getElementById('promo-form');
            return document.documentElement.scrollWidth<=innerWidth&&form.scrollWidth<=form.clientWidth+1;
        }),`Promotion editor overflow at ${width}`);checks++;
        await page.evaluate(()=>{closePromoEditor();switchView('settings');});
        await page.locator('#restaurant-profile-form').waitFor({state:'visible'});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Settings overflow at ${width}`);checks++;
    }
    assert.equal(production,0);assert.deepEqual(errors,[]);
    console.log(`${checks} Phase 4 responsive checks passed (320/390/768/1440px); no production requests or page errors`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
