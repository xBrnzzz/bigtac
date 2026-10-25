# Visual and accessibility review

Direction: The name as a monument, seed 402905904. No redraw. Existing brand orange/black and Outfit retained; existing script face stays only in the untouched contact section. Requested ordering cards take precedence over the dealt programme table. No new footage or large motion layer: the brief prioritizes fast ordering and restrained effects.

## ROUND 0 — before
Seen in one second: repeated floating logos over a dark sign.
Idea (one sentence): BIGTAC's sign is obscured by an unrelated stack of badges and claims.
Live thing: existing category filter and ordering chooser.
Layout words by section: hero=centred stack / popular=carousel / menu=boxed grid / contact=split.
Scores: design 4.5 · usability 5 · creativity 4 · content 5 → overall 4.6
Caps applied: inspector FAIL, three-line headline, decorative shadows.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. before/mobile-fold.jpg: logo and headline dominate the whole first screen; remove repetition and shorten to the name.
2. before/tablet-fold.jpg: navigation wraps and crowds the logo; simplify links and actions.
3. before/mobile-page-01.jpg: large rounded cards and tiny price labels slow browsing; use compact mobile rows, legible type and real chooser buttons.

## ROUND 1
Seen in one second: a grilled taco followed by the large orange BIGTAC name.
Idea (one sentence): BIGTAC's Fès sign becomes a large menu-board signature under French tacos.
Live thing: category filtering and existing product choice/cart.
Layout words by section: hero=photo plus monument / popular=carousel / menu=photo grid or mobile list / contact=split.
Scores: design 7.5 · usability 7.5 · creativity 7 · content 7 → overall 7.4, capped 6.0
Caps applied: whole-page inspector FAIL in untouched sections.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. after-round1/mobile-page-01.jpg: category labels are partially cut off; wrap complete categories into two mobile columns with bounded vertical scrolling for large menus.
2. after-round1/desktop-fold.jpg: hero meets the viewport bottom too tightly; reduce photo height modestly.
3. after-round1/tablet-fold.jpg: supporting copy is too small beside the name; raise its minimum to 18px.

## ROUND 2 — final
Seen in one second: food, orange and the BIGTAC name.
Idea (one sentence): BIGTAC's Fès sign becomes a large menu-board signature under French tacos.
Live thing: category filtering and existing product choice/cart, with keyboard-accessible chooser buttons.
Layout words by section: hero=photo plus monument / popular=carousel / menu=photo grid or mobile list / contact=split.
Scores: design 7.8 · usability 8 · creativity 7 · content 7 → overall 7.6, capped 6.0 for the whole page
Caps applied: remaining whole-page inspector FAIL in inherited sections; this is a four-area patch, not a full-page redesign.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. after/desktop-page-02.jpg: existing contact cards/glows/typography disagree with the new storefront. Future task: restyle contact/footer within the same tokens.
2. after/mobile-page-01.jpg: WhatsApp text remains white on bright green (2:1). Future task: use dark text or a darker green.
3. after/desktop-page-01.jpg: one popular fixture card leaves a large blank area; actual live menu density is unverified. Revisit featured section layout after reviewing restaurant-owned menu content.

All seven final inspector screenshots, including tablet and mobile sheets, were opened and reviewed. Additional desktop/mobile light and dark hero/menu PNGs were reviewed. Final inspector: 7 FAIL, 7 WARN (before: 13 FAIL, 9 WARN). Main headline is now one line at 1440, 768 and 390; new header/cards/category navigation carry no resting shadows, outlines or glows. Full-page failures remain in the inherited contact/footer/featured section, plus a global margin heuristic caused by those original wrappers. No findings were suppressed or hidden. New stylesheet lint: 0 FAIL, 0 WARN. The whole HTML still contains inherited lint findings outside this patch.

## Web Interface Guidelines

Reviewed against https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md (fetched 2026-10-25).

Changed UI: native links/buttons, keyboard product selection, labels and decorative icon hiding, visible focus, 44px controls, category aria-pressed states, image dimensions, lazy product images, high-priority hero, search name/autocomplete, long-text wrapping and reduced-motion support checked. No accessibility certification is claimed.

Inherited findings outside scope:
- index.html:300 - WhatsApp button text contrast 2:1.
- index.html:391 - product-dialog close button removes outline without a replacement.
- index.html:269 - contact cards retain blur and decorative outlines.

## Verification

41 Playwright CLI checks passed against a local synthetic menu. Viewports: 320, 375, 390, 768, 1440, each light/dark. Verified no horizontal page overflow, complete hero title in first screen, header/category/chooser buttons >=44px, category visibility and pressed state, search/clear, keyboard chooser opening the existing modal, adding to cart, header cart entry, theme toggle, reduced motion and zero JS runtime errors. No production Firebase requests. Fixture order submission is explicitly disabled.

Inline JavaScript syntax and git diff whitespace checks passed. Compared the original and edited source from window.openItemModal onward: product customization, cart, checkout and order code are unchanged. admin.html and firebase-config.js have no changes.

Unverified: real iOS/Android hardware, live menu/images/density, Firebase permissions and successful order submission. No production data read/write, installs, commits, pushes or deployment.

## Assets

assets/tacos-hero.jpg: AI-generated illustrative French tacos image, compressed JPEG (~356 KB); replace with restaurant-owned food photography when available. It is used only in the shipped hero. Existing product image URLs/fallbacks and original logo are retained. No found/bundled stock photos, footage, generated drawings or new third-party licenses. Synthetic product names/prices and repeated taco images exist only in preview-server.mjs and screenshots; they never enter the shipped application.

Shipped files: index.html, assets/storefront.css, assets/tacos-hero.jpg. .taste-skill and .playwright-cli contain local QA fixtures, notes, measurements and screenshots.
