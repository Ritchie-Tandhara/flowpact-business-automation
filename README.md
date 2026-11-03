# FlowPact

**Define the outcome. Prove the logic. Automate with confidence.**

A business-verified automation studio — a flagship portfolio project for a Senior Technical Business Analyst / Product Owner. It is **not** another visual workflow builder. Most automation tools (n8n, Zapier, Make) answer "did the workflow run?" FlowPact answers the harder question: **did it achieve the business outcome it was built for?**

## Why this is different

A workflow calling an API and getting `200 OK` back is not the same thing as the business outcome actually happening. FlowPact is built around that gap, through four capabilities:

| Capability | What it does |
|---|---|
| **Business Outcome Contracts** | Define what an automation must accomplish, what gates it, and what must never happen — independent of how it's implemented. |
| **Scenario Intelligence** | Positive/negative/boundary/exception/regression test cases, run against both the contract's business rules *and* the real workflow graph, with a rule-coverage metric distinct from scenario count. |
| **Change Impact Lab** | Compare a baseline and a proposed workflow version against the same scenario suite before you publish. |
| **Outcome Assurance Ledger** | Verifies expected vs. observed destination state after execution. A *technically successful* run can still be flagged as a business contract violation — this is the whole point. |

The flagship worked example: **Subscription Payment → Subscription Activation**, including a reproduced "silent failure" (the activation API reports success, but the destination state never actually changes) that only Outcome Assurance catches.

## What's real vs. simulated

- **Real:** the business rule engine, the workflow graph interpreter (deterministic traversal, no arbitrary code execution), scenario pass/fail computation, outcome verification (derived from a deep state comparison, never settable by a user), the approval gate (blocks on failing tests unless explicitly overridden as an authorized exception with a recorded reason), light/dark mode, 24 automated tests on the core logic.
- **Simulated, and labeled as such everywhere it appears:** external API calls (`mockApiAction` nodes hit `/mock/...` endpoints that exist only inside the interpreter, never a real network call).
- **Not yet built** (see `docs/05-traceability-and-roadmap.md` for the full list): a live "run a fresh Change Impact comparison" action, a live "trigger a real execution" button, a working command palette/search/notifications, real authentication.

## Screenshots

Not included in this repo — run it locally (two commands, below) to see the UI. The Overview dashboard, Workflow Studio canvas, and Scenario Intelligence's dual rule/graph trace view are the most representative screens.

## Tech stack

**Client:** React, TypeScript, Vite, Tailwind CSS v4, hand-built shadcn-style components, React Flow (`@xyflow/react`), Recharts, React Router, Zustand.
**Server:** Node.js, Express, TypeScript, SQLite, Prisma, Zod, Vitest.

## Getting started

```bash
git clone https://github.com/Ritchie-Tandhara/flowpact-business-automation.git
cd flowpact-business-automation
npm install
cp server/.env.example server/.env   # see note on ports below
npm run migrate
npm run seed
npm run dev
```

`npm run dev` starts the Express API and the Vite dev server together (`concurrently`). Watch the terminal output for the actual URLs — if the configured ports (`4155` for the API, `5327` for the client) are already in use on your machine, Vite/`tsx` will pick the next free one and print it.

To run the test suite:
```bash
npm test
```

## Business rules, concretely

The Subscription Activation contract's rules:
```
payment.status EQUALS SUCCESS
AND subscription.status NOT_EQUALS ACTIVE
AND payment.customerId IS_NOT_EMPTY
```
Running the full scenario suite against this contract yields **8/10 passing** — the 2 failures (invalid signature, zero amount) are a genuine, intentional finding: these rules don't actually check signature validity or payment amount, so those negative-path scenarios aren't caught. That gap is exactly what Scenario Intelligence exists to surface, not a bug to quietly fix.

## Key API endpoints

Full index in `docs/03-architecture.md`. Highlights:
- `POST /api/scenarios/run-suite` — runs every scenario for a contract through the rule engine **and** (when the linked workflow's graph is valid) the real interpreter, storing both traces.
- `POST /api/workflows/:id/versions/:versionId/test` — side-effect-free test execution of a workflow graph against arbitrary JSON input.
- `POST /api/outcomes/:id/reverify` — recomputes `VERIFIED`/`MISMATCH` from a deep comparison; status is never user-settable directly.
- `POST /api/approvals/:id/decide` — blocks approval on failing tests unless `isException: true` with a reason.

## Testing approach

Automated tests target the two pieces of logic a user actually needs to trust: the business rule engine and the workflow graph interpreter (`server/src/services/*.test.ts`, 24 tests, `npm test --workspace=server`). Decorative UI is not unit-tested; it was instead verified by direct, live API calls against the running backend throughout development (see `docs/05-traceability-and-roadmap.md`'s traceability matrix for what was checked and how).

## BA deliverables

The `/docs` directory is a condensed but complete BA documentation set, connected to what's actually implemented rather than written speculatively:
- `01-product-vision-and-prd.md` — vision, problem statement, PRD, functional & non-functional requirements
- `02-business-contract-spec.md` — contract spec, Gherkin user stories, decision tables
- `03-architecture.md` — architecture overview, ER diagram, API specification
- `04-testing-and-verification.md` — scenario testing matrix, change impact methodology, outcome verification logic
- `05-traceability-and-roadmap.md` — requirements traceability matrix, known limitations, roadmap

`IMPLEMENTATION_STATUS.md` at the repo root is the running build log — what's done, what's verified, what's next — kept up to date across the whole build rather than written once at the end.

## Limitations

See `docs/05-traceability-and-roadmap.md` for the full, honest list: flat (not nested) AND/OR rule grouping, Change Impact Lab reads seeded data rather than running fresh comparisons, no live execution trigger, decorative command palette/search/notifications, no real authentication.

## Future enhancements

Wire Change Impact Lab to run fresh comparisons; add a live "Run Execution" action; build a working toast/command-palette/notification layer; true nested rule grouping; an optional AI Automation Architect for deterministic template-based drafting from plain-English instructions; real auth.
