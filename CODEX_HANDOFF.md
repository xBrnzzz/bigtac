# BIGTAC / Eon Agency — Codex Technical Handoff

**Updated:** 3 November 2026  
**Repository:** https://github.com/xBrnzzz/bigtac  
**Branch:** `main`  
**Latest Verified Commit:** `c0308ea` (`fix(promotions): speed up carousel autoplay and tighten card spacing`)  
**Live Deployment:** Netlify (auto-deploys from `origin/main` at `https://bigtac.netlify.app`)

---

## 1. Executive Summary & Purpose

This handoff is for incoming Codex or Antigravity instances. It encapsulates the current technical state, recently completed features, architecture, design rules, testing protocol, and immediate next steps so work can continue seamlessly without re-auditing or regressing existing functionality.

**Core Business Model:**
BIGTAC is a white-label, commission-free (0%) restaurant ordering and management web application built by **Eon Agency** in Morocco. It serves fast-casual restaurant clients (such as tacos, grill, burgers, pizza) starting in Fez/Casablanca/Rabat.

---

## 2. Technical Stack Truths (Inspect Before Editing)

- **NOT React / Next.js / Vue:** The frontend is vanilla ES Modules (`<script type="module">`), modern semantic HTML5, vanilla CSS (`assets/storefront.css`, `assets/admin.css`, `assets/admin-approved.css`), and Tailwind CSS CDN for utility layering.
- **Backend / Persistence:** Cloud Firestore (modular Firebase JS SDK v10/11) and Firebase Auth.
- **Testing Architecture:** 8 comprehensive local test suites powered by Playwright and local HTTP fixture servers. **Zero production Firebase requests** are permitted during tests (`productionRequests === 0`).
- **Data Models & Pure Logic:**
  - `assets/menu-model.js`: Product availability, pricing, listed state, and fingerprinting.
  - `assets/customization.js`: Step calculation, choice validation (min/max selection), option snapshots, and subtotal calculation.
  - `assets/operations-model.js`: Store opening hours, ordering modes, service availability, URL sanitization.
  - `assets/admin-model.js`: Role access control (admin, manager, caissier, livreur).
  - `assets/i18n.js`: Full multi-language dictionary (FR, EN, AR) and reactive DOM updater.
  - `assets/carousels.js`: Bidirectional continuous ticker for promotions and bestseller carousels.

---

## 3. What Was Recently Completed & Verified

