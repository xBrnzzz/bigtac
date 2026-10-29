# BIGTAC Admin visual redesign - verified local checkpoint

Updated: 28 October 2026. No commit, push, deployment or production data operation.

## Visual source of truth

Approved prototype: C:/Users/pc/.codex/visualizations/2026/10/28/01a17fe4-c256-7e01-bd98-b820166ffb89/bigtac-admin-preview/
Use screenshots/final/, style.css and refinement.css. No replacement design direction was introduced.

Actual application evidence: C:/Users/pc/.codex/visualizations/2026/10/28/01a17fe4-c256-7e01-bd98-b820166ffb89/production-admin-redesign/
Open comparison.html for approved/actual pairs at 1440 and 390px. current-*.png renders application source, not the prototype. visual/ contains additional widths, roles, history and drawers. Firebase is replaced with fictional fixture data for these captures.

## Completed and verified locally

- Restored missing --admin-solid-* and --admin-control compatibility tokens. Removed white-on-white selected modes, status chips and quick actions; restored input borders.
- Preserved Manrope, the approved palette, 216px light frame, rounded workspace, grouped white KPIs and subtle elevation. Added the restaurant identity tile using the existing dynamic branding hook.
- Orders: approved three-column unified ticket grid, Toutes/status tabs, status/age metadata, quantity chips, soft instruction notes, physical receipt seam and notches, aligned totals/actions and compact detail access. Existing IDs, data-order-id, transitions, rejection, retry, printing, filters, sound and history pagination remain connected.
- Kitchen/Cashier: same tickets and existing role restrictions; Kitchen retains its restricted information and hides totals. Phone layouts retain reachable actions and dedicated navigation.
- Menu: compact product rows, desktop category sidebar, horizontal phone category navigation, stock switches, preserved bulk selection and overflow operations. Existing stock/publication/order/CRUD handlers and editor IDs remain intact. Availability/refresh filters are in a disclosure; group and category editors remain accessible.
- Menu dialogs use the same 520px drawer, white header, orange active tab and control system; all editing sections remain available.
- Overview: visible page heading, grouped white metrics, hourly bar chart from the existing hourly counts, urgent action rows, recent orders and product panels. Next-order and preparation details remain in Actions rapides. All original reporting scopes and recorded-value caveats remain.
- Promotions, Team, Settings and driver areas inherit the shared tokens, form borders, typography, white panels and controls; actual application screenshots were inspected.

## Files changed in this continuation

admin.html (loads final presentation adapter); assets/admin-approved.css (shared adapter); assets/admin-shell.js (restaurant tile); assets/admin-orders.js (presentation markup and view selection); assets/admin-menu.js (presentation containers and filter disclosure); assets/admin-overview.js (presentation layout/chart type).
Tests updated for unified grid scrolling, explicit History navigation, filter disclosure and the existing disabled unassigned-driver feed. Business services, Firebase configuration, rules, schemas and customer sources were not changed by this continuation. Pre-existing working-tree changes were retained; do not reset them.

## Actual test results

- Orders: 56 model + 192 browser checks passed.
- Menu: 55 model + 136 browser checks passed; 3 upload requests mocked, no production requests.
- Operations: 42 model, 18 transaction/permission fixture, 32 browser/boundary and 8 responsive checks passed.
- Admin visual: 178 checks passed at 320/390/768/1024/1440px, including roles, contrast and reachable actions. No production Firebase requests.
- Admin: 49 model checks pass; browser suite still fails at tests/admin.mjs:120, Legacy transactional driver claim works. The preceding audit reproduced this failure with the pre-redesign styles. Phase 4 intentionally disables the unassigned feed/claim until a trusted redacted backend exists. This is not a new redesign regression. Do not re-enable claiming to satisfy that stale assertion.
- Fourteen additional desktop/mobile captures: no page errors or production Firebase requests.

Fixture checks verify local behavior and presentation, not production security, deployment or actual device behavior.

## Visual comparison and exact remaining work

