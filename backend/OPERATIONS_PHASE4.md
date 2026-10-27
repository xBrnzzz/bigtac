# Phase 4 — local operations contracts and release gates

27 October 2026. Owner-approved local implementation, milestones A → B → C → D. No production records, accounts, Firebase configuration, Rules, infrastructure or deployment were changed. This document describes source behavior, not deployed security guarantees. The existing Admin 2.0 design and Phase 3 architecture are retained.

## A — Promotions

Existing `promotions` documents remain independent fixed-price offers. The editor repairs embedded `mandatoryChoices` and `supplements`, validates money and selection limits, supports unpublished duplication, publication, deletion and optional scheduling. Updates preserve unrelated fields; stale documents, cached/partial lists and changed sessions block saves. Reads cap at 300 offers with a visible unavailable/partial state above that limit.

Additive optional fields: `startsAt` and `endsAt`, persisted as ISO UTC instants or `null`. Existing documents without dates retain legacy behavior. Existing Firestore timestamp values can be read. Local date entry uses `settings/config.reportingTimezone`, default `Africa/Casablanca`; invalid or ambiguous local times are rejected. Start is inclusive, end exclusive. State is derived as active/scheduled/expired/disabled/invalid; no status backfill or scheduled job is needed. Client clocks remain untrusted.

The storefront subscribes to current offers, derives availability, closes invalidated offer editors and revalidates cart prices/options/required choices before submission. Schedule checks refresh locally every 30 seconds and again during checkout; no schedule polling writes occur. Existing offer ordering and historical order snapshots are preserved.

**New discount rules remain unavailable.** `DISCOUNT_RULES_ENABLED=false`; no discount rule reader, authoring/publishing flow or new checkout pricing path is connected. Pure models define the proposed future separate `discountRules` contract: `id`, `name`, `type` (`percentage`/`fixed`), positive `value`, `productIds`/`categoryIds`, publication and optional dates. Calculation uses integer minor units, discounts base price before unchanged supplements, never stacks, and chooses the lowest eligible resulting price with stable ID tie-breaking. Invalid targets/ranges, percentages above 100 and fixed discounts above eligible base prices are rejected. These are local previews only.

**Release gate:** a trusted order service must independently load prices, availability, eligible rules, schedules, quantities and options; calculate totals; reject stale/invalid carts; and preserve validated snapshots. Existing legacy client-calculated order prices are not certified by these changes. No discount activation until that service and its enforcement are verified.

## B — Delivery

Admin/manager assignment controls live in existing Orders detail. Transactions re-read the actor, order and selected driver; require an active supported membership, `type=livraison`, existing `status=en_livraison`, an active `livreur`/`delivery` target and the expected current assignee. Concurrent edits, changed sessions, offline/unconfirmed data and invalid targets fail without optimistic mutation. Driver lists are bounded to 50; a partial list disables assignment.

Only existing `deliveryGuyId`/`deliveryGuyName` fields change. Reassignment and unassignment preserve status, totals, existing `claimedAt` and historical snapshots. No invented pickup/problem state, synthetic assignment history or timestamp backfill. Existing assigned-driver completion remains. Maps links use actual stored addresses only.

**Privacy restriction:** the driver unassigned-order subscription and claim UI are disabled. Managers assign orders instead. The legacy claim service method is not server authorization; UI restrictions cannot prevent direct SDK access. A trusted redacted availability projection and verified document access policy are required before restoring self-claim. Assigned-driver contact behavior is preserved; no broader access is introduced. Real Rules must enforce assignment, ownership and customer-field privacy; local fixture checks do not prove that enforcement.

## C — Staff

The admin-only, bounded staff list escapes displayed values and shows profile status. Existing roles are retained: admin, manager, caissier and livreur (`delivery` alias). Kitchen remains a presentation mode. No new role or permission is introduced.

Browser secondary-Auth signup and profile-only deletion have been removed. `staff-service.js` exports an explicit unavailable trusted-service facade. Create, role change, deactivate and remove all fail closed; no browser Auth/profile-write fallback, service credentials or fake success. Existing real-time profile revocation behavior remains.

**Blocked:** privileged staff administration needs an approved, operational trusted service. It must verify actor and restaurant scope, role allowlists, self-change/last-admin protections, idempotency, Auth disable/session revocation and membership consistency; record audit/recovery for partial failures. No endpoint or infrastructure was provisioned in this scope. Profile status in the list does not certify that Firebase Auth has been disabled.

## D — Settings

The existing `settings/config` document is updated with validated partial patches and an expected-document comparison. Unknown top-level fields are preserved; the form retains dirty drafts on external updates and supports reload. Offline/cached/missing configuration blocks saves. Supported local fields:

| Field | Contract / fallback |
| --- | --- |
| `restaurantName`, `description` | Profile text; name required in the new form |
| `phone`, `whatsappNumber`, `email`, `address` | Validated contact fields; legacy storefront contacts used when absent |
| `logoUrl`, `instagramUrl`, `facebookUrl`, optional `websiteUrl` | HTTPS URLs without embedded credentials; logo upload reuses existing image boundary |
| `reportingTimezone` | Valid IANA timezone; legacy default Africa/Casablanca |
| `orderingModes` | Supported boolean livraison/emporter/sur_place entries; at least one enabled; absent entries retain legacy enabled behavior |
| `openingHours` | Optional/null or exactly seven Monday–Sunday rows `{closed,start,end}`; HH:mm, opening and closing differ; overnight interval belongs to opening day |
| `isOpen`, `whatsappMode` | Existing boolean semantics preserved; simple flag updates do not require legacy documents to acquire profile fields |

Manual closure takes precedence over weekly hours. Supported profile, contact, hours and mode settings update the storefront live. Disabled modes are checked at selection and submission, including while checkout is open. Missing hours preserve legacy availability; no production data is backfilled. Existing cart/zone-fee calculations remain unchanged.

**Restricted:** fee, zone and minimum-order editing is unavailable until trusted pricing validation exists. Stored unknown configuration is retained rather than silently applied to prices. No geographic/routing engine. Closing the restaurant still uses the legacy separate pending-order rejection operations; it is not an atomic bulk server transaction and can partially fail. Cloudinary enforcement/upload controls remain a separate existing release gate; local file checks are not server upload security.

## Verification boundary

New model, transaction and browser fixtures cover schedules/money, stale edits, assignment races, inactive/revoked roles, write failures, staff-operation blocking, configuration preservation, live storefront changes and mode disable during checkout. Forms are checked at 320/390/768/1440px. Customer ordering and affected pure menu/order regressions are also run. Fixtures replace Firebase before execution and use fictional accounts/orders. They do not certify deployed Rules, real SDK offline/reconnect behavior, emulator enforcement, physical devices or trusted services.

Phase 3 schema adoption, tenant isolation and prior backend gates remain open (`MENU_PHASE3.md`, `ORDERS_PHASE2.md`). No production migration or tenant model was introduced. Phase 4 local behavior is implemented within these restrictions; infrastructure-dependent capabilities remain incomplete. Phase 5 has not started and should not be declared ready until these gates are resolved and reviewed.
