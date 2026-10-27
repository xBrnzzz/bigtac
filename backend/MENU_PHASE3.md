# Phase 3 Menu Builder — development contract and release gate

This is a backward-compatible **development proposal**, implemented and exercised only through isolated fixtures. No production Firebase document, schema migration, upload preset, Rules, index or Function was accessed or deployed. The prior multi-restaurant self-service direction remains the target; the current global collections are not tenant-isolated.

## Existing data retained

- `menuItems/{id}` retains `name`, `description`, `price`, `imageUrl`, `category` (name), `order`, `isVisible`, `isPopular`, `mandatoryChoices` and `supplements`. Existing unknown top-level fields and timestamps survive updates. Historical order lines are never rewritten.
- `categories/{id}` retains `name`, `order`, `image`. Rename still updates name snapshots; deletion requires an explicit destination for products. Existing images remain untouched on a category text edit.
- Embedded choice groups retain `{title,type,min,max,options}` and extras retain `{name,price}`. `max:0` remains unlimited for checkbox groups; radio is normalized to `max:1`. Missing availability means available, missing publication means published. Invalid negative prices/configurations must be corrected explicitly before an edited product is saved; there is no silent data repair.
- Promotions keep their own embedded configurations and existing pricing. They are not migrated into shared groups in this phase.

## Proposed additive schema (not migrated)

| Location | Proposed fields / behavior |
| --- | --- |
| Product | `isAvailable:boolean` independently controls stock; `categoryId:string` is canonical when present, while the legacy `category` name remains mirrored. `modifierGroupIds:string[]` lists linked definitions in presentation order. |
| Embedded group/option | New options get stable UUID `id`; `isAvailable:false` hides an option from selection. Linked snapshots contain `sourceGroupId`. Unlinked legacy options without IDs remain readable. |
| Category | `isVisible:false` hides the category and its products without modifying each product's publication/stock flags. |
| `modifierGroups/{id}` | `title`, `kind:choice|supplements`, `type:radio|checkbox`, `min`, `max`, `options`, `productIds`. Supplements are optional checkbox groups. `productIds` is maintained with product attachments in the same transaction. |
| `settings/menuState` | Private-to-staff catalog coordination: `revision`, `nextProductOrder`, `nextCategoryOrder`, `categoryNames`, `productCategories`. Created only by an explicit successful menu mutation, never by initialization or reads. It serializes this builder's mutations, allocates distinct new positions and tracks current-builder category membership. |

The public storefront does **not** read private modifier definitions or catalog coordination data. Shared-group saves atomically rewrite the embedded snapshots of all registered linked products. Older storefronts can therefore continue rendering those configurations. Deleting a group explicitly freezes independent copies; deleting a category moves products and removes the category in one transaction. A product duplication starts unpublished and makes its configuration independent.

No one-time mass backfill is run. An edited legacy product acquires its category ID and independent stock flag through an explicit Save. Legacy names continue resolving until individually adopted. A missing canonical category fails closed in the storefront. There is no fake uncategorized category and no silently orphaned product.

## Client transaction and subscription boundaries

- Existing admin/manager UID roles only. A transaction re-reads membership, checks the current session/epoch and compares the expected document to detect stale edits. Cashier/driver menu access is not added.
- Three bounded menu subscriptions, max 301 reads per collection to detect the supported 300-record ceiling. No price/stock mutation is enabled for partial/cached product/category reads. Shared-group read failure degrades the library; legacy unlinked editing remains available where existing server permissions permit it. Listeners stop on navigation, logout and revocation.
- Product, group and category mutations use Firestore transactions, with reads before writes. Product reorder uses the complete loaded catalog, not a filtered subset. Keyboard/touch Move controls issue one save per deliberate action, with no drag-event write flood.
- Shared-group attachments update the membership list atomically. A shared edit reads the latest membership; simultaneous attaches retry against that updated group. Catalog state coordinates supported-builder creates/moves/renames. Legacy clients bypassing this coordination remain an adoption risk, not a claimed guarantee.
- Scope limits: 300 documents per menu collection, 12 shared groups per product, 20 total choice groups and 60 options per group. A shared fanout is bounded by the catalog limit; Firestore document/transaction byte limits and actual Rules access budgets must be verified in staging. No automatic chunking creates partial shared updates.
- Failed mutations retain confirmed data and draft edits; retries are explicit. Confirmation appears only after the transaction resolves. Current UID/session checks prevent a late image-upload response from saving into a revoked session.