The application now uses the approved frame, ticket geometry, grid, seams, soft badges, menu rows and category composition. It is not a pixel-identical copy of the demo: real components retain rejection, sound, refresh, bulk selection, product overflow, publication metadata and recorded MAD totals. Dataset counts, product names and reporting windows differ. Overview retains its real four operational measures and additional reporting panels rather than substituting demo analytics.

1. Review the saved actual/approved comparison with the owner; address any specifically rejected remaining visual differences. Keep operational controls accessible when refining their placement.
2. Update the legacy driver-claim assertions in tests/admin.mjs to the approved Phase 4 boundary; this is the remaining known red admin suite. The visual suite already checks the unavailable claim boundary correctly.
3. Test the editor, filtering and ticket actions on real iOS/Android devices, especially with the software keyboard open. Only browser responsive emulation was available here.
4. Verify with a controlled real Firebase staging environment after the separate backend release gates are satisfied. No staging or production verification is claimed here.

Do not add features or change role/order/pricing contracts to make the screenshots or old tests match. No deployment, commit or push without owner authorization.

## Focused refinement - 29 October 2026

Kept the approved design. Updated only presentation in admin-approved.css, admin-icons.js, admin-orders.js, admin-menu.js, admin-promotions.js and admin-settings-editor.js.

- Orange acceptance, solid purple preparation-complete, light-green handoff and stronger green delivery-complete actions. Existing transitions/save handlers remain unchanged; service metadata selects the visual treatment. Disabled and loading states stay neutral and readable.
- All five Orders tabs now have compact local outline icons. Promotion actions use the same icon family. Product overflow actions use aligned compact rows, hover/focus feedback and a divider separating ordering actions.
- Weekly hours now have aligned desktop columns, paired phone time inputs, labelled closed checkboxes and a cohesive fieldset. All seven days, fourteen time input names, useHours and the existing save/validation path are preserved.
- Orders 56 model + 192 browser checks, Menu 55 model + 136 browser checks, Operations 42 model + 18 service + 32 browser + 8 responsive checks and 178 admin visual checks passed. An initial operations page-load timeout cleared on retry.
- Additional presentation checks cover 320/390/768/1440px, all four action colors and hover contrast (minimum 4.77:1), disabled contrast, action counts, hours inputs, icon counts, no overflow and zero fixture writes. Screenshots render the application with fictional data; no production Firebase requests.

Evidence: C:/Users/pc/.codex/visualizations/2026/10/28/01a17fe4-c256-7e01-bd98-b820166ffb89/refinements-2026-10-29/. Orders, preparation, handoff, open product menu, Promotions and weekly hours at 1440 and 390px; complete seven-day section exports are also included. Real devices and live Firebase were not tested. No backend/logic change, commit, push or deployment.

## Control micro-polish - 29 October 2026

Kept the approved direction. Added admin-polish.css after the approved stylesheet; changed only presentation markup in admin-orders.js, admin-menu.js and admin-promotions.js. Centered the order rejection/detail buttons with matching geometry, removed hidden-label spacing from icon controls, balanced the mobile Ajouter control and introduced a clearly labelled category-management control beside horizontally scrollable chips. Promotion actions use a consistent compact layout with destructive red deletion. Category/shared-group deletion uses the same destructive treatment and trash icon. Reorder icons now point up/down in product, category, linked-group, choice and option editors. Overview quick actions have matching neutral backgrounds, font weights and icon sizes; the old fourth-child green override no longer dominates availability.

Evidence: C:/Users/pc/.codex/visualizations/2026/10/28/01a17fe4-c256-7e01-bd98-b820166ffb89/micro-polish-2026-10-29/. Application captures at 1440/390px: Orders, Menu, open overflow actions, category deletion, Promotions and Overview quick actions. Hours layout unchanged.

Focused browser review: 68 checks across 320/390/768/1440px, including icon-center measurements, directional SVG paths, destructive normal/hover treatment, matching quick-action fills, category access, no frame overflow and no fixture writes. No page errors. The existing Orders and Menu operation suites passed. Real devices and production Firebase were not used; no backend, business logic, commit, push or deployment changes.
Final verification: Operations 42 model + 18 service + 32 browser + 8 responsive checks and all 178 admin visual checks also passed. Initial page-load timeouts cleared on retry.

