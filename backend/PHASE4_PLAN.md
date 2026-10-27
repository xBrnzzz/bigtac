# Phase 4 — approved local implementation plan

**Approved by the owner on 27 October 2026.** The owner authorized local milestones A → B → C → D and additive contracts, with discounts/staff administration gated by trusted services and driver privacy restricted where backend enforcement is unavailable. No production changes, accounts, Rules deployment, commits, pushes, deployment or Phase 5 were authorized. The findings and approval request below are the historical pre-implementation plan; see `OPERATIONS_PHASE4.md` and the latest `TASK_STATUS.md` checkpoint for implemented behavior and remaining gates.

27 October 2026. Local source inspection only; no Firebase reads, account operations, migrations or deployment. Existing design and current Phase 3 code must remain intact.

## Verified implementation status

| Area | Present | Incomplete or missing |
| --- | --- | --- |
| Promotions | Independent fixed-price offers in `promotions`, name/description/image/publication CRUD | No percentage/fixed-amount discount engine, product/category targeting or dates. Storefront fetches offers once. Editor buttons call undefined `addPromoChoiceGroup` / `addPromoSupplementRow`; saves omit embedded choices/extras. Loading errors only log to console; no stale-editor transaction. |
| Delivery | Driver claim/completion transactions, assigned-driver subscriptions, pending locks, current role/state/ownership checks | No manager assignment/reassignment/unassignment UI, bounded management history, maps or operational issue contract. Unassigned-run query returns full order documents, and its UI exposes customer contacts before assignment. True data minimization requires backend enforcement/projection. |
| Staff | UID-based fail-closed profiles; existing admin, manager, caissier, livreur roles (`delivery` alias); live access revocation in the app | Browser Auth signup followed by a separate profile write; profile deletion does not disable Auth. No verified trusted provisioning or role-update service, last-admin protection or account-status management UI. Kitchen is a presentation mode, not a separate authenticated role. Team remains admin-only. |
| Settings | Live `isOpen` / `whatsappMode`, confirmation of restaurant closure, partial-field saves; admin restaurant name/reporting timezone | No profile/hours/mode/zone editor. Contact numbers, delivery zones and checkout location text are hardcoded in the storefront. Closing currently updates the setting then rejects pending orders separately: partial failure is possible. |

Source anchors: `admin.html` promotion handlers, staff handlers, `initSettings`, driver listeners; `assets/admin-orders-service.js`; `assets/admin-model.js`; `index.html` configuration/constants and promotion loading. These findings describe code, not production records or deployed Rules.

Phase 3 release dependencies remain open: catalog schema adoption, real SDK/Rules budgets, trusted pricing/stock checks, upload controls and tenant isolation. See `MENU_PHASE3.md`. Phase 4 must not backfill or bypass them.

## Proposed incremental implementation

### A — Promotions first

1. Repair existing offer editing using the current embedded choice/supplement contracts; validate money and min/max, preserve unknown fields, add safe duplication/disable/delete, errors/retry, session guards and conflict checks. Preserve current fixed-price offer semantics.
2. Add scheduling only through a reviewed additive local contract. Use IANA `Africa/Casablanca`, explicit UTC instants and validated local-date conversion; reject invalid/ambiguous input rather than assuming a permanent UTC offset. Derive scheduled/active/expired/disabled states with start-inclusive/end-exclusive boundaries.
3. Percentage and fixed-amount discounts are **new pricing behavior**, not an existing feature. Proposed local contract: separate `discountRules` definitions so old clients do not render rule documents as standalone offers. Eligible product/category IDs must resolve; reject invalid ranges and amounts. Use integer minor units, discount the base unit price before unchanged supplements, never stack discounts, choose the lowest eligible resulting base price with a stable ID tie-break. Reject fixed amounts above eligible base prices; clamp at zero defensively in trusted calculation. Preserve historical order snapshots and require explicit cart revalidation after rule changes.
4. Implement isolated models/fixtures and customer compatibility tests before wiring new price behavior. Public client clocks/totals are previews, not authoritative pricing. Trusted order creation must re-evaluate eligibility, current prices, availability and schedule. No production activation of rules is included.

### B — Delivery

Add assignment management inside existing authorized Orders workflows, without opening admin-only Team access to managers. Use existing delivery states/assignment fields and transactional expected-assignee checks; re-read actor/target membership, reject disabled/non-driver targets, concurrent assignments, completed/non-delivery orders and stale sessions. Preserve driver claim/completion. Do not invent pickup/acknowledgement/problem states. Link only actual addresses to external maps. Historical assignment events require an explicit additive backend contract; do not rewrite old assignments/timestamps to manufacture history. Protect customer fields on the server; hiding UI is insufficient.

### C — Staff

Reuse current roles and active-profile revocation. Replace browser account provisioning with a trusted administration-service boundary. When that service is unavailable, show a clear unavailable state and disable privileged create/role/deactivate operations rather than silently falling back to client Auth signup. The server must verify the actor, restaurant scope, supported role, self-change/last-admin invariants and idempotency; disable Auth/revoke sessions plus membership, with recovery/audit for partial failures. No service-account material enters frontend code. Local fixtures are not a deployed security implementation.

### D — Settings

Reuse existing settings UI patterns, upload boundary and live subscription. Propose validated profile/contact/logo, weekly hours, enabled ordering modes and simple configured delivery zones/minimums, with conservative legacy fallbacks. Explicit manual closure remains distinct from scheduled availability. Preserve unknown configuration fields; compare expected versions and write only intended fields atomically where possible. Storefront must consume the same configuration and block unsupported/disabled checkout modes, including a mode disabled while checkout is open. Pricing-related fee/minimum changes require matching trusted checks. No geographic/routing engine or full SaaS builder.

## Verification and release boundary

Run focused model and fixture-browser tests once per milestone: pricing boundaries/schedules/overlap, offer compatibility, stale/conflicting writes, disabled memberships, assignment races, privilege escalation, settings preservation and live storefront/cart changes. Keep targeted existing order/menu regressions where affected; do not rerun visual redesign suites. Test responsive forms at 320/390/768/1440 only where new UI is introduced. Use no production orders/accounts/uploads.

Local backend/Rules contracts and emulator tests may be prepared, but production deployment/migration requires separate approval, backups, rollback and actual backend authorization verification. No Firebase Admin runtime, callable administration service or complete production policy is currently implemented in this repository; existing emulator files are proposals, not proof of live enforcement. Do not claim otherwise or provision privileged operations merely to make fixtures pass.

## Approval requested before application edits

Approve this local-only implementation scope, including proposed discount/settings contracts, storefront pricing/configuration integration and replacing browser-only staff provisioning with a disabled-until-trusted service boundary. This does **not** approve production schema changes, account changes, Rules changes, deployment, commits or pushes. Implement A → B → C → D, report each checkpoint and keep infrastructure-dependent capabilities explicitly incomplete until verified. Phase 5 is not authorized.

Reason for gate: `AGENTS.md` requires a short plan and approval before security-sensitive/architecture changes and explicit risk approval before modifying payment/order logic. The detailed pricing, staff and privacy changes above cross those boundaries; the broad Phase 4 brief does not establish their currently missing contracts.
