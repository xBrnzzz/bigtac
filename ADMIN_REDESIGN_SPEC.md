# BIGTAC Admin 2.0 — Phase 1 specification

This document records the Phase 1 foundation and approved phase boundaries. Phase 2 Orders/Kitchen is now implemented locally; see `backend/ORDERS_PHASE2.md` and `TASK_STATUS.md` for its contract and verification. No live Firebase access, deployment, database migration or framework change. The future self-service, multi-restaurant platform supersedes PROJECT_CONTEXT.md's separate-site strategy; tenant isolation is not implemented.

## Verified audit

The application is vanilla HTML/JavaScript, Tailwind CDN, Firebase SDK 10.8.0, Feather and Sortable. `admin.html` owns authentication, orders, menu/category editing, promotions, staff provisioning and driver delivery operations. The customer storefront is `index.html` with extracted storefront/customization/carousel modules. Installed Playwright and deterministic storefront fixtures are reusable. `test-app.js` is not an isolated test and must not run against production.

| Workflow | Existing dependency / observation |
| --- | --- |
| Login | Auth UID resolves `users/{uid}`. Previously missing profiles, unknown roles and read errors could become admin; email fallback could resolve the wrong membership. Remove these fallbacks and automatic provisioning. |
| Menu | `categories` and `menuItems`; category names are string references, rename batches rewrite products. Existing choice arrays, supplements, image upload and Sortable editors can be retained. Storefront uses one-time reads, so already-open menus do not receive stock changes live. |
| Promotions | `promotions`; separate embedded product/choice records. Existing pricing/editing retained; no verified conversion attribution. |
| Orders / kitchen | `orders` real-time listener; pending → confirmed → en_livraison → delivered, plus rejected. Existing non-delivery handling and historical queries need a separate lifecycle review. No new states introduced. |
| Drivers | Legacy `delivery` and `livreur` aliases. Claim transaction checks assignment; status/type rechecks and server authorization need further work. Completion records deliveredAt, not an auditable payment. The old driver view was hidden by its own hidden parent. |
| Settings | `settings/config`: isOpen and whatsappMode. Previously reading a missing config wrote defaults. Closing the restaurant also rejects pending orders; this existing side effect must be disclosed and confirmed, not silently replaced. |
| Staff | Admin creates Auth accounts using a secondary app then writes a UID profile. Deleting a Firestore profile does not disable its Auth account. Provisioning/invitation hardening belongs in Phase 4 plus backend review. |
| Financial reporting | Old daily revenue sums every non-rejected order using browser midnight, including unpaid orders. There is no verified payment ledger. Do not label order value as revenue or infer payment from delivered status. |

No version-controlled rules, indexes, Functions or emulator configuration were found. **Live enforcement is unverified**; client role gates are usability/defense-in-depth only. Existing legacy templates interpolate order/customer/catalog text into HTML without consistent escaping. Trusted pricing, XSS remediation, server role authorization and tenant isolation are launch blockers to review before commercial rollout. No claim about deployed security rules is made.

## Reuse and architecture

- Keep Firebase configuration, collections, order transitions, storefront and existing editors. No React migration.
- `assets/admin.css`: scoped tokens, app shell, shared panels/forms/navigation and deliberate phone/tablet/desktop layouts.
- `assets/admin-model.js`: pure role capabilities, reporting timezone/boundaries and metric definitions, independently testable.
- `assets/admin-overview.js`: bounded read-only listeners, dashboard rendering, explicit loading/empty/error/cache/truncation states. Uses the existing config document; optional display configuration reads are backward compatible and do not create fields.
- `admin.html`: shell markup, role-aware routing, fail-closed live UID profile observer and existing operational adapters. Unsubscribe on logout/revocation; discard stale async initialization.
- Phase 2: `admin-orders-model.js` holds pure order presentation/transition policy; `admin-orders-service.js` holds bounded subscriptions/history and transactional updates; `admin-orders.js`/`admin-orders.css` implement the Orders/Kitchen workspace and receipt/detail views. Old Orders markup/listener/render logic is removed, rather than retained as a competing flow. Backend review artifacts live under `backend/` and are not production configuration.
- Isolated admin fixture server replaces the Firebase configuration module and **all direct SDK imports before execution**. Browser tests additionally block production Firebase endpoints. No real accounts, orders or images are uploaded.

