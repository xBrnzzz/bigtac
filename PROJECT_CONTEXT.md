# Eon Agency × BIGTAC — Project Context

**Updated:** 2026-10-25  
**Repository:** https://github.com/xBrnzzz/bigtac  
**Purpose of this document:** Give Codex or Antigravity durable project context without pasting entire chat histories. This is product context, **not** a substitute for inspecting code and deployed infrastructure.

## 1. What we are building

**Eon Agency** is a premium digital transformation, branding, and custom software agency serving businesses in Morocco. Brand slogan: **“Beyond time, beyond trend.”** Agency palette: royal purple `#3B0086`, white `#FFFFFF`, dark `#0F0F13`. The agency's `eo` infinity monogram and motion identity belong to **Eon Agency**, not automatically to each restaurant client's branding.

**BIGTAC** is currently a restaurant-branded implementation of an **all-in-one restaurant ordering and management system**. The owner's confirmed intention is to perfect BIGTAC as a **reusable template/product** and resell customized deployments to independent Moroccan restaurants. For a new client, branding, logo, colors, menu, business details, and configuration should be customizable without rewriting the application. BIGTAC is **not** currently described as a confirmed paying client.

The earlier prototype/concept name **Yallahnaklou** appeared in the Gemini handoff. The active code repository is **BIGTAC**. Do not silently rename the current project.

**Commercial model:** one-time setup/deployment fee + optional flat maintenance/hosting retainer; **0% commission on restaurant orders**. Restaurant retains control of its own website and ordering experience. Target initially: independent fast-food, tacos, burger, pizza, sushi and café businesses in Casablanca/Rabat; adaptable to other Moroccan locations.

## 2. Technical reality (public repo inspection, 2026-10-25)

The repo currently contains `index.html`, `admin.html`, `CC.html`, `firebase-config.js`, `assets/`, `package.json`, `test-app.js`, and `test-server.js`. The customer page and admin page contain extensive inline markup, styling and vanilla JS, using Tailwind from CDN. `firebase-config.js` imports Firebase Auth, Firestore and Messaging. `package.json` declares Playwright. **Do not assume a React/Next.js architecture.** Inspect the code, test suite, Firestore rules, deployment settings and dependencies before proposing architectural changes.

Intended/partially implemented operational areas (confirm exact behavior in current code):
- Customer menu and ordering with delivery, takeaway, and dine-in flows; product modifiers/supplements and checkout.
- Admin/manager interface for menu and category management, images, product status, pricing and orders.
- Kitchen/cashier order management with status progression (`En Attente` → `En Cuisine` → `Prêt`).
- Driver (`Livreur`) order claiming and delivery workflow.
- Firebase authentication and role-based application flows (admin, manager, cashier, driver).

A previous code-oriented conversation flagged **possible** issues around fail-open admin role handling, browser-trusted prices/totals, modifier validation, category integrity, and live menu updates. **Treat these as audit leads, not certified findings**; reproduce them against the actual repository and verify Firebase Security Rules before concluding impact.

## 3. Non-negotiable mobile requirements

**The entire customer website AND the entire admin dashboard must be excellent on mobile**, not merely desktop layouts scaled down. Make touch usability a release acceptance criterion for restaurant owners and employees. Test at small mobile widths (including 320px and ~375/390px), tablets, and desktop. Include at minimum:
- Customer: menu browsing, category navigation, product option selection, cart, checkout, keyboard interactions, payment/contact choices where supported, loading/empty/error states.
- Admin: product/category CRUD, modifier editor, availability toggles, order cards/Kanban, cashier workflow, driver workflow, authentication and settings.
- Prevent horizontal scrolling, clipped buttons, inaccessible dialogs, tiny touch targets and interactions that only work on hover or mouse drag.
- Check on real iPhone and Android devices when possible. Maintain performance on typical mid-range phones and slower networks.

## 4. Visual/design principles

The current BIGTAC site is perceived by the owner as **too AI-generated/generic**. Desired direction: premium and authentic **restaurant-specific** design, not an overly animated agency landing page. Priorities: real food photography, compelling menu presentation, deliberate typography, clear visual hierarchy, polished spacing, restrained shadows/motion, excellent conversion-focused mobile ordering.

For admin, prioritize practical ergonomics and scanability over decorative effects: usable product management, order-status clarity, short workflows, fast actions and responsive layouts.

