# BIGTAC / Eon Agency — Codex Instructions

## Purpose
BIGTAC is the reusable restaurant ordering and operations product that Eon Agency intends to customize and deploy for Moroccan restaurant clients. See `PROJECT_CONTEXT.md` **when business context, product scope, design direction, or rollout priorities matter**. Do not reread it for trivial edits.

## Working rules
- Inspect relevant code before editing; the current project is mainly HTML, vanilla JavaScript, Tailwind CDN, and Firebase. Do not assume React/Next.js.
- Work on one narrowly defined task at a time. Favor small, reviewable patches; preserve all existing customer, staff, and driver flows.
- **Both customer and admin interfaces must be mobile-first**, touch-friendly, accessible, and usable at 320–390px, tablet, and desktop sizes. Test horizontal overflow, modals, forms, navigation, and touch actions.
- Customer experience: food-focused, fast ordering, distinctive typography, restrained effects. Admin experience: speed, clarity, dense-but-readable information, fast stock and order actions. Avoid generic AI-style gradients/glows/glass everywhere.
- Do not alter Firebase rules, production data, schema, environment configuration, credentials, hosting, or payment/order logic without explicitly identifying the risk and obtaining approval.
- Treat client-side prices, totals, role assignments, and order state as untrusted; prefer server-enforced validation/authorization. Never invent security guarantees from UI checks.
- Each restaurant deployment must have its own branding/configuration and properly isolated data. Do not hardcode a new client's details throughout the templates.
- Reuse existing utilities and installed design skills *only when directly useful*. Skills guide visual work; they do not authorize rewriting unrelated logic.
- Verify relevant tests and responsive behavior after changes. If you cannot test something, say so plainly.

## Response format
For a normal implementation task: briefly state **changed files**, **what changed**, **tests run/results**, and **unverified risks**. Avoid lengthy recaps or full file dumps unless requested.

## Safety before implementing
For broad rewrites, security-sensitive changes, data migrations, or architecture decisions, present a short plan first and wait for approval. For approved, small fixes, implement and test without re-explaining the whole project.
