# BIGTAC Admin 2.0 status

Current checkpoint: **Phase 1 & 2 UI/UX refinement — complete in isolated fixtures; commit and push explicitly requested**. Phase 3 has not started. Phase 1 and Phase 2 were pushed as `1fdea6a` and `05978a6`. No deployment or production Firebase access was performed.

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