## Navigation and permissions

Admin: Overview, Orders, Menu, Promotions, Team, Settings. Manager: same except Team. Cashier: Orders only, plus session/storefront utilities. Driver: existing available/my-deliveries workspace, plus session utilities. Alias `delivery` normalizes to `livreur`. Unknown, disabled, missing or unreadable profiles receive no workspace and no writes. An active profile listener revokes access when the profile disappears/changes.

Sidebar at desktop; bottom navigation and a full-screen secondary menu below 1100px. No links to unimplemented Kitchen/Cashier/Analytics screens. Existing order columns remain accessible on tablets. Overview offers existing create-product, promotion, orders, menu availability and settings destinations only to permitted roles.

Permission migration gate: reconcile existing Auth UIDs against verified staff records in a separate authorized environment; back up users, explicitly approve each membership/role, copy legacy email-keyed records to verified UID documents with audit history, verify all roles and rollback from backup. Never auto-promote or grant by matching email. Production access may stop for unprovisioned accounts; reconcile before deployment. Enforce the same matrix in reviewed Rules/trusted services with emulator tests before production release.

## Design decisions

Current visual direction (2026-10-27): the owner’s three supplied POS references supersede the original neutral Framed sheet appearance below. Keep the existing architecture and Plus Jakarta Sans; use a dark #182331 sidebar, #F3F6FA workspace, clear white panels, orange active navigation, tinted semantic icon tiles and a compact chart/attention/quick-action composition. The original Phase 1 style description is historical, not a requirement to revert these changes. Reference percentages, payment/revenue claims, new-order entry, global search and extra modules are not implemented unless actual data/workflows support them. See TASK_STATUS.md for screenshots and verification. Phase 3 Menu Builder development remains preserved; this visual pass does not alter its data contract or customer storefront.


Question: **What needs attention in the restaurant right now, and how is today's ordering activity?** Main action: open the live order queue. Face: existing logo, Plus Jakarta Sans and restrained BIGTAC orange on order activity. Signature: restaurant handoff queue (accept → prepare → assign delivery), computed from real active order states.

Taste skill: Framed sheet, seed 1097938476, retained brand palette/type. Neutral L-frame, white inset sheet, 16px radius and hairlines; no dashboard hero, gradients, icon KPI tiles, fabricated deltas or decorative charts. Shared KPI strip and compact actionable lists. At 1440px: 228 sidebar + 8 inset + 1204 work area; 24px internal gutters, grid columns share the same edges. Phone: single sheet, two-column figures, full-width charts and 44px actions. Light theme only for Phase 1; a partial dark theme would harm consistency.

The owner confirmed that the POS references have no transferable links/files and approved proceeding with the written direction. No reference-image dependency remains.

## Reliable reporting contract

- Reporting timezone: valid `settings/config.reportingTimezone`, default Africa/Casablanca; invalid values visibly fall back. Civil dates use Intl, including Moroccan DST changes, rather than browser midnight.
- Orders today: all created today, including rejected, explicitly labeled. Completed: status delivered, created today (not completions occurring today). Pending: today's status pending. Active deliveries: all currently en_livraison + livraison in bounded active query.
- Recorded order value: sum valid nonnegative stored totals, excluding rejected; includes unpaid orders. Average uses the same population. If any relevant total is invalid, show unavailable rather than silently summing a partial figure. These are client-recorded amounts, not trusted accounting.
- Collected revenue: unavailable, with explanation that no verified payment records exist. No invented payment field or status inference.
- Current storefront payloads persist product names but omit product IDs. Historical ranking therefore groups those lines by recorded name; same-named products cannot be distinguished and renamed products cannot be joined reliably. No claim of SKU-level sales analytics is made.
- Hourly activity/service mix: counts of today's created orders, including rejected. Seven-day trend: created-order counts. Most ordered products: recorded line quantities on non-rejected orders today, grouped by stable product ID where present, otherwise legacy name. No inferred product revenue/attribution.
- Overview history: last seven civil days, `createdAt >= start`, `< tomorrow`, descending, capped at 1001 documents (1000 supported). Active queue: status in pending/confirmed/en_livraison, capped at 201 (200 supported). On cap, suppress affected totals and explain incompleteness. No unbounded historical listener for Overview. Existing Orders/Team historical reads remain legacy debt and are started only when those screens are opened.
- Local clock is used to choose reporting bounds; server aggregation and trusted clock needed for audited reporting. Cached data labeled; errors discard metrics and offer retry. Refresh on timezone/date changes; attention ages update without extra reads. Delays shown only if a valid preparation-time setting exists, otherwise explicitly unavailable. Inventory unavailable count only when existing stock flags support it; absent flags are not interpreted as unavailable.

