# FlowPact — Implementation Status

## All 5 build phases complete
Phase 5 (the last remaining one) added:
- `server/src/routes/approvals.ts`: `GET/POST /approvals`, `POST /approvals/:id/decide`. Approving is blocked with a 409 if the latest test run has failures or the linked contract has no acceptance criteria, unless the reviewer explicitly marks it an authorized exception with a required reason — verified live via API (blocked without exception, succeeded with one).
- `server/src/routes/analytics.ts`: domain breakdown, contract-status/outcome-status/approval-funnel distributions, and per-contract business-rule coverage — all computed live from the database, not hardcoded.
- `client/src/pages/Approvals.tsx`, `Analytics.tsx`, `Settings.tsx`: real pages replacing the three remaining `ComingSoon` placeholders (now deleted, since nothing uses it). Settings includes a working demo-persona switcher (3 seeded users) and a theme toggle duplicate of the Topbar one.
- `WorkflowStudio.tsx` gained a "Submit for Approval" action next to Publish, closing the loop from building a workflow to requesting its release.
- **Found and fixed a real bug while verifying this**: the seeded flagship approval's `testSummary` used a different field-naming shape (`passed`/`failed`) than the one the approval-gate check and the live-created records use (`passedCount`/`failedCount`), so the gate silently never fired for seeded data. Fixed the seed shape and re-verified the 409 block actually triggers.
- Added the `/docs` BA documentation set (5 files: product vision/PRD, business contract spec + Gherkin stories + decision tables, architecture + ER diagram + API spec, testing/change-impact/outcome-verification methodology, traceability matrix + known limitations + roadmap) and the root `README.md`, both connected to what's actually implemented and tested in this build rather than written speculatively. Verified the README's own "Getting Started" commands (`npm install`, `npm run migrate`, `npm run seed`, `npm test`) actually work from the repo root.

