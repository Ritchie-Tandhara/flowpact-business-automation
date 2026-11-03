# FlowPact — Implementation Status

## Completed (Phase 3 — Scenario Intelligence + Outcome Assurance Ledger)
- `server/src/services/ruleEngine.ts`: deterministic business-rule evaluator (dot-path lookup, all 7 operators, AND/OR folding per rule's `logicGroup`). This evaluates contract business rules against scenario input data — it is **not** the full workflow graph interpreter (that's Phase 4's Workflow Studio); scope is intentionally limited to precondition/rule checking, documented as such in the UI and here.
- `server/src/routes/scenarios.ts`: CRUD + `POST /scenarios/run-suite` — runs every scenario for a contract through the rule engine, persists a real `TestRun`/`TestRunResult` set (no randomization), and returns rule coverage (`covered rule fields / total rule fields × 100`, distinct from scenario count per spec). Running is blocked with a clear 409 if the contract has no linked workflow version.
- `server/src/routes/outcomes.ts`: ledger list/detail, `POST /outcomes/:id/reverify` (recomputes VERIFIED/MISMATCH by deep-comparing stored expected vs. observed state — status is never user-settable), `PATCH /outcomes/:id/resolution` (resolution workflow requires a note to close out a mismatch; this never flips `status` itself).
- `client/src/pages/ScenarioIntelligence.tsx`: contract selector, stat cards, expandable test result matrix showing per-rule pass/fail trace, "Run Suite" action.
- `client/src/pages/OutcomeAssurance.tsx`: filterable ledger table, detail dialog with expected/observed state diff, reverify, and a resolution flow (Accept Risk / Mark Resolved) gated on providing a note.
- Verified against real data: running the flagship Subscription Activation suite returns 8/10 passed — the 2 failures are a genuine finding (the contract's 3 rules don't check payment signature or amount, so "Invalid signature" and "Incorrect payment amount" scenarios aren't actually caught), not a bug. This is the kind of gap Scenario Intelligence exists to surface.

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
- **Phase 3 remainder**: Change Impact Lab and Execution Center UI (backend tables + seed data, including one seeded `ChangeSimulation`, already exist; no routes/UI yet).
- **Phase 4**: Workflow Studio — React Flow canvas, node config panels, workflow interpreter (JSON graph schema is already seeded).
- **Phase 5**: Approvals UI, AI Automation Architect (optional), Analytics drill-downs, `/docs` BA documentation set, final README.

## Known issues / notes
- Dev ports collide with other projects on this machine. Current working ports: server `4155` (`server/.env`), client proxy target matches. Vite's configured port may be auto-incremented if taken — always check the terminal's printed URL rather than assuming a fixed port.
- `npm audit` on `server` reports dev-only vulnerabilities in `vitest`'s bundled `vite`/`esbuild`/`tinypool` (test runner only, not shipped code). Not addressed — fixing requires a vitest v5 major bump that currently conflicts with other deps; low priority for a portfolio demo.
- No authentication is implemented yet; three demo personas (Business Analyst, Automation Developer, Business Approver) exist as seeded `User` rows with no login gate.

## Next step
Finish Phase 3: Change Impact Lab (baseline vs. proposed version comparison UI, reading the seeded `ChangeSimulation`) and Execution Center (execution list + node-trace timeline view).