## Phase checkpoints

1. **Foundation / Overview (current):** tokens, responsive shell/navigation, role gates and fail-closed profile handling, honest bounded reporting, safe fixtures, screenshots and preserved-screen smoke tests. No production deployment.
2. **Orders / Kitchen:** accessible order detail drawer, safe text rendering, bounded history/pagination, errors/retry/idempotency, lifecycle review including non-delivery handoff, kitchen timing/printing. Backend security review is a prerequisite to production, not deferred permission to ship insecurely.
3. **Menu builder:** stock controls + live storefront sync, stable category IDs with reviewed compatibility migration, reusable modifier definitions with legacy adapter, unsaved changes, bulk/duplicate/archive and customer preview.
4. **Operations / Settings:** promotions scheduling only with supported backend, delivery assignment, cashier/payment model, safe staff invitations/disabling, configurable restaurant identity/operations.
5. **Analytics / SaaS readiness:** trusted prices and payment ledger, server aggregates, versioned rules/indexes/emulators, membership/tenant model with isolation tests, performance and full regression. Critical authorization/security work must precede production features that depend on it.

Every migration/deployment requires explicit approval, backup, compatibility plan, rollback and emulator authorization/isolation tests. The owner explicitly approved Phase 2 continuation after the Phase 1 checkpoint; Phase 3 requires another review.

## Verification and limits

Run `npm run test:admin` for pure reporting/policy checks plus Playwright against the in-memory server. The fixture server never serves the real Firebase configuration, and rewrites all direct Firebase SDK imports to local stubs before execution. Browser guards additionally reject Firebase network endpoints. This validates client behavior, **not deployed Rules or server authorization**.

Reviewed responsive renders at 320, 375, 390, 768, 900, 1024 and 1440px; baseline/final screenshots plus lower Overview, editor, driver and failure-state screenshots are saved outside Git at `C:\Users\pc\.codex\visualizations\2026\10\26\bigtac-admin-phase1`. The three existing storefront fixture suites cover customer ordering, carousel/sticky navigation and customization in light/dark modes. No production test orders, sign-ins or uploads were performed.

Taste inspection: no failures. Its remaining tablet small-text warning covers 11–12px chart axes, notes and metadata; primary controls/data remain 13–26px. Source lint warnings about blur refer to explicit `none` overrides, zero-padding is for clock labels, and em dashes represent unavailable data. These are deliberate, not decorative effects. Accessibility review uses the Web Interface Guidelines: semantic links/buttons, named controls, native modal secondary navigation, editor focus containment/restoration, live feedback, reduced motion and safe-area-aware bottom navigation.

Screenshot critique: order counts, service totals and hourly activity reconcile; the orange bars show recorded activity, not invented growth. Phone/tablet navigation is separate from desktop; short lists retain readable spacing. The full dashboard deliberately scrolls to its secondary product/quick-action panels. Existing editor styling and order lifecycle are retained for their dedicated phases. Real iOS/Android hardware, production indexes/rules, offline SDK behavior and staging authentication are still unverified.

Before release: verify staff UID profiles (missing/disabled/unknown/cache-only/unacknowledged profiles fail closed), test backend permission enforcement and trusted prices in a configured emulator/staging environment, review legacy HTML injection, bound Orders/Team history and address existing pickup/dine-in lifecycle semantics. Phase 1 adds no production security policy or payment ledger and is not a commercial-release certification.
