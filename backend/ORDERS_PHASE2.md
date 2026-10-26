# Phase 2: order operations release gate

No live Firebase configuration, rules, indexes, functions, data or schema were changed. The application continues to use its existing configured SDK. Tests replace every Firebase entry with in-memory fixtures before execution and block Firebase network endpoints as a second guard.

## Preserved contract

Staff: pending → confirmed → en_livraison → delivered; pending → rejected. No other status writes. For takeaway/dine-in, en_livraison is shown as ready for handoff, delivered as handed over. Legacy ready is readable in history but is not introduced as a new write path. Unknown legacy statuses require a reviewed inventory before rollout; they are not silently reclassified.

Status mutations now read the current UID profile and order in a transaction, compare the expected status, validate allowed transition and session generation, then update **only status**. Pending UI locks prevent repeated submissions; transactions detect competing updates. No update-success message is shown before the transaction resolves. A slow confirmation remains locked, without claiming failure or success. Rules/trusted services must enforce the same policy; browser code alone cannot secure it.

Driver claim/completion and customer tracking remain compatible. Driver transactions now verify current membership, delivery service/type, active status and assignment before claiming/completing; existing claimedAt/deliveredAt fields are retained. Customer text is escaped in the existing driver cards and actions use safe data attributes/delegation rather than interpolated inline JavaScript. Completion no longer says “collected” when no payment is recorded. This phase does not add counter-order creation, payment confirmation or a new cashier role. `CC.html` is a menu-upload tool and is never used by tests.

Restaurant closure still rejects pending orders, after the existing consequence confirmation. Each cancellation now verifies pending status in a transaction instead of blindly applying a stale batch: an order accepted concurrently is preserved. The store setting and individual cancellations are still separate operations, so partial failure remains explicitly reported; a fully atomic bulk-close service needs a separate backend design. Settings controls stay locked until the operation settles.

## Queries and indexes

- Active orders: status in pending/confirmed/en_livraison, limit 201, no date/orderBy constraint; render up to 200 and clearly warn about truncation. Single-field status indexing suffices. Includes undated active records, which display unknown reception time.
- History: status in delivered/rejected/ready; createdAt between restaurant civil-day boundaries; createdAt descending; 31 document reads per page, show 30, use the last displayed document snapshot as the next cursor. Default seven days; an explicit date selects that civil day. History is loaded on demand, refreshed explicitly and labeled accordingly. No whole-collection history listener.
- `order-indexes.example.json` proposes the composite status ASC, createdAt DESC index for this history query. It is not deployed. An unavailable index produces a useful retry/configuration error; the app does not fall back to an unbounded read.
- Search/service/status filtering applies to loaded records; order-number search is not represented as a global archive search. History pagination has a visible Load more action. `createdAt`-less historical records cannot be ordered by that field and need separate data review.
- Overview remains on the Phase 1 bounded queries. Team history remains Phase 4 debt; this phase does not change it.

## Honest times, prices and privacy

Reception age comes only from createdAt. The default **browser-local 20-minute reference** is visibly labeled, adjustable per staff account on that device, and measures time since reception, not actual kitchen preparation duration. It is not an opening-hours promise or server SLA. Optional existing confirmedAt/readyAt/claimedAt/deliveredAt/updatedAt appear only when recorded. No timestamps or status-history events are backfilled.

For a later reviewed schema: record server-controlled confirmedAt, readyAt and an immutable status-event log with actor/version/idempotency metadata. Define how those fields map onto existing statuses before migration; provide backups and rollback. No schema is changed in Phase 2.

Order totals and line amounts are labeled recorded amounts, not trusted accounting. The current storefront serializes item.price as the complete line total including quantity/options; receipts preserve that number and do not multiply it again. Delivery charges, taxes and discount attribution are not reconstructed from text. No reliable payment ledger exists, so payment is **unverified**, including for delivered orders.

Cards prioritize dishes/instructions and omit customer identifiers. Kitchen mode and kitchen receipts omit names, phone and address; cashier details omit phone/address; admin/manager details may show contact/fulfillment information. Firestore still transmits whole existing documents to authorized order readers. Enforcing field-level privacy against a modified client requires a reviewed PII document split or trusted projection service, not CSS. This remains a production privacy gate.

## Isolated backend policy and emulator checks

`order-operations.firestore.rules` is a **test-only staff-order policy**, not a replacement for the full application's Rules. It denies customer order creation, catalog writes and driver operations until those policies are separately reviewed/merged. Never deploy this file as the entire production ruleset. Existing live enforcement is unknown.

`backend/emulator/firebase.json` targets only local Auth/Firestore emulators. It has no hosting config or production project alias. With an already installed Firebase CLI and Java, start from the repository root:

```
firebase emulators:start --config backend/emulator/firebase.json --project demo-bigtac-orders --only auth,firestore
```

In a separate PowerShell terminal, set FIRESTORE_EMULATOR_HOST to 127.0.0.1:8080, then run `node tests/orders-rules-emulator.mjs`. The harness refuses non-loopback hosts and uses only the demo project. It seeds synthetic local membership/order documents and uses emulator-only unsigned test identities, following the Firebase SDK's mock-token convention; it does not create real Auth accounts. Without a configured running emulator, the test explicitly skips; a skip is **not** a Rules validation pass.

The installed runtime has Playwright but no Firebase CLI/emulator was found during this task. In-memory permission/concurrency tests exercise the application and an independent fixture policy; they cannot certify the Rules compiler, SDK retry behavior or deployed enforcement. Emulator execution and production-compatible policy integration are required before release. The standalone emulator harness uses the standard unsigned mock-token format described in the [Firebase SDK emulator utility](https://github.com/firebase/firebase-js-sdk/blob/main/packages/util/src/emulator.ts); its identities cannot authenticate against production.

References: [Firebase transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [query cursors](https://firebase.google.com/docs/firestore/query-data/query-cursors), [indexes](https://firebase.google.com/docs/firestore/query-data/index-overview).

## Before any production adoption

1. Back up rules/indexes and verify canonical active UID-linked profiles and all roles. Rules in this isolated policy use canonical lower-case role values; review legacy role normalization explicitly.
2. Merge the staff transition restriction into a complete deny-by-default policy without removing legitimate customer, menu, staff and driver access. Verify trusted order creation/pricing separately.
3. Run emulator tests, driver/customer integration, query/index checks and concurrent-action tests against a staging project. Verify offline/reconnect behavior with the actual SDK.
4. Check privacy and legacy-status/timestamp data quality. Obtain explicit deployment approval, deploy reviewed indexes/policy, and retain prior versions for rollback. Roll back application code independently if query compatibility fails; never open permissions as a fallback.