The owner has installed or is exploring **Taste frontend design skills** and may use them in Codex/Antigravity. Use such skills selectively for visual audits/refinements; preserve all functional logic and test after each UI iteration. Avoid all-skills-at-once prompting.

## 5. Product improvements to evaluate (proposed, not all implemented)

- Reliable product/category CRUD and validation; stable IDs; safe category rename/delete behavior.
- Reusable modifier groups (sauces, meats, supplements) and consistent minimum/maximum selection validation.
- Fast in-stock/out-of-stock toggles; product duplication and bulk operations.
- Real-time menu availability and safe order pricing/validation on a trusted backend.
- Better drag/drop order persistence and mobile-friendly sorting alternatives.
- QR table identification such as `?table=4` for **Sur Place** orders, plus **Sur Comptoir** cashier entry using the same backend.
- Kitchen audio notification, delivery navigation links, daily sales analytics, COD reconciliation, and optional upsell/reorder improvements.

Keep *existing* dine-in support separate from the **proposed QR table-number flow**. A feature idea in this list is **not** evidence that the feature is already complete.

## 6. Productization strategy

**Near term:** one shared codebase with configurable branding/content and **separate, isolated client environments** (for example separately configured Firebase/hosting deployments). This is preferable to prematurely building a complicated multi-tenant SaaS. Prioritize safe permissions, reproducible deployment, and client data isolation. Record any future decision to adopt a true multi-tenant model separately.

Create an eventually centralized restaurant configuration for: name, logo, typography/color tokens, address, hours, telephone, WhatsApp, delivery zones/fees, menu defaults, social media and relevant UI content. Keep credentials and secrets out of public configuration; remember Firebase web config is not an authorization boundary.

## 7. Approved roadmap / order of work

1. **Security and reliability audit/fixes.** Verify authorization, Firestore rules, server-side price/total trust, injection handling, robust CRUD and error states.
2. **Menu-management quality.** Validation, category integrity, modifiers, stock controls, real-time consistency and fast admin/mobile workflows.
3. **Premium mobile-first UI/UX redesign.** First customer experience, then operational admin screens; preserve behavior and verify responsive states.
4. **Reusable client template.** Centralize branding and configuration; isolate deployments and data.
5. **Tests and realistic pilot.** End-to-end checkout, admin CRUD, kitchen transitions, delivery and mobile/device coverage.
6. **Eon commercial launch.** Demo, packages/pricing in MAD, French/Darija outreach, first restaurant pilot.

Avoid feature creep before a dependable first release. Do not perform sweeping rewrites or migrate to React without a documented reason and explicit approval.

## 8. Collaboration preferences and AI workflow

- Treat the assistant as a candid technical/product partner, not a yes-man. Challenge weak visual ideas and unsafe engineering decisions with specific alternatives.
- Give concrete, testable actions and concise explanations, especially for a developer learning AI-assisted coding.
- Prefer **one bounded task per Codex prompt**. Include objective, relevant files, constraints and acceptance checks. Avoid repeating this entire document in every conversation.
- Start a fresh agent thread after major milestones or when old logs are distracting; preserve important decisions in small, maintained Markdown notes.
- Use Git branches or commits for checkpoints; do not have Antigravity and Codex modify the same working files concurrently.
- Work in English for development; French and Moroccan Darija for relevant restaurant UI copy/marketing where appropriate.

## 9. Other Eon brand context (not core to restaurant-code tasks)

The Eon infinity-shaped lowercase `eo` mark has an angled crossbar in `e` and a pointed cutout in `o`. An approved ~10-second "liquid light ribbon" animation reveals the white mark over a deep-space opening and cross-fades to the purple brand lockup with the slogan. Avoid wireframe stencils, explosions and chaotic effects. The Instagram handle `@eon.x` has been considered but **registration is not confirmed**. French/Darija B2B outreach and exact MAD pricing remain to be decided. Read this section only for Eon agency branding or go-to-market tasks.

## 10. Unknowns to verify, not guess

- Whether production Firebase/Firestore rules are secure; server validation deployment status.
- Actual live URL, production status, configured environments and secrets policy.
- Current feature completeness and runtime behavior, particularly role gates, pricing and mobile workflows.
- Final design references, first client's brand content, Eon agency handle, commercial prices.

**Rule:** On starting a task, inspect only the relevant implementation and verify claims before editing. Update this document when a material product decision actually changes; do not regenerate the whole file on every task.
