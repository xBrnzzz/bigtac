# BIGTAC Admin 2.0 status

## Current refinement — depth, contrast and operational space (27 October 2026)

Owner brief `1e80d627-9fbc-4c68-b1c7-5a335ed9c0e9` supersedes prior card/header styling. Follow-up explicitly requests token-efficient finishing, commit and push; no deployment. Prior reference recreation was committed as `49018d8`.

- Shared surfaces: #F0F3F7 workspace, #172033 primary text, #475569 secondary text, stronger essential-control borders, distinct panel/card elevation tokens. KPIs have richer coordinated tints, larger bold values, aligned labels and 42px bordered icon wells (32px on mobile), without hover behavior suggesting noninteractive metrics are buttons.
- Orders: one operational toolbar for Service/Cuisine, search, filters, sound and refresh; synchronization, timezone and displayed counts share a compact metadata line. The duplicate page heading is visually hidden, retaining accessible semantics; the global page title remains visible. Phone sound/refresh controls use labeled 44px icon buttons and pressed-state feedback; queue switching and search remain available.
- Tickets: slim status-colored edges replace large colored header bands, larger order IDs, compact service badges, stronger product names, readable modifiers, tinted instructions and dominant existing actions. Kitchen drops its forced 420px minimum and uses filled preparation actions. No item information or permitted action was removed.
- Overview: the hourly chart is 180px when populated, with natural panel height. Zero orders render a compact explanatory state without a chart; useful operations/quick actions move above it on desktop. No fake activity or financial data. Other reporting periods and all-date queue labels remain explicit.
- Timing presentation: the previous implicit 20-minute reference is disabled by default. Staff may explicitly choose/persist 0–240 minutes locally; 0 disables warnings. Missing/future timestamps remain neutral, and active records at least 24 hours old do not become warning badges. The 24-hour plausibility cutoff is a UI safeguard, not a verified business SLA or trusted timestamp guarantee. Real statuses, transactions, payment logic, backend permissions and timestamps are unchanged.

### Measurements (CSS pixels, populated fixture)

| Viewport | Orders header before → after (workspace top to board) | Board y before → after | Recovered |
| --- | --- | --- | --- |
| 1440×1000 | 204.7 → 102 | 280.7 → 178 | 102.7px |
| 1535×1000 | 204.7 → 102 | 280.7 → 178 | 102.7px |
| 390×844 | 281.5 → 224 | 341.5 → 284 | 57.5px |

The desktop board measurement is the status-header container; the first tickets begin around y=260 after the retained status header. The starting implementation was already more compact than the brief's approximate y=340 baseline. At 1440px, the first ticket height also fell from 440.7 to 397.7px; no smaller product text was used to gain this space. Mobile keeps independent queue navigation rather than four squeezed columns.

### Verification

Already-started checks completed; no repeated full regression cycle was added after the token-efficient steering. Results: `test:orders` **56 model + 192 browser**, `test:admin` **49 model + 216 browser**, existing `admin-visual.mjs` **177**, new `admin-depth.mjs` **57** = **747 checks passed**. Focused timing tests cover explicit/disabled thresholds, very old, missing and future timestamps, live timer updates without reads/focus loss. Browser checks cover existing transitions, details/receipts, search/filters, sound, refresh/realtime, roles, dialogs, touch targets, contrast and overflow. Local fixtures only: zero production Firebase requests/writes. No real uploads, dependencies, schema or configuration changes. Customer storefront/menu suites were not rerun; their implementation was not changed.

Final visual verification captured Overview/Orders, populated and empty, at **1440×1000 and 390×844**. Earlier measurement captures additionally cover 320, 768 and 1535px. Actual final captures and provided-reference/before/final comparison boards were opened and visually inspected; the previously supplied DineLink/Streak House files remained accessible. No new reference images accompanied this brief, so no claim is made about unseen images. Typography, depth and density were compared while retaining BIGTAC's dark sidebar and real four-status workflow. The latest written request for slim accents supersedes the older reference's large solid ticket bands.

