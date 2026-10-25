async (page) => {
    const checks = [];
    const assert = (condition, label) => { if (!condition) throw new Error(label); checks.push(label); };
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3107');
    await page.evaluate(()=>localStorage.removeItem('bigtacCart'));
    await page.reload();
    await page.locator('#menuContent .product-card').first().waitFor();
    for (const width of [320, 375, 390, 768, 1440]) {
        await page.setViewportSize({width, height: width > 1000 ? 900 : 844});
        for (const dark of [false, true]) {
            if (await page.evaluate(()=>document.documentElement.classList.contains('dark')) !== dark) await page.locator('#btnDarkMode').click();
            await page.evaluate(() => {
                window.scrollTo({top:0, behavior:'instant'});
            });
            await page.waitForTimeout(180);
            const measurements = await page.evaluate(() => {
                const title=document.querySelector('h1');
                const box=title.getBoundingClientRect();
                const smallTargets=[...document.querySelectorAll('.store-header button, #categoryFilters button, .product-card__choose')]
                    .filter(el=>el.getBoundingClientRect().width>0)
                    .filter(el=>el.getBoundingClientRect().width<44||el.getBoundingClientRect().height<44).length;
                return {overflow:document.documentElement.scrollWidth>innerWidth, titleInView:box.bottom<innerHeight+1, smallTargets};
            });
            assert(!measurements.overflow, `${width}px ${dark?'dark':'light'}: no horizontal overflow`);
            assert(measurements.titleInView, `${width}px ${dark?'dark':'light'}: full hero title on first screen`);
            assert(!measurements.smallTargets, `${width}px: touch targets at least 44×44px`);
            if ([390,1440].includes(width)) {
                await page.screenshot({path:`.taste-skill/after-${width}-${dark?'dark':'light'}.png`});
                await page.locator('#menu-unified').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
                await page.screenshot({path:`.taste-skill/menu-${width}-${dark?'dark':'light'}.png`});
            }
        }
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('#categoryFilters button').filter({hasText:'Burgers'}).click();
    assert(await page.locator('#categoryFilters button[aria-pressed="true"]').innerText()==='Burgers','Category pressed state updates');
    assert(await page.locator('#menuContent .section-block:not(.hidden)').count()===1,'Category filters displayed sections');
    await page.locator('#menuSearch').fill('Mixte');
    assert(await page.locator('#menuContent .product-card:visible').count()===1,'Search finds correct product');
    await page.locator('#clearSearchBtn').click();
    assert(await page.locator('#menuSearch').inputValue()==='','Search clears');
    await page.locator('#categoryFilters button').filter({hasText:'Tout voir'}).click();
    const chooser = page.locator('#menuContent .product-card__choose').first();
    await chooser.focus();
    await page.keyboard.press('Enter');
    await page.locator('#addItemModal').waitFor({state:'visible'});
    assert(await page.locator('#modalItemName').innerText()==='Tacos Poulet','Keyboard chooser opens correct existing product modal');
    await page.locator('#btnModalAddToCart').click();
    await page.waitForTimeout(400);
    assert(await page.locator('#navCartCount').innerText()==='1','Adding product updates header cart count');
    await page.locator('#btnNavCart').click();
    await page.locator('#cartModal').waitFor({state:'visible'});
    assert((await page.locator('#cartItemsContainer').innerText()).includes('Tacos Poulet'),'Header opens cart with chosen product');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const wasDark=await page.evaluate(()=>document.documentElement.classList.contains('dark'));
    await page.locator('#btnDarkMode').click();
    assert(await page.evaluate(()=>document.documentElement.classList.contains('dark'))!==wasDark,'Theme button still toggles theme');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert(await page.locator('.store-hero h1').evaluate(el=>getComputedStyle(el).animationName)==='none','Reduced motion disables new animation');
    const external = await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>/firestore|firebase|googleapis.com\/.*channel/.test(x.name)).map(x=>x.name));
    assert(external.every(url=>url.startsWith('http://127.0.0.1:3107/')),'No production Firebase requests');
    assert(errors.length===0,'No JavaScript runtime errors');
    return {passed:checks.length,checks};
}