## Completed (Phase 3 — Scenario Intelligence + Outcome Assurance Ledger)
- `server/src/services/ruleEngine.ts`: deterministic business-rule evaluator (dot-path lookup, all 7 operators, AND/OR folding per rule's `logicGroup`). This evaluates contract business rules against scenario input data — it is **not** the full workflow graph interpreter (that's Phase 4's Workflow Studio); scope is intentionally limited to precondition/rule checking, documented as such in the UI and here.
- `server/src/routes/scenarios.ts`: CRUD + `POST /scenarios/run-suite` — runs every scenario for a contract through the rule engine, persists a real `TestRun`/`TestRunResult` set (no randomization), and returns rule coverage (`covered rule fields / total rule fields × 100`, distinct from scenario count per spec). Running is blocked with a clear 409 if the contract has no linked workflow version.
- `server/src/routes/outcomes.ts`: ledger list/detail, `POST /outcomes/:id/reverify` (recomputes VERIFIED/MISMATCH by deep-comparing stored expected vs. observed state — status is never user-settable), `PATCH /outcomes/:id/resolution` (resolution workflow requires a note to close out a mismatch; this never flips `status` itself).
- `client/src/pages/ScenarioIntelligence.tsx`: contract selector, stat cards, expandable test result matrix showing per-rule pass/fail trace, "Run Suite" action.
- `client/src/pages/OutcomeAssurance.tsx`: filterable ledger table, detail dialog with expected/observed state diff, reverify, and a resolution flow (Accept Risk / Mark Resolved) gated on providing a note.
- Verified against real data: running the flagship Subscription Activation suite returns 8/10 passed — the 2 failures are a genuine finding (the contract's 3 rules don't check payment signature or amount, so "Invalid signature" and "Incorrect payment amount" scenarios aren't actually caught), not a bug. This is the kind of gap Scenario Intelligence exists to surface.

## Completed (Priority improvement pass)
Working down the prioritized improvement list from the last review, in order:

1. **Scenario Intelligence now also runs the real workflow graph, not just contract rules.** `POST /scenarios/run-suite` still decides PASS/FAIL from the business-rule check (unchanged — zero regression risk), but when the linked workflow's current version has a valid graph, it additionally runs that exact input through `runWorkflow()` and stores both traces (`{ ruleTrace, graphTrace, graphOutcome, graphInvalidReason }`) on the `TestRunResult`. The Scenario Intelligence detail view now shows both: "Business Rule Evaluation (decides pass/fail)" and "Workflow Graph Trace (informational)". Found and fixed a real bug in the process: run-suite was picking the workflow's *highest-numbered* version, which for the flagship workflow is the unpublished draft seeded for Change Impact Lab — switched to prefer the published version.
2. Rewrote the 5 template-matched demo contracts' seeded business rules and scenarios (previously generic `{seed: N}` placeholders unrelated to any real field) to use realistic field-shaped input data aligned with their new industry template graphs, so the new dual-trace view has something meaningful to show instead of always falling through to the same default branch. Deliberately left a couple of cases where the contract's rule and the graph's own condition disagree (e.g. Lead Qualification Routing's rule gates at score > 50 while the graph's node gates at > 70) — that mismatch is itself a realistic "the contract doesn't match what was actually built" finding, which is exactly what this feature exists to surface.
3. **Added tests for the core business logic** (`server/src/services/ruleEngine.test.ts`, `workflowInterpreter.test.ts` — 24 tests, `npm test` in `server/`): rule evaluation per operator, AND/OR folding, graph validation (missing trigger, duplicate trigger, dangling edges, condition nodes missing a branch, cycles, dead-end nodes), and full interpreter traversal (activate+verify, immediate reject, simulated timeout, simulated silent failure caught by verification).

Not yet done from that list: live Change Impact Lab simulation runs (still reads the one seeded comparison), a real "trigger an execution" action in Execution Center, and the remaining UX scaffolding (toasts, working command palette/search/notifications). Next session should pick up there.

## Fixed: UI "breaking" on Workflow Studio
Root cause: React Flow's internal resize/fit-view logic triggers the browser's `ResizeObserver loop completed with undelivered notifications` condition, which Vite's dev error overlay surfaces as a full-page red crash screen even though the error is benign and the app underneath is fine. Fixed at the source in `client/src/main.tsx` by wrapping the global `ResizeObserver` constructor to debounce its callback via `requestAnimationFrame`, which prevents the loop from occurring at all (not just suppressing the symptom).

A second, unrelated thing surfaced during investigation: the backend's `tsx watch` dev process occasionally throws `EADDRINUSE` on a hot-restart race (old child hasn't released the port yet when the new one tries to bind) and visibly crashes in its log — but the old child process stays alive and keeps serving correctly, so this looks alarming in logs but is not an actual outage. Confirmed via direct API calls that the live backend was serving current code throughout. No code change needed for this; noted here so a future session doesn't chase a phantom bug from a stale crash log.

## Added: Workflow Template Library (industry examples)
Added 5 complex, multi-branch example workflows — one per remaining major industry (SaaS Subscriptions already has the flagship Subscription Activation workflow) — because the originally seeded "other" workflows all shared one trivial trigger→condition→action→verify→end graph, which didn't showcase real branching.

- `server/src/data/workflowTemplates.ts`: `Order Refund Processing` (E-commerce, 3 conditions / 4 terminal outcomes: completed, window-expired, on-hold, invalid-state), `Lead Qualification Routing` (CRM, 2 conditions / 3 outcomes: senior rep, mid rep, nurture queue), `Invoice Reconciliation` (Finance Operations, 2 conditions / 3 outcomes: reconciled, partial, rejected), `Support Ticket Escalation` (Customer Support, 2 conditions / 3 outcomes: on-call, senior support, no escalation), `Employee Onboarding Provisioning` (HR Operations, 2 conditions / 3 outcomes: engineering, remote, office). Each exercises all 7 node types across its branches (condition, transform, setVariable, mockApiAction with a real effect, verifyOutcome).
- `GET /api/workflow-templates` lists them; `POST /api/workflows` accepts an optional `templateKey` to start a new workflow from one instead of the trivial default graph.
- `prisma/seed.ts` now matches these templates onto the 5 demo workflows that share their names, so the seeded dataset itself shows real branching, not just Workflow Studio's "New Workflow" dialog.
- Workflow Studio's "New Workflow" dialog now shows the template library grouped with its industry badge, next to the manual name/domain/description fields — pick a template to prefill, or leave it blank to start from the minimal trigger→end graph.
- Verified every template validates cleanly through the real interpreter and exercises every one of its distinct terminal branches correctly (checked via direct API test-runs, not just visually) — e.g. Order Refund Processing was run through all 4 outcomes, Employee Onboarding Provisioning through all 3.

## Completed (Phase 4 — Workflow Studio)
- `server/src/services/workflowInterpreter.ts`: deterministic graph interpreter. Validates the graph first (exactly one trigger, no dangling edges, condition nodes must have both a `true` and `false` branch, cycle detection via DFS coloring — loops are rejected, not executed) then traverses from the trigger node, evaluating `condition` (reuses the rule engine's single-rule evaluator), `transform` (sets one field), `setVariable` (literal or `$field.path` copy), `mockApiAction` (applies a configured on-success `effect`, or fails cleanly on `simulate: "TIMEOUT"`, or silently skips the effect on `simulate: "SILENT_FAILURE"` — this is what lets a "technically successful but no state change" case exist for Outcome Assurance to catch), `verifyOutcome` (compares actual vs. expected field value), and `end` (terminal). No arbitrary JS execution anywhere.
- `server/src/routes/workflows.ts`: extended with `POST /` (create with a minimal default graph), `GET /:id` (with all versions), `POST /:id/versions` (new version, optionally cloned), `PATCH /:id/versions/:versionId` (edit graph — blocked once a version is published, since published versions are immutable), `POST /:id/versions/:versionId/validate`, `POST /:id/versions/:versionId/test` (runs the interpreter, persists nothing — side-effect-free as required), `POST /:id/publish` (validates first, then flips `isPublished` atomically and sets workflow status).
- Updated the seeded flagship graph's `mockApiAction` node to carry a real `effect` (`subscription.status → ACTIVE`) so the interpreter demo is meaningful. Verified by hand against all four key paths: valid payment → activates and verifies; failed payment → rejects immediately; `simulate: "TIMEOUT"` → stops cleanly at the action node; `simulate: "SILENT_FAILURE"` → action reports success but `verifyOutcome` correctly catches the mismatch.
- `client/src/pages/WorkflowStudio.tsx`: React Flow canvas (pan/zoom/minimap/controls), workflow + version selectors, an "Add Node" menu for all 7 node types, double-click-to-configure via `NodeConfigDialog` (per-type fields), drag-to-connect edges (condition nodes expose separate green/red `true`/`false` handles), Validate/Save/Test/Publish actions. The Test dialog runs the real interpreter against arbitrary JSON input and paints each node's trace status (success/failed) directly on the canvas.
- Verified against the live backend: created a workflow via the API, published it, confirmed `isPublished`/workflow status flipped correctly, then cleaned up the smoke-test row from the seeded dataset.

## Completed (Light/Dark Mode)
- Theme is driven by a `data-theme` attribute on `<html>`, set from `localStorage` on load or the OS `prefers-color-scheme` if nothing is stored, persisted on every toggle (`client/src/store/useAppStore.ts`).
- Tailwind v4 custom variant `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` in `index.css` makes `dark:` utilities key off that attribute instead of the OS setting alone, so the in-app toggle (sun/moon icon in the Topbar) overrides the system preference.
- CSS variables (`--bg`, `--card`, `--border`, `--text`, `--muted`, `--ring`) already carried the base theming; this pass added `dark:` variants to every hardcoded Tailwind color utility across the UI primitives (badge, button, dropdown, select, tabs, skeleton, table row hover), shared components (KpiCard, TagListEditor, RuleBuilder, Sidebar, Topbar), and page-level banners — consolidated the repeated error/warning banner markup into a new `InlineBanner` shared component in the process.

## Completed (Phase 3 remainder — Execution Center + Change Impact Lab)
- `server/src/routes/executions.ts`: execution list + detail (node-by-node timeline, linked outcome verifications).
- `server/src/routes/simulations.ts`: change-simulation list/detail, reading the seeded baseline-vs-proposed comparison.
- `client/src/pages/ExecutionCenter.tsx`: filterable execution list, detail dialog with the node timeline and surfaced error messages. Technical status and business outcome status are always shown as two separate badges, never conflated.
- `client/src/pages/ChangeImpactLab.tsx`: simulation picker, impact stat cards (unchanged/improved/regressed/newly-violated), filterable scenario-level decision diff table. Reads the real seeded `ChangeSimulation` row — this UI does not itself run a new simulation yet; "proposed version → run against the same scenarios" automation is deferred until Workflow Studio (Phase 4) exists to edit/create a proposed version in the first place.

**Phase 3 is now complete**: Scenario Intelligence, Outcome Assurance Ledger, Execution Center, and Change Impact Lab all have working UI and real backend logic.

## Completed (Phase 2 — Core Business Logic: Business Contracts)
- `server/src/routes/workflows.ts`: lightweight list endpoint for linking a contract to a workflow.
- `client/src/pages/contracts/ContractsList.tsx`: searchable/filterable contract table with status badges and duplicate action.
- `client/src/pages/contracts/ContractEditor.tsx`: full structured editor (objective, trigger/preconditions, business rule builder, expected/prohibited outcomes, exceptions, acceptance criteria, KPIs/verification) with a right-side live validation panel, summary counts, and lifecycle transition control (Draft → Under Review → Approved → Active → Archived) that blocks advancing while required fields are missing.
- New shared components: `RuleBuilder`, `TagListEditor`, `StatusBadge`, `Textarea`, `Label`.
- Routes `/contracts`, `/contracts/new`, `/contracts/:id` wired into `App.tsx`, replacing the placeholder.

## Completed (Phase 1 — Premium UI Foundation)
- Monorepo scaffold: `client` (React + TS + Vite + Tailwind v4) and `server` (Express + TS + Prisma + SQLite + Zod), npm workspaces.
- Design system tokens (navy/indigo/violet palette, light+dark CSS variables) in `client/src/index.css`.
- Hand-built shadcn-style primitives in `client/src/components/ui`: button, card, badge, input, table, tabs, dialog, dropdown-menu, select, avatar, separator, skeleton.
- App shell: collapsible `Sidebar` (10 nav sections), `Topbar` (breadcrumb, search, quick create, user menu).
- Full Prisma schema (`server/prisma/schema.prisma`) covering all entities from spec section 14: users, business contracts, business rules, workflows/versions, test scenarios/runs/results, execution records + node traces, change simulations, outcome verifications, approval decisions, audit events.
- Seed script (`server/prisma/seed.ts`): flagship Subscription Payment → Activation workflow/contract/10 scenarios (matching spec section 15 exactly), plus 10 additional workflows across SaaS/E-commerce/CRM/Finance/Support/HR with executions, test runs, outcome verifications, one change simulation, one pending approval.
- `/api/dashboard` route: KPIs computed live from the DB (technical success rate vs. verified business outcome rate kept separate, as required — no hardcoded percentages).
- `/api/contracts` route: full CRUD + status transition (lifecycle guard) + duplicate.
- **Overview dashboard** page: fully functional, fetches real KPIs, renders technical-vs-outcome split as paired donut charts, "automations at risk" card.
- Other 9 nav routes exist and render an honest "Phase N — not yet built" empty state (no fake functionality).

## Verified working
- `npm run dev --workspace=server` on port 4100, `/api/health` and `/api/dashboard` return real computed data.
- Client dev server (Vite auto-picks a free port on this shared machine — check its terminal output for the URL; proxies `/api` to `localhost:4100`).
- `npx tsc --noEmit` passes on the client.

## Not yet built (optional / explicitly deferred — see `docs/05-traceability-and-roadmap.md`)
- Change Impact Lab still only displays the one seeded `ChangeSimulation`; it doesn't yet let a user pick two versions and run a fresh comparison from the UI.
- No live "run a real execution" trigger — `ExecutionRecord`/`NodeExecutionTrace`/`OutcomeVerification` rows are seed-script-only.
- Topbar command palette, global search, and notification bell are decorative, not wired to real logic. No toast notification system yet.
- AI Automation Architect (explicitly optional per the original spec, and last).
- Undo/redo on the Workflow Studio canvas (spec says "where feasible" — not prioritized over the interpreter/validation work).
- No real authentication; three demo personas exist as seeded `User` rows, switchable in Settings, but nothing is gated server-side by persona.

## Known issues / notes
- Dev ports collide with other projects on this machine. Current working ports: server `4155` (`server/.env`), client `5327` (`client/vite.config.ts`). Vite's/`tsx`'s configured port may be auto-incremented if taken — always check the terminal's printed URL rather than assuming a fixed port.
- `npm audit` on `server` reports dev-only vulnerabilities in `vitest`'s bundled `vite`/`esbuild`/`tinypool` (test runner only, not shipped code). Not addressed — fixing requires a vitest v5 major bump that currently conflicts with other deps; low priority for a portfolio demo.
- Business rule AND/OR grouping is a flat left-to-right fold, not full parenthesized grouping.

## Next step
All 5 phases of the original build plan are complete and verified. Pick up from `docs/05-traceability-and-roadmap.md`'s roadmap section for the highest-value next increment (live Change Impact runs, a real execution trigger, or the decorative UX scaffolding).