Artifacts: `C:\Users\pc\.codex\visualizations\2026\10\27\bigtac-admin-depth`. Native final files: `final-{overview,orders}-{populated,empty}-{1440,390}.png`. Comparison boards: `comparison-overview.png`, `comparison-orders.png` (self-contained HTML copies). Before/after geometry: `before-measurements.json`, `after-measurements.json`.

Modified files: `assets/admin.css`, `assets/admin-orders.css`, `assets/admin-orders.js`, `assets/admin-orders-model.js` (display age only), `assets/admin-overview.js`, `tests/orders.mjs`, `tests/orders-model.mjs`, new `tests/admin-depth.mjs`, `TASK_STATUS.md`. Syntax/diff checks pass. Existing unrelated changes to `assets/snack.png`, `assets/tacos-hero.jpg`, and `bigtac-2/` remain excluded.

Remaining: physical-device checks and existing backend/tenant/pricing/authorization release gates are unverified. Sparse product lists retain natural heights; unsupported mockup table modules, SLA progress and verified revenue remain excluded. No deployment or production operation performed. Earlier sections below are historical checkpoints.

## Current task — supplied image recreation (27 October 2026)

The latest owner brief is `35ec2058-38d3-4c34-be9d-4d60e5a17728/Pasted text.txt`, with the DineLink Overview and Streak House Kitchen images as the visual targets. It supersedes the earlier three-reference visual checkpoint below. That checkpoint was committed and pushed as `081b600`; its descriptions of uncommitted files are historical. **Git follow-up: the owner explicitly authorized committing and pushing this refinement. Deployment remains unauthorized. Earlier no-commit statements below describe the implementation checkpoint.**