## Mobile Menu composition - 29 October 2026

Rebuilt the row markup into identity/action and price/availability regions, rather than enlarging the previous switch. Added non-rendering wrappers for desktop grid compatibility. Removed superseded phone product/category layout rules from admin-menu.css, admin-approved.css and admin-polish.css; one canonical phone composition now lives in admin-polish.css.

Phone rows group thumbnail/bulk checkbox, name, category, publication badge and 44px edit/overflow controls. A distinct footer has the recorded price and a 44px stock button: green Disponible or muted-red Rupture de stock, retaining role=switch, aria-checked, input IDs/data hooks and the original operation path. Added aria-busy and loading copy derived from the existing busy state. Publication is neutral/amber and stays independent from availability. Categories have a full-width scrolling strip, a labelled management action, and selected-chip visibility maintenance. Desktop/tablet grids were inspected; wrapper selectors preserve their existing placements.

Evidence: C:/Users/pc/.codex/visualizations/2026/10/28/01a17fe4-c256-7e01-bd98-b820166ffb89/mobile-menu-final-2026-10-29/. Actual application screenshots at 320/390px show available, unavailable and hidden products; taller same-width exports show all three states together. Additional captures cover selection, loading, focus, disabled and selected-category states, plus 768/1440px comparisons.

Verified: 55 Menu model + 136 Menu browser checks; 46 focused checks for responsive fit, stock changes, busy/disabled/focus states, independent publication, bulk selection, active-chip visibility and category-dialog access. Ordinary rows are about 164px high; a longer wrapped name is about 185px at 320px. Normal status-button text meets 4.5:1 contrast. Real devices and live Firebase were not used. No new features, backend/business-operation changes, commit, push or deployment.
The final broader admin visual suite also passed all 178 checks at 320/390/768/1024/1440px, with zero production Firebase requests.

## Shared ambient elevation - 29 October 2026

Presentation-only update: admin.css defines four centered, single-layer gray shadow tokens (controls 6px/.04, cards 12px/.07, hover 15px/.10, floating 22px/.12). admin.html loads admin-elevation.css as the single shared elevation policy over preserved component and legacy styles. No JavaScript or business-service sources were changed in this pass.

Decorative border colors are transparent, retaining existing dimensions. Card/control/floating tiers use the shared tokens; mobile list containers and text actions remain quiet to avoid nested elevation. Hover is restrained, 180ms, with no control/card translation or scaling. Disabled/loading controls do not gain hover elevation. Receipt dashed dividers, native checkbox/radio marks, selected-product outlines, invalid states and keyboard focus remain functional and distinct. Forced-colors support retains accessible system borders/focus. Existing colors, layouts, typography and rounded geometry remain intact.

Reviewed actual application renders at 320, 390, 768 and 1440px: Overview, Orders, Kitchen, Menu and editors/action lists, Promotions, Team, Delivery, Settings and weekly hours. Initial inspection caught excessive textarea/list-container nesting and that specificity was corrected. Final computed-style scan found zero visible decorative borders in the inspected admin views; 156 focused checks passed, including centered hover shadows, stationary controls, keyboard focus, editor control elevation and preserved receipt seams. No page errors or production Firebase requests; browsing created no fixture writes.

Regression results: 178 admin visual checks; Orders 56 model + 192 browser; Menu 55 model + 136 browser; Operations 42 model + 18 service + 32 browser + 8 responsive checks passed. One initial operations page-load timeout cleared on retry. No production or physical-device verification is claimed.

Screenshot index: C:/Users/pc/.codex/visualizations/2026/10/28/01a17fe4-c256-7e01-bd98-b820166ffb89/ambient-elevation-2026-10-29/review.html. Contains matching-width rest/hover/focus captures and additional editors, hours, Team and Delivery views. Existing uncommitted work retained. No commit, push or deployment.

## Visual separation audit — 29 October 2026

