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
- Category chips scroll horizontally on mobile and may stick beneath the header only inside the menu boundary. Search remains in normal flow.
- Keep menu navigation targets clear of sticky chips and preserve visible cart actions.
- Continue the rounded, energetic food-ordering direction, strong heading system, warm offer band, charcoal favourites and compact catalogue spacing. Refine composition without changing product imagery or rebuilding the page.
- Use native layout/stickiness and immediate category navigation to avoid unnecessary motion and layout jumps.

## Verification and scope

- Verify hierarchy, hero target, search, selected category state, sticky boundaries and cart at 390px and 1440px with isolated local fixtures and screenshots.
- Preserve Firebase, admin, customization and checkout business logic; do not access production data.
- Leave changes uncommitted until explicitly requested.