## Customer compatibility and stock revalidation

Customer category/product reads now subscribe to changes; refresh replaces existing listeners. Category IDs resolve current names while legacy references still work. Hidden products/categories disappear; out-of-stock products stay visible with disabled ordering actions. A changed open customization sheet is dismissed with an explanation, avoiding stale selections.

Cart entries remain intact with their recorded options/totals. Checkout is blocked when a product is missing, hidden, out of stock, repriced or has removed/changed/invalid choices. The customer explicitly removes and reconfigures it; totals are not silently rewritten. New local cart entries additionally preserve choice-group selections to revalidate min/max after configuration changes. Existing independent promotion carts remain supported. Both normal checkout and WhatsApp finalization use the same client availability guard.

This is frontend UX validation. **A final write can still race a stock change, and modified clients can bypass every client check.** Trusted order creation/pricing and authorization remain required before commercial release.

## Cloudinary boundary

Reuse the existing cloud name and unsigned upload preset. No new credential or secret was added. UI accepts JPG/PNG/WebP up to 5 MiB, previews/revokes object URLs, shows upload progress, validates the returned HTTPS URL and preserves the draft on failure. Tests intercept the upload endpoint; no real image upload is performed.

Actual preset permissions, resource limits, MIME/content verification, transformations and abuse controls are **unverified**. Enforce those in Cloudinary or a trusted upload service; browser checks do not grant or restrict upload permissions. Replacing/removing a product image updates its reference only; it does not delete a potentially shared remote asset. An uploaded image can become orphaned if the subsequent document save fails; managed cleanup needs trusted infrastructure.

## Required approval and staging sequence before production adoption

1. Back up categories/products/settings; inventory legacy name collisions, missing/duplicate positions, invalid configuration, embedded negative differences and maximum catalog sizes. Stop old menu writers during adoption. Validate a restore on separate development data.
2. Review the additive contract above, tenant ownership path and migration/rollback explicitly. Global `modifierGroups` and `settings/menuState` must not be presented as a multi-tenant design.
3. Review and test the complete deployed Firestore policy in an emulator/staging project. Public reads: only intended products/categories/promotions. Staff-only coordination/groups; only verified active admin/manager writes. Test disabled/missing/forged memberships, immutable ownership and denial of cashier/driver catalog writes.
4. Enforce trusted price/type/range validation, stock/publication rules and category/shared membership invariants. Evaluate `getAfter` access budgets versus trusted callable services for large fanouts; do not deploy a permissive client-only policy to make tests pass. The Phase 2 emulator-only policy is not a production policy for this menu.
5. Verify actual SDK transaction retries/offline behavior and image preset controls. Run an end-to-end staging matrix including concurrent creates, moves, attaches and renames; indexed queries are not newly required by the bounded menu subscriptions.
6. Explicitly approve any backfill of `categoryId`/state indexes. Migrate in a reviewed, resumable job with verification and rollback, never from application initialization. Check snapshots/shared membership before enabling multiple staff writers.
7. Roll back the application and restore from the verified backup if acceptance fails. Do not delete additive fields/groups on rollback; old clients still consume snapshots. Freeze new writers until state/membership are reconciled.

## Verification limits

`npm run test:menu` runs pure contracts and Playwright against an in-memory Firebase replacement. The fixture independently denies unauthorized catalog roles, simulates transaction contention/failures and never imports the Firebase SDK. Browser routes block production Firebase and mock Cloudinary. These tests are **not** a real Firestore Rules/emulator certification. The Firebase CLI/emulators are not installed/configured in this workspace; no dependencies are installed as part of this task. Real-device virtual keyboards and real backend limits remain unverified.