### A. Multi-Language System (FR 🇫🇷 / EN 🇬🇧 / AR 🇲🇦)
- **Central Module ([`assets/i18n.js`](file:///C:/Users/pc/bigtac/assets/i18n.js)):**
  - Fully translated dictionaries for French (default), English, and Moroccan Arabic (Darija-adapted for local Moroccan dining).
  - Accessible dropdown switchers with globe icons (`🌐`) in:
    1. Storefront header (`#langSelector`)
    2. Admin login modal (`#loginLangSelector`)
    3. Admin workspace topbar (`#adminLangSelector`)
    4. Driver dedicated interface (`#driverLangSelector`)
  - Reactive DOM updates on `bigtac:langchange` custom event; persists active language in `localStorage ('bigtac_lang')`.
  - Dynamic rendering in `index.html` re-runs `createCardHTML()` and `renderMenuSections()` with translated badges ("Offre du moment" / "Special Offer" / "العروض الخاصة", "Choisir", "Composer", "À partir de", "Rupture de stock").
- **RTL Arabic Layout ([`assets/storefront.css`](file:///C:/Users/pc/bigtac/assets/storefront.css)):**
  - Cairo font integration for Arabic (`[dir="rtl"]`).
  - Reversed flex alignments for product card footers, service choice list chevrons, cart sheet headers, search inputs, and form controls.

### B. Promotions Carousel Speed & Spacing Refinements
- **Speed Tuning ([`assets/carousels.js`](file:///C:/Users/pc/bigtac/assets/carousels.js)):**
  - Carousel auto-advance rate increased ~2.7× from `0.018` (~18px/s) to `0.048` (~48px/s).
  - Ticker is lively, dynamic, and visibly moves across the screen while preserving instant pauses on mouse hover, touch drag, keyboard focus, or modal open.
- **Tightened Card Spacing ([`assets/storefront.css`](file:///C:/Users/pc/bigtac/assets/storefront.css)):**
  - Replaced `grid-auto-columns: 100%` on desktop `.menu-feature--offers .featured-grid` with `grid-auto-columns: min(660px, calc(100% - 24px)); gap: 16px`.
  - Eliminated the former ~360px blank dead zone on widescreen displays. The next offer card sits directly adjacent and peeks in naturally.

### C. Customization Sheet Streamlining
- Removed redundant legacy navigation buttons ("Continuer", "Voir le total") inside the customization modal.
- Clean sheet footer now directly displays the calculated live total and a single context-aware button: "Ajouter au panier" (when valid) or "Compléter mes choix" (when mandatory choices remain).

### D. 1-Tap GPS Delivery & Phone Confirmation
- Removed rigid 5 fixed transit routes.
- Added 1-tap GPS geolocation button (`#btnGpsLocation`) utilizing browser Geolocation API (`navigator.geolocation.getCurrentPosition()`) to attach coordinates to the order.
- Delivery address textarea is explicitly marked "confirmée par téléphone".

### E. QR Dine-in Table Ordering
- Supports URL parameter `?table=X` (e.g. `index.html?table=4`).
- Automatically displays a sticky orange banner on the hero: `🪑 Commande à la Table 4`.
- Pre-selects the "Sur place" service mode and embeds table number in the order summary and dispatch payload.

---

## 4. Current Test Suite Status (100% Green)

Run all tests via PowerShell or bash from the project root:

| Command | Suite | Checks | Status |
| :--- | :--- | :--- | :--- |
| `npm run test:i18n` | Multi-language & RTL switcher | 32 checks | ✅ PASS |
| `npm run test:storefront` | Responsive customer flow (320px–1440px) | 350 checks | ✅ PASS |
| `npm run test:customization` | Customization modal & choice rules | 116 checks | ✅ PASS |
| `npm run test:orders` | Order creation, validation & state machine | 192 checks (+56 model) | ✅ PASS |
| `npm run test:admin` | Admin dashboard, roles & policies | 216 checks (+49 model) | ✅ PASS |
| `npm run test:menu` | Menu CRUD, stock availability & categories | 140 checks (+55 model) | ✅ PASS |
| `npm run test:carousels` | Carousel ticker, touch drag & sticky bar | 205 checks | ✅ PASS |
| `npm run test:operations` | Store hours, service modes & WhatsApp flow | 100 checks | ✅ PASS |

**Total:** 1,411 automated checks passing cleanly with **0 production Firebase requests**.

---

## 5. File Structure & Core Responsibilities

```text
bigtac/
├── index.html                   # Customer storefront: hero, menu, modals, cart, checkout, tracker
├── admin.html                   # Admin & staff workspace: operations, kitchen, menu editor, team, driver
├── firebase-config.js           # Firebase app initialization (Auth, Firestore)
├── package.json                 # Test script definitions & Playwright dependency
├── assets/
│   ├── i18n.js                  # Multi-language module (FR, EN, AR) & DOM updates
│   ├── carousels.js             # Autoplay ticker, drag gesture & keyboard accessibility
│   ├── customization.js         # Stepped options, min/max validator, price calculator
│   ├── menu-model.js            # Pure business logic for menu availability & items
│   ├── operations-model.js      # Store status, hours, and service availability
│   ├── admin-model.js           # RBAC rules for admin, manager, cashier, driver
│   ├── admin-shell.js           # Admin UI container, sidebar, responsive tabs
│   ├── admin-orders.js          # Admin order cards, status transition triggers
│   ├── admin-menu.js            # Admin menu editor, category management
│   ├── admin-overview.js        # KPI cards, hourly order analytics
│   ├── storefront.css           # Storefront styling, layout, RTL overrides
│   ├── admin.css                # Admin core styles
│   ├── admin-approved.css       # Admin approved theme & component layout
│   └── admin-polish.css         # Admin micro-polish & phone ergonomics
└── tests/
    ├── i18n.mjs                 # Playwright test suite for i18n & RTL
    ├── storefront.mjs           # Storefront end-to-end responsive suite
    ├── customization-navigation.mjs # Customization sheet interaction tests
    ├── orders.mjs               # Order workflow tests
    ├── admin.mjs                # Admin management & RBAC tests
    ├── menu.mjs                 # Menu management tests
    ├── carousels.mjs            # Carousel motion & sticky nav tests
    └── operations.mjs           # Operating model tests
```

---

## 6. Guidelines & Guardrails for Codex

1. **Mobile-First Priority:**
   - Test all UI changes at `320px`, `375px/390px`, `768px`, and `1440px`.
   - Never allow horizontal window overflow (`document.documentElement.scrollWidth <= innerWidth`).
   - Check that `#langSelector`, `#btnDarkMode`, and `#btnNavCart` do not cause the store header to wrap at 320px screen width.
2. **Translation Integrity:**
   - Any new text added to the storefront or admin must be accompanied by `data-i18n` attributes and entries in `translations.fr`, `translations.en`, and `translations.ar` inside [`assets/i18n.js`](file:///C:/Users/pc/bigtac/assets/i18n.js).
   - Ensure the French fallback text matches existing Playwright test selectors (e.g. `Choisir`, `Commander maintenant`).
3. **Zero Production Writes in Tests:**
   - Always route or abort requests to `firestore.googleapis.com` and `identitytoolkit.googleapis.com` in automated tests.
4. **Firebase Security:**
   - Never weaken Firestore security rules. Client-side state and prices are untrusted; all validation must pass server-side rules.
5. **Git Hygiene:**
   - Working tree is clean on `main`. Always run `npm run test:storefront` and `npm run test:carousels` before committing.
