# Requirements Traceability Matrix, Known Limitations & Roadmap

## Requirements Traceability Matrix

| Requirement | Implemented in | Verified by |
|---|---|---|
| FR1 — Contract CRUD + lifecycle + rule builder | `server/src/routes/contracts.ts`, `client/src/pages/contracts/*` | Manual API walkthrough (create → transition → block on missing fields) |
| FR2 — Visual workflow builder + validated DAG + side-effect-free test | `server/src/services/workflowInterpreter.ts`, `client/src/pages/WorkflowStudio.tsx` | 12 `workflowInterpreter.test.ts` cases; live API test-runs of all 6 seeded workflow graphs |
| FR3 — Scenario authoring/run + coverage metric | `server/src/routes/scenarios.ts` | Live run-suite calls against flagship + 5 template contracts, inspected trace output |
| FR4 — Change Impact comparison | `server/src/routes/simulations.ts` | Reads one seeded `ChangeSimulation`; **not yet** backed by a live "run a new comparison" endpoint (see Known Limitations) |
| FR5 — Outcome verification derived from state comparison | `server/src/routes/outcomes.ts` | Live reverify call against a VERIFIED and a MISMATCH record |
| FR6 — Approval gate + authorized exception | `server/src/routes/approvals.ts` | Live decide call: confirmed a 409 block on failing tests, then confirmed the exception override works and records the reason |
| NFR1 — No fabricated integrations | All `mockApiAction` configs name a `/mock/...` endpoint | Code review of `workflowTemplates.ts` and the seed script |
| NFR2 — Deterministic logic, no arbitrary code execution | `ruleEngine.ts`, `workflowInterpreter.ts` | No `eval`/`Function` constructor anywhere in either file (code review) |
| NFR5 — Business logic has test coverage | `ruleEngine.test.ts`, `workflowInterpreter.test.ts` | `npm test` in `server/` — 24/24 passing |

## Known Limitations

- **Business rule grouping is a flat left-to-right fold**, not full parenthesized AND/OR grouping. A rule set like `A AND (B OR C)` cannot be expressed; only `A AND B OR C` (evaluated strictly in order) can.
- **Change Impact Lab is read-only against seeded data.** The UI does not yet trigger a fresh simulation from two arbitrary versions.
- **No live "run a real execution" trigger.** `ExecutionRecord` / `NodeExecutionTrace` / `OutcomeVerification` rows are currently populated only by the seed script, not by a user-initiated action in Execution Center.
- **Topbar command palette, global search, and notification bell are decorative** — they render but are not wired to real search/command/notification logic.
- **No real authentication.** Three demo personas exist as seeded `User` rows with roles; `Settings` lets a user switch which persona they're "acting as," but nothing is actually gated behind it server-side.
- **Scenario input data for the 5 non-template-matched "filler" demo workflows** (Cart Abandonment Recovery, Customer Churn Risk Alert, Chargeback Dispute Handling, PTO Request Approval, Ticket Auto-Triage) is still generic placeholder data, not hand-tailored like the flagship and the 5 industry-template workflows.
- **Dev ports are not fixed system-wide.** On a machine already running other Vite/Express projects, the dev servers may auto-increment past the configured port — always check the terminal's printed URL.

## Roadmap

**Near-term (natural next session):**
1. Wire Change Impact Lab to create and run a fresh `ChangeSimulation` from two chosen versions, using `workflowInterpreter.runWorkflow()` for both.
2. Add a "Run Execution" action (Execution Center or Workflow Studio) that actually invokes the interpreter against a published version and persists real `ExecutionRecord`/`NodeExecutionTrace`/`OutcomeVerification` rows.
3. Replace the decorative Topbar command palette/search/notifications with working implementations, and add a toast notification system (listed in the original spec's reusable component set but not yet built).

**Later / explicitly optional per the original spec:**
4. AI Automation Architect — deterministic template-based drafting assistant for new contracts/workflows from a plain-English instruction (spec explicitly makes this optional and last).
5. True nested AND/OR rule grouping in the Business Rule Builder.
6. Real authentication gating actions by persona/role server-side, beyond the current demo-only switch.
