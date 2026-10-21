import { chromium } from 'playwright';

async function runTests() {
  console.log('🚀 Starting BIGTAC E2E Verification Suite...\n');
  const browser = await chromium.launch({ headless: true });
  const results = { passed: 0, failed: 0, errors: [] };

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      results.passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      results.failed++;
      results.errors.push(message);
    }
  }

  try {
    // =========================================================================
    // 1. DESKTOP TEST: index.html (1280x800)
    // =========================================================================
    console.log('--- 1. Testing index.html (Desktop 1280x800) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2
    });
    const desktopPage = await desktopContext.newPage();
    const desktopErrors = [];
    desktopPage.on('pageerror', err => desktopErrors.push(err.message));
    desktopPage.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('ERR_INTERNET_DISCONNECTED')) {
          desktopErrors.push(text);
        }
      }
    });

    await desktopPage.goto('http://127.0.0.1:3000/index.html', { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(1500);

    // Title check
    const pageTitle = await desktopPage.title();
    assert(pageTitle.includes('BIGTAC'), `Desktop title includes 'BIGTAC' (Got: "${pageTitle}")`);

    // Hero section & Navigation
    const heroVisible = await desktopPage.locator('#hero').isVisible();
    assert(heroVisible, 'Hero banner section is visible');

    const heroCta = desktopPage.locator('a[href="#menu-unified"]');
    assert(await heroCta.first().isVisible(), 'Hero CTA button "Commander en ligne" is visible');

    // Menu search bar
    const searchInput = desktopPage.locator('#menuSearch');
    assert(await searchInput.isVisible(), 'Menu search input (#menuSearch) is visible');
    await searchInput.fill('Tacos');
    await desktopPage.waitForTimeout(300);
    assert(await searchInput.inputValue() === 'Tacos', 'Search input accepts text cleanly');
    await searchInput.fill('');
    await desktopPage.waitForTimeout(300);

    // Dark Mode Toggle
    const darkBtn = desktopPage.locator('#btnDarkMode');
    assert(await darkBtn.isVisible(), 'Dark mode toggle button is visible');
    await darkBtn.click();
    await desktopPage.waitForTimeout(200);
    const isDark = await desktopPage.evaluate(() => document.documentElement.classList.contains('dark'));
    assert(isDark, 'Dark mode activates class "dark" on <html>');
    await darkBtn.click(); // revert
    await desktopPage.waitForTimeout(200);

    // Cart Drawer Open & Close
    const navCartBtn = desktopPage.locator('#btnNavCart');
    assert(await navCartBtn.isVisible(), 'Navigation cart button (#btnNavCart) is visible');
    await navCartBtn.click();
    await desktopPage.waitForTimeout(500);

    const cartModal = desktopPage.locator('#cartModal');
    const isCartOpen = await cartModal.evaluate(el => !el.classList.contains('hidden'));
    assert(isCartOpen, 'Cart modal opens upon clicking cart button');

    // Close Cart Drawer
    const closeCartBtn = desktopPage.locator('button[onclick="closeCart()"]');
    await closeCartBtn.first().click();
    await desktopPage.waitForTimeout(500);
    const isCartClosed = await cartModal.evaluate(el => el.classList.contains('hidden'));
    assert(isCartClosed, 'Cart modal closes cleanly');

    // Test Cart Logic & Customization via In-Page State
    console.log('\n  🧪 Testing Cart & Order Calculations...');
    await desktopPage.evaluate(() => {
      // Simulate adding a customized item to cart
      const testItem = {
        cartItemId: 'item-test-1',
        id: 'tacos-poulet',
        name: 'Tacos Poulet M',
        price: 27,
        basePrice: 22,
        qty: 2,
        isCustomized: true,
        selectedOptions: [{ name: 'Taille M' }],
        supplements: [{ name: 'Sauce Algérienne', price: 0 }, { name: 'Frites', price: 5 }],
        supplementsCost: 5,
        totalPrice: 54
      };
      // Access cart and update
      window.cart.push(testItem);
      window.updateCartUI();
    });
    await desktopPage.waitForTimeout(300);

    // Verify Nav cart counter and total
    const cartCountText = await desktopPage.locator('#navCartCount').innerText();
    const cartTotalText = await desktopPage.locator('#navCartTotal').innerText();
    assert(cartCountText === '2', `Cart count badge displays correct quantity (Expected: 2, Got: ${cartCountText})`);
    assert(cartTotalText.includes('54'), `Cart total calculates correctly (2 x 27 = 54 Dh, Got: ${cartTotalText})`);

    // Open Cart again to inspect rendered item card
    await navCartBtn.click();
    await desktopPage.waitForTimeout(400);

    const renderedCartItem = desktopPage.locator('#cartItemsContainer .cart-item-card');
    assert(await renderedCartItem.count() > 0, 'Cart item card rendered inside #cartItemsContainer');

    // Test Checkout Flow Step 1: Customer Info
    const checkoutBtn = desktopPage.locator('#btnGoToCheckout');
    await checkoutBtn.click();
    await desktopPage.waitForTimeout(500);

    const nameModal = desktopPage.locator('#nameModal');
    const isNameModalOpen = await nameModal.evaluate(el => !el.classList.contains('hidden'));
    assert(isNameModalOpen, 'Checkout Step 1 (Name Modal) opens');

    // Fill customer info
    await desktopPage.locator('#customerName').fill('Karim El Idrissi');
    await desktopPage.locator('#customerPhone').fill('0612345678');
    await desktopPage.waitForTimeout(200);

    // Proceed to Step 2 (Service Selection: Livraison / Emporter / Sur Place)
    await desktopPage.evaluate(() => window.nextCheckoutStep());
    await desktopPage.waitForTimeout(500);

    const serviceModal = desktopPage.locator('#serviceModal');
    const isServiceModalOpen = await serviceModal.evaluate(el => !el.classList.contains('hidden'));
    assert(isServiceModalOpen, 'Checkout Step 2 (Service Modal: Livraison / Emporter / Sur Place) opens');

    // Select "A Emporter" to advance to Order Summary
    await desktopPage.evaluate(() => window.selectService('emporter'));
    await desktopPage.waitForTimeout(500);

    const summaryModal = desktopPage.locator('#summaryModal');
    const isSummaryModalOpen = await summaryModal.evaluate(el => !el.classList.contains('hidden'));
    assert(isSummaryModalOpen, 'Checkout Step 3 (Summary Modal) opens with order breakdown');

    // Verify summary values
    const summaryTotal = await desktopPage.locator('#summaryTotal').innerText();
    assert(summaryTotal.includes('54'), `Order summary displays correct total (54 Dh, Got: ${summaryTotal})`);

    // Clean up modals and cart
    await desktopPage.evaluate(() => {
      window.closeModalAnimation('summaryModal');
      window.closeModalAnimation('serviceModal');
      window.closeModalAnimation('nameModal');
      window.closeModalAnimation('cartModal');
      window.cart = [];
      window.updateCartUI();
    });
    await desktopPage.waitForTimeout(400);

    // Desktop screenshot
    await desktopPage.screenshot({ path: 'test_desktop_index.png', fullPage: false });
    console.log('  📸 Screenshot saved: test_desktop_index.png');

    assert(desktopErrors.length === 0, `Zero JS runtime errors on index.html (Errors: ${desktopErrors.join(' | ') || 'None'})`);
    await desktopContext.close();

    // =========================================================================
    // 2. MOBILE TEST: index.html (375x812 - iPhone 12/13/14)
    // =========================================================================
    console.log('\n--- 2. Testing index.html (Mobile 375x812) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });
    const mobilePage = await mobileContext.newPage();
    const mobileErrors = [];
    mobilePage.on('pageerror', err => mobileErrors.push(err.message));

    await mobilePage.goto('http://127.0.0.1:3000/index.html', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    // Verify no horizontal overflow on mobile
    const horizontalOverflow = await mobilePage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert(!horizontalOverflow, 'Mobile layout has zero horizontal viewport overflow');

    // Verify floating action button or cart triggers exist
    const fabCart = mobilePage.locator('#fabCart');
    assert(await fabCart.count() > 0, 'Floating cart action button is present in DOM');

    // Test mobile category pill container exists
    const categoryNav = mobilePage.locator('#categoryFilters');
    assert(await categoryNav.isVisible(), 'Horizontal category navigation is visible on mobile');

    await mobilePage.screenshot({ path: 'test_mobile_index.png', fullPage: false });
    console.log('  📸 Screenshot saved: test_mobile_index.png');

    assert(mobileErrors.length === 0, `Zero JS runtime errors on mobile index.html`);
    await mobileContext.close();

    // =========================================================================
    // 3. ADMIN STUDIO TEST: admin.html (1440x900)
    // =========================================================================
    console.log('\n--- 3. Testing admin.html Studio ---');
    const adminContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const adminPage = await adminContext.newPage();
    const adminErrors = [];
    adminPage.on('pageerror', err => adminErrors.push(err.message));
    adminPage.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('ERR_INTERNET_DISCONNECTED')) {
          adminErrors.push(text);
        }
      }
    });

    await adminPage.goto('http://127.0.0.1:3000/admin.html', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(1500);

    const adminTitle = await adminPage.title();
    assert(adminTitle.includes('BIGTAC'), `Admin title includes 'BIGTAC' (Got: "${adminTitle}")`);

    // Verify login section exists in DOM
    const loginSection = adminPage.locator('#login-section');
    assert(await loginSection.count() > 0, 'Admin login modal is structured in DOM');

    // Verify navigation tabs
    const navOrders = adminPage.locator('#nav-orders');
    const navMenu = adminPage.locator('#nav-menu');
    const navPromotions = adminPage.locator('#nav-promotions');
    const navDrivers = adminPage.locator('#nav-drivers');

    assert(await navOrders.isVisible(), 'Navigation tab #nav-orders is visible');
    assert(await navMenu.isVisible(), 'Navigation tab #nav-menu is visible');
    assert(await navPromotions.isVisible(), 'Navigation tab #nav-promotions is visible');
    assert(await navDrivers.isVisible(), 'Navigation tab #nav-drivers is visible');

    // Test view switching without reload
    await adminPage.evaluate(() => window.switchView('menu'));
    await adminPage.waitForTimeout(300);
    const isMenuViewVisible = await adminPage.locator('#view-menu').evaluate(el => !el.classList.contains('hidden'));
    assert(isMenuViewVisible, 'switchView("menu") displays the Menu management section');

    await adminPage.evaluate(() => window.switchView('promotions'));
    await adminPage.waitForTimeout(300);
    const isPromoViewVisible = await adminPage.locator('#view-promotions').evaluate(el => !el.classList.contains('hidden'));
    assert(isPromoViewVisible, 'switchView("promotions") displays the Promotions section');

    await adminPage.evaluate(() => window.switchView('drivers'));
    await adminPage.waitForTimeout(300);
    const isDriversViewVisible = await adminPage.locator('#view-drivers').evaluate(el => !el.classList.contains('hidden'));
    assert(isDriversViewVisible, 'switchView("drivers") displays the Drivers & Staff section');

    await adminPage.evaluate(() => window.switchView('orders'));
    await adminPage.waitForTimeout(300);
    const isOrdersViewVisible = await adminPage.locator('#view-orders').evaluate(el => !el.classList.contains('hidden'));
    assert(isOrdersViewVisible, 'switchView("orders") displays the Kanban Orders board');

    // Verify Sortable and Kanban columns exist
    const colPending = adminPage.locator('#col-pending');
    const colConfirmed = adminPage.locator('#col-confirmed');
    const colDelivery = adminPage.locator('#col-delivery');
    const colHistory = adminPage.locator('#col-history');
    assert(await colPending.count() > 0 && await colConfirmed.count() > 0 && await colDelivery.count() > 0 && await colHistory.count() > 0, 'All 4 Kanban order columns are mounted in DOM');

    // Capture admin studio screenshot
    await adminPage.screenshot({ path: 'test_admin_studio.png', fullPage: false });
    console.log('  📸 Screenshot saved: test_admin_studio.png');

    assert(adminErrors.length === 0, `Zero JS runtime errors on admin.html (Errors: ${adminErrors.join(' | ') || 'None'})`);
    await adminContext.close();

    // =========================================================================
    // 4. BATCH UPLOADER TEST: CC.html (1024x768)
    // =========================================================================
    console.log('\n--- 4. Testing CC.html Batch Uploader ---');
    const ccContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const ccPage = await ccContext.newPage();
    const ccErrors = [];
    ccPage.on('pageerror', err => ccErrors.push(err.message));

    await ccPage.goto('http://127.0.0.1:3000/CC.html', { waitUntil: 'domcontentloaded' });
    await ccPage.waitForTimeout(1000);

    const ccTitle = await ccPage.title();
    assert(ccTitle.includes('Menu Uploader'), `CC.html title contains 'Menu Uploader'`);

    const uploadBtn = ccPage.locator('#btn');
    assert(await uploadBtn.isVisible(), 'Start Menu Upload button is visible');
    assert(ccErrors.length === 0, 'Zero JS errors on CC.html');

    await ccContext.close();

  } catch (err) {
    console.error('Test execution error:', err);
    results.failed++;
    results.errors.push(err.message);
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log(`🎉 TEST SUMMARY: ${results.passed} Passed, ${results.failed} Failed`);
  console.log('======================================================\n');
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
