# Menu customization — focused compatibility pass

27–28 October 2026. Phase 4 checkpoint was committed/pushed first as `7b82649`, at the owner's explicit request. This subsequent work stays local and uncommitted. No Phase 4-specific modules, production data, Rules, account operations or infrastructure are changed. Shared customization/cart compatibility checks apply to existing products and offers.

## Classification before implementation

| Requested capability | Verified starting point | Scope for this pass |
| --- | --- | --- |
| Selection presets, optional/required | Min/max and radio/checkbox already supported; presets missing | Map friendly presets onto existing fields; no new stored rule type |
| Included/free selection allowance | Zero-priced options supported; no allowance/paid-overage model | New pricing contract: proposal only, requires separate approval |
| Quantity-limited supplements | Optional supplements support one unit of each option; priced choices can limit distinct selections | Quantity/group-unit limits require a new contract and kitchen snapshots: blocked pending approval |
| Stable identity | Existing new option UUIDs, shared group IDs/sourceGroupId; cart drops IDs and matches names/prices | Preserve existing IDs in local carts and validate identity, with a legacy adapter. No backfill/new production snapshot fields |
| Templates/duplicate/reorder/availability | Availability, Move Up, shared/independent copying already exist; templates, option duplicate/Move Down missing | Add missing draft-edit controls, reusing current components |
| Unsaved changes/inline errors/preview | Product/group close, leave and unload guards; save errors; local customer preview already exist | Preserve guards, add group-level feedback and preview validation |
| Exact money | Decimal numeric price fields; floating-point addition/multiplication | Integer minor-unit arithmetic for current customization and local cart quantity calculations; same price semantics and persisted fields |
| Customer validation/progression | Min/max, stock filtering, cart separation and valid-only auto-scroll already exist | Reject duplicate/unavailable/replaced identities and ambiguous legacy choices; keep progression and explicit cart reconfiguration |

## Proposed contracts — NOT implemented or activated

**Included selections:** keep existing per-option pricing as the default. A separately versioned, explicitly opted-in group could use `pricing: {mode:'included-count', includedCount:2, additionalPriceMinor:500}` with the existing `min/max` selection model. Group options must have zero legacy add-on price for this uniform-charge mode; do not silently reinterpret priced options. Charge `max(0, selectionCount-includedCount) * additionalPriceMinor`, independent of selection order. Included count does not make a group required. Suggested customer copy: “2 choix inclus · puis 5 DH par choix · 4 maximum.” Any premium-option interaction needs a separately approved definition.

**Supplement quantities:** proposed versioned group/option contract includes an explicit quantity mode, option `unitPriceMinor`/`maxQuantity`, optional group total-unit limit, stable group/option IDs and integer quantities. Missing quantity mode retains today's one-unit checkbox behavior. Define whether limits count units or distinct options before adoption (recommend total units for quantity-mode groups). Trusted pricing and kitchen/receipt snapshots must agree. No quantity UI or field is activated here.

**Order snapshots / complete identity:** future versioned configuration snapshots should retain group IDs, option IDs, selected quantities, validated unit prices and allowance calculations, while preserving legacy `options` labels for existing readers. Independent legacy group IDs require explicit adoption, not automatic backfill. Historical orders are immutable; name/price snapshots must not be retroactively resolved against renamed options.

All new pricing modes, persisted money representations, order-snapshot fields and production migrations require separate approval plus trusted server validation and rollback planning. Existing client prices remain untrusted. Prior Phase 3/4 backend and tenant-isolation gates remain open.
