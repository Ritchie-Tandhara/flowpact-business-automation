# FlowPact — Implementation Status

## Completed (Phase 3 — Scenario Intelligence + Outcome Assurance Ledger)
- `server/src/services/ruleEngine.ts`: deterministic business-rule evaluator (dot-path lookup, all 7 operators, AND/OR folding per rule's `logicGroup`). This evaluates contract business rules against scenario input data — it is **not** the full workflow graph interpreter (that's Phase 4's Workflow Studio); scope is intentionally limited to precondition/rule checking, documented as such in the UI and here.
- `server/src/routes/scenarios.ts`: CRUD + `POST /scenarios/run-suite` — runs every scenario for a contract through the rule engine, persists a real `TestRun`/`TestRunResult` set (no randomization), and returns rule coverage (`covered rule fields / total rule fields × 100`, distinct from scenario count per spec). Running is blocked with a clear 409 if the contract has no linked workflow version.
- `server/src/routes/outcomes.ts`: ledger list/detail, `POST /outcomes/:id/reverify` (recomputes VERIFIED/MISMATCH by deep-comparing stored expected vs. observed state — status is never user-settable), `PATCH /outcomes/:id/resolution` (resolution workflow requires a note to close out a mismatch; this never flips `status` itself).
- `client/src/pages/ScenarioIntelligence.tsx`: contract selector, stat cards, expandable test result matrix showing per-rule pass/fail trace, "Run Suite" action.
- `client/src/pages/OutcomeAssurance.tsx`: filterable ledger table, detail dialog with expected/observed state diff, reverify, and a resolution flow (Accept Risk / Mark Resolved) gated on providing a note.
- Verified against real data: running the flagship Subscription Activation suite returns 8/10 passed — the 2 failures are a genuine finding (the contract's 3 rules don't check payment signature or amount, so "Invalid signature" and "Incorrect payment amount" scenarios aren't actually caught), not a bug. This is the kind of gap Scenario Intelligence exists to surface.

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

## Not yet built (by phase)
- **Phase 5**: Approvals UI, AI Automation Architect (optional), Analytics drill-downs, `/docs` BA documentation set, final README.
- Change Impact Lab still only displays the one seeded `ChangeSimulation`; wiring "create a new proposed version in Workflow Studio → run it against the same scenario suite → save a fresh simulation" is a natural next connective piece now that Workflow Studio exists, but is not built yet.
- Undo/redo on the canvas is not implemented (spec says "where feasible" — React Flow doesn't provide it for free, and it wasn't prioritized over the interpreter/validation work).
- **Phase 5**: Approvals UI, AI Automation Architect (optional), Analytics drill-downs, `/docs` BA documentation set, final README.

## Known issues / notes
- Dev ports collide with other projects on this machine. Current working ports: server `4155` (`server/.env`), client proxy target matches. Vite's configured port may be auto-incremented if taken — always check the terminal's printed URL rather than assuming a fixed port.
- `npm audit` on `server` reports dev-only vulnerabilities in `vitest`'s bundled `vite`/`esbuild`/`tinypool` (test runner only, not shipped code). Not addressed — fixing requires a vitest v5 major bump that currently conflicts with other deps; low priority for a portfolio demo.
- No authentication is implemented yet; three demo personas (Business Analyst, Automation Developer, Business Approver) exist as seeded `User` rows with no login gate.

## Next step
Build Phase 5: Approvals UI (the data model and one seeded `ApprovalDecision` already exist), then the BA documentation set in `/docs` and the final portfolio README.