Implemented scope:
- Shared shell: 208px charcoal sidebar (#191E28), orange active navigation, white 76px desktop header, existing staff identity/profile access, lighter neutral workspace (#F3F4F4), more restrained shadows and 14px shared card radius. Desktop navigation remains visible at 1024px; bottom navigation remains below 1000px.
- Overview: remove the repeated large page banner, put the real reporting date/timezone beneath the header title, retain four lightly tinted KPIs and meaningful small icons, use a balanced chart/operations row and product-list/recent-orders lower row. Preserve quick actions, 7-day reporting, service breakdown, genuine oldest pending order and financial limitations. Orange line/area charts connect actual hourly/daily counts with integer axes; no smoothed or manufactured data points.
- Add a four-row recent-order presentation using the already loaded bounded 7-day data, recorded IDs, service types, item snapshots, times, states and totals. No new query, collection or write. Queue links retain keyboard and modified-click behavior. Mobile/tablet omit the dense item-summary column; order detail remains available in Orders.
- Orders/Service: preserve the four-status board, filtering, search, counters, timers, notifications, history and transactional actions. Tickets now use the second image's full-width colored header, round outline icon, visible ID, service label, reception-time row, separated products/options, notes, total and real next action.
- Kitchen: three ticket columns on large desktops, two on tablet, full-width single cards on mobile. Warm amber preparation headers, clean outlined actions and consistent ticket spacing. Preserve contact privacy and genuine preparation actions. No fake Start/Pause timer, progress bar, SLA or delayed state.
- Menu, Promotions, Team, Delivery and Settings retain existing workflows and inherit the same shared shell, surfaces, borders and heading weights; remove unrelated accent borders rather than layering more overrides.

Modified files: `assets/admin.css`, `assets/admin-shell.js`, `assets/admin-icons.js`, `assets/admin-overview.js`, `assets/admin-orders.css`, `assets/admin-orders.js`, `assets/admin-menu.css`, `assets/admin-legacy.css`, `tests/admin.mjs`, new `tests/admin-reference.mjs`, `ADMIN_REDESIGN_SPEC.md`, `TASK_STATUS.md`. No customer/storefront, Firebase configuration, model/service, schema or production data changes. Pre-existing changes to `assets/snack.png`, `assets/tacos-hero.jpg` and `bigtac-2/` remain untouched.

### Current-task verification — complete in safe local fixtures

**924 focused checks passed:** admin 49 model + 216 browser; orders 54 model + 192 browser; menu 51 model + 136 browser; shared visual/role review 177; new reference-size/recents/ticket review 49. The admin browser total changes by two because 1024px now uses the desktop sidebar/profile rather than the mobile secondary-menu checks. No assertions about order rules or permissions were removed. A parallel navigation timeout passed on a serial menu rerun.

No production Firebase requests in fixture suites; all three upload requests mocked. Checked stock/editor saves, required/optional modifiers, stale/concurrent changes, role boundaries/revocation, pending/error/retry behavior, queue transitions, filtering, sound opt-in, timer updates, bounded history, contact privacy, drawers, receipts, keyboard focus, no horizontal overflow, contrast, integer chart axes, recent-order navigation/HTML escaping and full-width mobile tickets. Current customer storefront/backend/model/service files have no diff from the committed checkpoint; customer suites were not rerun for this admin-only refinement. Syntax and diff checks pass. No dependencies installed.

Final visual capture widths: 320, 390, 768, 1024, 1440, plus reference-size 1024×1024 and 1920×1254. Existing regressions also exercise 375 and 900px. Reference-size before captures serve committed HEAD assets from Git in the isolated fixture server without resetting the checkout; before/after use the same fixed fictional clock and order dataset.

Screenshot root: `C:\Users\pc\.codex\visualizations\2026\10\27\bigtac-admin-pixel-reference`.
- Exact-size native captures: `after-reference-overview-1024x1024.png`, `after-reference-orders-1920x1254.png`, `after-reference-kitchen-1920x1254.png`, plus each screen at `390x844` and `768x1024` and matching `before-reference-*` captures.
- Side-by-side supplied reference / before / after: `comparison-overview.png` and `comparison-kitchen.png`, with self-contained HTML copies.
- Other modules/roles: `after-{overview,orders,kitchen,detail,menu,promotions,drivers,settings}-{320,390,768,1024,1440}.png`, lower Overview, loaded-history and driver/cashier/manager captures.
- Final review: `visual-review.txt`; `inspection-overview/report.json` (0 FAIL, 2 WARN) and `inspection-orders/report.json` (0 FAIL, 1 WARN). Every generated inspector fold/page screenshot was opened. Source lint has no failures; warnings concern reference-directed subtle surface shadows, blur/monospace disabling adapters and unavailable-value dashes. Browser warnings concern small secondary metadata and intentionally natural product-list heights when only two products exist. Reference ticket circles and semantic purple are explicit allowances.

Remaining visual differences are deliberate: BIGTAC branding/French text and existing font, no outer mockup frame, shared dark sidebar, real supported modules instead of table/guest widgets, actual values instead of invented trends, and reception-age badges instead of fake cooking timers/progress. Overview's product list may be shorter than the recent-order table with sparse data. Physical iOS/Android testing and the existing backend/schema/tenant/pricing/authorization release gates remain unverified. No further phase started; no commit, push, deployment, production read/write or migration performed for this task.

Earlier phase reports below are historical context.

Latest Git authorization: the owner explicitly requested commit and push of the visual refinement and its preserved Phase 3 development checkpoint. The no-commit statements below describe the earlier implementation checkpoint. Backend/schema adoption gates remain open; no deployment or production migration is authorized by this Git request. Unrelated image changes and `bigtac-2/` remain excluded.

Current checkpoint: **Reference-led admin visual transformation — complete in isolated fixtures**. The owner supplied three new desktop POS references while Phase 3 verification was in progress. That Phase 3 work is preserved as an uncommitted development checkpoint; no further customer storefront or data-model edits were made for the visual pass. Phase 4 has not started. No commit, push, deployment or production Firebase access.

- [x] Audit repository, roles, workflows and data dependencies.
- [x] Document architecture, reporting definitions, risks and phase gates in ADMIN_REDESIGN_SPEC.md.
- [x] Add isolated Firebase fixtures and capture baseline renders.
- [x] Implement shared tokens, responsive shell and role-aware navigation.
- [x] Implement fail-closed profile handling and read-only bounded Overview.
- [x] Verify existing screens, role boundaries, metrics and responsive layouts.
- [x] Inspect screenshots and run accessibility/design review.
- [x] Prepare Phase 1 handoff and stop before Phase 2.

Preserved pre-existing unrelated changes to assets/snack.png, assets/tacos-hero.jpg and bigtac-2/. Owner approved using written design direction without the reference images. Live Rules, trusted prices, payment records and production provisioning are unverified and require a separate release gate.

## Phase 1 validation

- `npm run test:admin`: 49 pure policy/reporting checks + 218 browser checks passed.
- Existing storefront suites: 350 ordering + 205 carousel/sticky + 148 customization checks passed.
- Total: **970 checks; zero production Firebase requests in fixture suites**. No new dependencies installed.
- Widths: 320, 375, 390, 768, 900, 1024, 1440px. Navigation, queue tabs, editor access/focus/Save visibility, category/promotion/team screens, fixture product save, cashier update, driver claim/completion, role downgrade/revocation/logout, missing/disabled/unknown/cached/pending/error profiles, truncation, cache, failures/retry and settings confirmation tested.
- Taste app inspection: 0 failures; tablet metadata-size warning documented in ADMIN_REDESIGN_SPEC.md. Web Interface Guidelines review completed for the new shell/Overview and shared editor adapters. Real devices and deployed backend enforcement remain untested.
- Screenshots: `C:\Users\pc\.codex\visualizations\2026\10\26\bigtac-admin-phase1` (before/after at all widths, lower Overview, editors, driver views, empty/error/missing-config states).

## Phase 1 changed files

`admin.html`, `package.json`; new `assets/admin.css`, `assets/admin-shell.js`, `assets/admin-model.js`, `assets/admin-overview.js`, `assets/admin-charts.js`; `tests/admin.mjs`, `tests/admin-model.mjs`, `tests/fixtures/admin-server.mjs`, `tests/fixtures/admin-firebase.js`; `ADMIN_REDESIGN_SPEC.md`, `TASK_STATUS.md`.

## Next review gate

Phase 1 and Phase 2 continuation were approved. Review Phase 2 before Phase 3. Before any deployment, reconcile legitimate staff UID profiles and verify server authorization/Rules in staging or emulators. Client guards do not secure the database. Remaining catalog/team template injection, trusted prices, Team history and full backend lifecycle authorization remain release gates.

## Phase 2 milestones

- [x] A — Order cards, kitchen presentation, private/accessible detail drawer and printable receipt (fixture implementation).
- [x] B — Single-column mobile queues and deliberate tablet/desktop board layouts; seven-width browser pass completed.
- [x] C — New-order notification deduplication, opt-in sound, timers, search/filtering and bounded/paginated history.
- [x] D — Pending/failure/retry states, duplicate prevention, transactional stale-state checks, independent fixture permission tests and test-only backend policy proposal. Emulator Rules verification remains pending.
- [x] E — Regression, visual/accessibility review, screenshots and handoff; stopped before Phase 3.

Verified Phase 2 audit: `CC.html` is a menu uploader, not a cashier workspace. No supported counter-order entry or payment ledger was found. Cashiers retain their existing order actions; no counter-order creation/payment simulation will be invented. Existing status path stays pending → confirmed → en_livraison → delivered, with pending → rejected. For takeaway/dine-in, en_livraison will be described as ready for handoff without changing persisted states. Legacy `ready` records remain readable as historical records; no new transitions to that state are introduced.

Safety decisions: staff transitions change only the existing status field, with fresh profile/status checks in a transaction; timestamps are displayed only where already recorded. A clearly labeled browser-local age reference (20 minutes, adjustable) can highlight time since reception, not unrecorded kitchen preparation time. Missing lifecycle/payment fields are documented before any schema proposal. Firestore Rules/Functions are not deployed or merged into production configuration.

Additional narrow reliability fixes: closure cancellations check the current pending state per order, preserving concurrently accepted orders; driver claim/completion check active delivery state/ownership and current role. Existing driver fields are retained, customer text is escaped, and completion wording does not imply verified cash collection.

## Phase 2 validation and handoff

- `npm run test:orders`: **54 model + 192 browser checks passed**. Includes all seven widths, choices/instructions, drawers, keyboard dismissal, private kitchen/cashier views, new-order audio/visual deduplication, pending locks, retry, competing transitions, clock/timer performance and focus preservation, escaped customer input, recorded receipt amounts, offline blocking, bounded queries, pagination/date filtering, read-error recovery, truncation, permission revocation, closure race and invalid driver actions.
- `npm run test:admin`: **49 + 218 passed**, preserving Phase 1 Overview, navigation, editors, existing fixture saves and driver operations.
- Existing customer suites: **350 + 205 + 148 passed**. Customer storefront/checkout code was not modified.
- **1,216 checks passed; zero production Firebase requests in fixture suites.** Syntax and diff checks pass. No new dependencies installed.
- `node tests/orders-rules-emulator.mjs`: **SKIPPED**, no configured local Firestore emulator/Firebase CLI. This is not a Rules verification pass. The independent in-memory permission fixture is not a substitute for the real Rules engine or SDK integration tests.
- Taste source lint: 0 failures, 0 warnings. Render inspection: 0 failures, 2 documented warnings (12px metadata in dense queues and the existing shared bottom-navigation label inset). Primary text/actions remain readable; touch actions are at least 44px. Reviewed desktop/mobile/tablet captures and native drawer/print states. Real devices remain unverified.
- Screenshots: `C:\Users\pc\.codex\visualizations\2026\10\26\bigtac-admin-phase2`: `orders-{320,375,390,768,900,1024,1440}.png`, `order-detail-{390,768,1440}.png`, `kitchen-{390,768,1440}.png`; the print screenshot also exercises literal hostile test strings intentionally.

Changed files: `admin.html`, `assets/admin.css`, new `assets/admin-orders.js`, `assets/admin-orders.css`, `assets/admin-orders-model.js`, `assets/admin-orders-service.js`; `package.json`, `tests/fixtures/admin-firebase.js`, new `tests/orders.mjs`, `tests/orders-model.mjs`, `tests/orders-rules-emulator.mjs`; `ADMIN_REDESIGN_SPEC.md`, `TASK_STATUS.md`; new `backend/ORDERS_PHASE2.md`, `backend/order-operations.firestore.rules`, `backend/order-indexes.example.json`, `backend/emulator/firebase.json`.

Remaining gates: stage/emulator validation and approved integration of the test-only staff Rules policy; history index provisioning; trusted prices/payment ledger; document-level customer privacy; actual SDK offline/reconnect behavior and real phones. Search is scoped to loaded records, history defaults to seven days and pages of 30, active display caps at 200 with a visible partial-queue warning. Order age uses an explicit local reference, not measured kitchen duration. Store closure remains a multi-operation process with explicit partial-failure feedback.

Ready for Phase 3 Menu Builder planning/review; do not start automatically. Keep the pre-existing image changes and `bigtac-2/` outside this task's work. No schema migration, index deployment, Rules deployment or Cloud Function deployment was performed.

## Phase 1 & 2 visual refinement — 2026-10-27

- Preserved the existing framed shell and Plus Jakarta Sans; no new redesign direction, permission, metric or workflow. The owner’s explicit semantic-color brief supersedes the design skill’s neutral-only defaults.
- Centralized gray workspace/sidebar, white panels, BIGTAC orange, blue preparation, green completion, amber attention, teal handoff, purple delivery and red error tokens. Brand orange remains #EA580C; filled orange controls use a darker shade for readable white text. Secondary ink is slightly darker than the suggested gray to retain contrast on tinted surfaces. Existing admin is light-only; no dark-theme feature added.
- Added a small shared local outline SVG set (no added dependency) across navigation, KPI labels, headings, service/status badges, quick actions, search, filters, notifications, drawers and primary actions. Important actions retain text and decorative SVGs are hidden from assistive technology.
- Split the nested white KPI strip into coordinated tinted metrics; gave operational attention and quick actions distinct surfaces; coordinated chart colors, reduced empty ranking-panel space, and kept reporting periods/payment limitations visible. Values and reporting calculations are unchanged.
- Owners/managers get clearer priorities and navigation; cashiers get identifiable queues, recorded totals and existing actions; kitchen keeps larger product/option text, highlighted instructions and one next action without contact details. Driver permissions and delivery workflow are preserved, including existing mobile navigation.
- Tinted Kanban headers/counters and mobile status chips consistently identify waiting, preparation, handoff and completion. Local reception-age references use amber, reserving red for failures. Existing bounded queries, transactions, new-order deduplication/audio opt-in, filters, pagination, printing and role guards remain intact.
- Verification: **619 focused checks passed**: 49 admin model + 218 admin browser + 54 order model + 192 order browser + 106 new visual/accessibility checks. Tested at 320, 390, 768 and 1440px (existing regression suites also cover 375, 900 and 1024). Checked no horizontal page overflow, semantic text contrast >=4.5:1 in tested metrics/statuses/actions, keyboard action access within queues, drawer footer visibility/dismissal, role boundaries, transactions/retries, modifiers, totals, notifications, safe fixture writes and zero production Firebase requests. Syntax and diff checks pass.
- Initial final reruns hit intermittent public CDN navigation timeouts. The fixture server now optionally reads an external local asset-cache manifest via BIGTAC_ADMIN_ASSET_CACHE; existing UI libraries/fonts were cached outside Git for successful isolated reruns. No dependencies installed and no production asset/config changes. Run visual coverage with BIGTAC_VISUAL_SCREENSHOTS pointing outside the repository, then `node tests/admin-visual.mjs`.
- Taste source lint: 0 failures, 6 explainable warnings (requested blue, disabled backdrop effects matched as blur, floating toast shadow, clock formatting and missing-value dashes). Render inspections: 0 failures, 3 warnings per screen; stronger accent edges/amber attention follow this brief, secondary 11–12px metadata and axis labels preserve operational density, and the bottom-nav label inset is intentional. Purple delivery is explicitly allowed by the brief. No measured low-contrast text, gradients, glows or page overflow. Web Interface Guidelines review completed; focused keyboard/contrast checks added.
- Before/after screenshots and lower Overview/detail captures: `C:\Users\pc\.codex\visualizations\2026\10\27\bigtac-admin-refinement`. Files include `{before,after}-{overview,orders,kitchen,detail}-{320,390,768,1440}.png` and `after-overview-lower-{320,390,768,1440}.png`. Actual desktop, mobile, tablet, detail and lower-panel renders were visually reviewed.
- Modified: `admin.html`, `assets/admin.css`, `assets/admin-shell.js`, `assets/admin-overview.js`, `assets/admin-orders.css`, `assets/admin-orders.js`; new `assets/admin-icons.js`, `tests/admin-visual.mjs`; `tests/fixtures/admin-server.mjs`, `TASK_STATUS.md`.
- Remaining: physical-device verification and the existing Phase 2 backend/emulator release gates. Long order cards scroll within the queue on small screens; keyboard focus brings actions fully into view. Customer storefront, Firebase configuration, Rules, schemas and production data unchanged. Unrelated local image changes and bigtac-2 remain excluded. No deployment or Phase 3 work.

## Phase 3 checkpoints

- [x] Milestone A — Menu workspace, search/category/state filters, explicit stock versus publication, pending/failure feedback and responsive rows. Initial six-width isolated browser pass; real Cloudinary/Firebase are blocked or mocked.
- [x] Milestone B — Product sections, strict prices and choices, independent unpublished duplication, image preview/validation/progress, conflict feedback and sticky Save. Initial create/edit/duplicate/upload-mock tests passed.
- [x] Milestone C — Category rename/move/delete and ordering; shared choice/supplement library, attach/copy/detach and atomic propagation/freeze on deletion. Initial two-product propagation and no-orphan tests passed. Development schema proposals are not production migrations.
- [ ] Milestone D release gate — local preview, live availability/cart revalidation and expanded client regressions are implemented/tested; schema adoption review, actual SDK/Rules staging and real-device verification remain pending. Production migration is not approved or performed.

Initial Phase 3 evidence: 51 pure configuration checks + 111 browser checks passed. Existing storefront ordering suite: 350 passed after live menu integration. Further tests and exact final results will be recorded below. Existing unrelated images/bigtac-2 remain untouched. Do not commit, push, deploy or start Phase 4 automatically.

## Reference-led visual transformation — 2026-10-27

The latest attached visual brief is the current design authority. Image 2 guides the dark-sidebar Overview composition; image 3 guides status headers, accent edges and ordering hierarchy. The user explicitly requests tinted icon containers and a dark #182331 sidebar, superseding the earlier neutral-only design/skill assumptions. Image 1 contributes hierarchy and operational emphasis only; its fictional financial numbers, unimplemented modules, glows and emoji were not copied.

- [x] A — Shared palette, typography and shell: #F3F6FA workspace, white rounded surfaces, dark sidebar, light outline icons, accessible orange active navigation, distinct staff profile panel, existing restaurant-open status and working profile access.
- [x] B — Overview: expressive KPI icons, stronger metric typography, compact chart/quick-action composition, operational counters plus a genuine next pending order, real ranked quantities and coordinated charts. No invented trends, revenue, payment status, search module or extra navigation.
- [x] C — Orders/Kitchen: tinted queue headers, circular counters, orange/blue/teal/green card accents, strong order IDs/totals, concise modifier presentation, visible notes, readable next actions and unchanged status transitions. Local reception-age references stay amber; no invented preparation-delay timestamps.
- [x] D — Consistency: preserve the Phase 3 Menu Builder, restyle legacy Promotions/Staff/Settings/Delivery using scoped adapters, adapt Staff rows to mobile cards, retain driver-specific navigation and improve touch actions. No role or backend permissions added.
- [x] E — Final responsive captures, visual inspection, role checks and focused regressions completed (evidence below).

Reference comparison after actual screenshot inspection: dark/light separation, orange navigation, KPI icon tiles and the chart-left/attention-right composition now follow the references. The quick-action panel was shortened after the first render; sidebar active-icon contrast and crowded integer chart ticks were corrected. The attention panel spans the two left panels on desktop; tablet attention becomes a full-width operational summary, and mobile prioritizes that summary. Lower widgets retain their natural data-driven heights instead of adding empty white space. Sparse chart bars reflect fixture order timestamps; no extra counts were manufactured to fill a graph. Financial/payment limitations remain visible.

Visual-pass modified files: `admin.html`, `assets/admin.css`, new `assets/admin-legacy.css`, `assets/admin-shell.js`, `assets/admin-overview.js`, `assets/admin-orders.css`, `assets/admin-charts.js`, `tests/admin-visual.mjs`, `ADMIN_REDESIGN_SPEC.md`, `TASK_STATUS.md`.

Preserved earlier Phase 3 files remain uncommitted: `assets/admin-menu.js`, `assets/admin-menu.css`, `assets/admin-menu-service.js`, `assets/menu-model.js`, `assets/customization.js`, `assets/storefront.css`, `index.html`, `package.json`, `tests/menu.mjs`, `tests/menu-model.mjs`, `tests/admin.mjs`, `tests/fixtures/admin-firebase.js`, `tests/fixtures/firebase.js`, `backend/MENU_PHASE3.md`, plus the Phase 3 integration portions of `admin.html`/shell/status. Hashes of the storefront, customization/model and menu service were recorded before the visual pass and verified unchanged afterward. No schema, coordination field, fixture order contract, pricing or checkout change was introduced for styling.

Earlier Phase 3 expanded regression now passes **51 pure + 136 browser checks**, including bulk stock/publication/moves, unique ordering under simultaneous creates, shared-group concurrent attachment, stale editor refusal, upload failure/retry, cache/read/cap handling and historical-order preservation. Those are isolated fixture tests, not server authorization certification. The development contract/release approval/staging work in `backend/MENU_PHASE3.md` is still outstanding; Phase 3 is not declared production-ready by this visual refinement.

Screenshots: `C:\Users\pc\.codex\visualizations\2026\10\27\bigtac-admin-reference-transform`. Real before captures: `before-{overview,orders,kitchen,detail}-{320,390,768,1440}.png`. Updated application captures: `after-{overview,orders,kitchen,detail,menu,promotions,drivers,settings}-{320,390,768,1024,1440}.png`; `after-overview-lower-{width}.png`, `after-orders-history-{width}.png`, role-specific mobile captures, and complete content exports `after-{overview,orders}-full-{390,1440}.png`. Complete exports use a taller real browser viewport at the same width; regular screenshots retain the original desktop/mobile viewport for comparisons. History screenshots load records through the existing bounded History control; no orders are created. Fixture images/accounts/orders are fictional.

Review: Web Interface Guidelines checked for the changed presentation. Taste source lint: 0 failures, 10 explained warnings (explicit semantic blue, controlled shadows, disabled blur adapters, clock formatting and unavailable-value dashes). Browser inspection: 0 failures; Overview has one grouped row-height warning (intentional spanning attention/natural lower-widget heights), Orders has metadata-density, variable real-order heights and existing bottom-nav text inset warnings. Purple delivery and tinted icon containers are deliberate user-directed allowances. No measured text contrast failures, gradients, glows or page overflow.

Remaining: physical iOS/Android keyboard/safe-area verification, existing backend permission/pricing/payment gates, and the preserved Phase 3 development/schema adoption review. Legacy team/driver financial calculations were not rewritten or certified. No production writes, real uploads, migration, commit, push, deployment or Phase 4 work. Pre-existing `assets/snack.png`, `assets/tacos-hero.jpg` and `bigtac-2/` changes remain outside this task.

### Final verification evidence

**1,580 checks passed** across the current preserved implementation:

| Suite | Actual result |
| --- | --- |
| `npm run test:admin` | 49 model + 218 browser = 267 |
| `npm run test:orders` | 54 model + 192 browser = 246 |
| `npm run test:menu` | 51 model + 136 browser = 187 |
| `node tests/admin-visual.mjs` | 177 visual/role/accessibility checks |
| `npm run test:storefront` | 350 |
| `npm run test:carousels` | 205 |
| `npm run test:customization` | 148 |

Visual widths: 320, 390, 768, 1024 and 1440px. Existing regressions additionally cover 375px/900px. Checked active navigation and semantic text contrast, no horizontal page/frame overflow, chart tick spacing/integer counts, visible drawer footers, keyboard-accessible queue actions, bounded history, desktop profile access, role-specific landing screens, Staff mobile rows, notification styling and zero writes while browsing. All suites block production Firebase; three Phase 3 image requests are mocked, with no real uploads. Syntax/diff checks pass. Before/after/full-content screenshots were opened and visually compared with the user’s references; complete Overview and Orders exports were reviewed, along with tablet/mobile/Kitchen/Staff/Settings/Promotions/driver renders.

No new dependency was installed. Existing customer/model/service hashes match the pre-visual checkpoint. No commit, push, deployment, production migration or Phase 4 work was performed. The reference-led visual work is complete; the separate Phase 3/backend adoption gates above remain open.
