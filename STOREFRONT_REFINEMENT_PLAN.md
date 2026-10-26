# Storefront refinement plan

## Product imagery

- Repeated tacos images are intentional placeholder/demo content; retain them.
- Preserve existing product/category image URLs and fallbacks. Do not source replacements.
- Restaurant owners will eventually upload their own product images through Eon Agency's self-service restaurant website builder. Keep the storefront reusable and configurable; no builder/backend implementation is included in this refinement.

## Approved page hierarchy

1. Hero, with the primary action linking directly to the full menu.
2. Promotions — Les Bons Plans.
3. Best sellers — Les Incontournables.
4. Full menu — Notre Carte: heading, search, horizontal category filters, listings and desktop basket.
5. Restaurant information.
6. Footer.

## Interaction and design priorities

- Search and filters affect only the full menu; featured sections remain independent.
- Search and horizontally scrollable category chips stick together beneath the header only inside the menu boundary; scrollbars stay visually hidden with padded focus/touch targets.
- Keep menu navigation targets clear of sticky chips and preserve visible cart actions.
- Retain the rounded food-ordering direction, heading system, hero composition and section order. Coordinate orange actions, warm cream surfaces, borders and radii through CSS tokens; avoid an unnecessary dark favourites block in the light theme.
- Offers and favourites use native horizontal carousels, original cards only, with gentle bidirectional autoplay when overflowing, pause controls, manual swiping/dragging, and keyboard navigation. Pause on interaction, focus, hover, hidden pages and open dialogs. Disable autoplay for reduced motion, zero/single items or fully visible rails.
- Use native layout/stickiness and immediate category navigation to avoid unnecessary layout jumps.

## Verification and scope

- Verify hierarchy, hero target, search, selected category state, sticky boundaries, carousel behaviour and cart at 320px, 390px, 768px and 1440px with isolated local fixtures and screenshots.
- Preserve Firebase, admin, customization and checkout business logic; do not access production data.
- Commit and push only when explicitly requested for the current refinement.