Presentation changes only: admin.css adds shared field, neutral-control and section fills; admin-elevation.css applies contextual separation and interaction states within the existing elevation policy; admin-legacy.css gives promotion option fields consistent geometry/grouping; admin-approved.css replaces the fixed mobile utility offset with a reserved row and wrapping metadata. No HTML, JavaScript, backend or business-contract changes in this pass. All preceding working-tree changes remain.

Findings beyond the supplied examples: shared-group selectors and promotion fields blended into white drawers; neutral editor/filter actions were indistinct; promotion option type/minimum/maximum controls retained cramped native geometry; mobile Kitchen utilities overlapped the first ticket when status tabs were hidden, and long metadata needed wrapping. Corrected those issues without changing the approved typography, ticket aesthetic, semantic workflow colors or shadow tokens. White fields/buttons remain white inside tinted groups, gray fields identify controls on white surfaces, editor tabs share a neutral tray, and navigation has one floating parent with quiet children. Order rejection has a restrained red fill. Native checkboxes, receipt seams, selected rows, focus/error rings and disabled/loading states remain distinct.

Evidence: C:/Users/pc/.codex/visualizations/2026/10/28/01a17fe4-c256-7e01-bd98-b820166ffb89/separation-audit-2026-10-29/review.html. Includes before/after Product Editor and mobile navigation comparisons and the full screen/viewport index. Captures use the actual local admin sources with fictional in-memory Firebase data, not the isolated design prototype. Reviewed Orders, Kitchen, Cashier, Overview and lower reporting/quick-action sections, Menu filters/actions and all product editor tabs, categories/shared groups, Promotions and option editors, Team, assigned Delivery, Settings/hours, login/access and More navigation at 320/390/768/1024/1440px. Screenshots were inspected and the promotion/Kitchen problems were refined before final capture.

Verification:
- 128 matching before/after screen/editor captures; final capture run passed 133 checks with zero page errors or fixture writes.
- 95 focused hover, keyboard-focus, selected, validation, loading and disabled-state checks passed at all five widths. The stock-loading scenario writes only to the in-memory fixture.
- 159 additional checks across 70 captures covered lower sections, assigned delivery, promotion options, expanded filters and utility/metadata bounds. No decorative borders or page overflow found in these scans; zero fixture writes or page errors.
- Menu: 55 model + 136 browser checks; Orders: 56 model + 192 browser checks; Operations: 42 model + 18 service + 32 browser + 8 responsive checks passed. Operations browser checks were repeated after the final promotion styling and passed.
- Final admin visual suite: 178 checks passed. Admin model: 49 checks passed; the admin browser suite still fails at tests/admin.mjs:120, `Legacy transactional driver claim works`, the same documented pre-existing assertion. The disabled unassigned-driver boundary was preserved.
- Initial concurrent browser runs timed out during page loading; individual reruns passed. No application logic was changed to address test timing. git diff --check passed (existing CRLF conversion warnings only).

Remaining: reconcile the stale driver-claim test with the agreed Phase 4 boundary in a separate authorized task; check real iOS/Android keyboards/native controls and a controlled Firebase staging environment when the release gates permit. Browser-native confirmation dialogs intentionally retain platform styling. These fixture checks do not establish production authorization, privacy, deployment or real-device correctness. No commit, push or deployment.

## Owner-approved Git checkpoint — 29 October 2026

The owner subsequently requested implementation and push. The prepared checkpoint contains the approved Admin redesign, mobile product composition, semantic actions and final separation fixes, plus their UI regression-test updates. The mixed admin-menu.js file was staged selectively: the earlier customization presets/templates/duplication/pricing changes and their model/customer dependencies remain local, unchanged and uncommitted. Customer sources, images, release-audit notes and the nested checkout are excluded. Historical no-commit/no-push statements above describe their respective implementation stages.

The exact staged application was exported to a temporary folder and tested independently of the working tree: Menu 55 model + 136 browser, Orders 56 model + 192 browser, Operations 42 model + 18 service + 32 browser + 8 responsive, and all 178 Admin visual checks passed. Actual staged renders were inspected; five-width screenshots are in separation-audit-2026-10-29/push-snapshot/ under the evidence directory above. The known legacy driver-claim assertion remains a separate issue. No deployment command or Firebase change is part of this checkpoint.
