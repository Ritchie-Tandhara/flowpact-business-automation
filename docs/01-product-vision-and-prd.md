# Product Vision & PRD

## Product Vision

FlowPact is a business-verified automation studio. Most automation platforms (n8n, Zapier, Make) answer "did the workflow run?" FlowPact answers the harder question: **"did the workflow actually achieve the business outcome it was built for?"** It does this by treating a business contract — not a node graph — as the source of truth, and by verifying destination state after execution rather than trusting a technical success response.

**Tagline:** Define the outcome. Prove the logic. Automate with confidence.

## Problem Statement

A workflow calling an external API and receiving `200 OK` is not the same as the business outcome actually happening. In the flagship example built into this product — activating a subscription after a successful payment — a real incident category is: the activation call returns success, but the destination system's state never actually changes (a "silent failure"). Conventional automation tooling has no way to express or detect this distinction. It also has no structured way to ask "if I change this workflow, what regresses?" before shipping the change, and no way to connect a test scenario back to the specific business rule it's meant to exercise.

## Four Flagship Capabilities (USPs)

1. **Business Outcome Contracts** — define what an automation must accomplish, what conditions gate it, and what must never happen, independent of how it's implemented.
2. **Scenario Intelligence** — positive/negative/boundary/exception/regression test cases, run against both the contract's business rules and (when available) the real workflow graph, with a business-rule-coverage metric distinct from scenario count.
3. **Change Impact Lab** — compare a baseline and a proposed workflow version against the same scenario suite to catch regressions before publishing.
4. **Outcome Assurance Ledger** — verify expected vs. observed destination state after execution; a technically successful execution can still be flagged as a business contract violation.

## In Scope / Out of Scope

**In scope:** the full journey from contract → workflow → scenario → simulation → approval → execution → verification, for one realistic flagship use case (subscription payment activation) plus five additional industry examples, with a working visual workflow builder and a real (if deliberately simple) graph interpreter.

**Out of scope (see `05-traceability-and-roadmap.md` for why):** real third-party connectors, authentication/authorization infrastructure beyond three demo personas, horizontal scaling, and an AI-generated-workflow feature beyond deterministic templates.

## Functional Requirements (summary — see `02-business-contract-spec.md` for Gherkin-level detail)

- FR1: Users can create, edit, duplicate, and transition the lifecycle status of a Business Contract, with a business rule builder supporting 7 operators and AND/OR grouping.
- FR2: Users can build a workflow visually from 7 node types, connect them into a validated DAG, and run a side-effect-free test execution against arbitrary input.
- FR3: Users can author and run scenarios against a contract; results are computed, not asserted, and a business-rule-coverage percentage is computed from actual field references in scenario input.
- FR4: Users can compare two workflow versions against the same scenario set and see which decisions changed.
- FR5: The system computes outcome verification status (`VERIFIED` / `MISMATCH` / `PENDING_VERIFICATION` / `UNABLE_TO_VERIFY`) from a deep comparison of expected vs. observed state; this status is never directly settable by a user.
- FR6: Users can submit a workflow version for approval; approval is blocked if the latest test run has failures or the contract has no acceptance criteria, unless explicitly overridden as an authorized exception with a recorded reason.

## Non-Functional Requirements

- **NFR1 (Honesty of simulation):** nothing in the product may claim a mocked or simulated result is a real external integration. Mock actions are labeled as such everywhere they appear.
- **NFR2 (Determinism):** the workflow interpreter and rule engine must be deterministic — no arbitrary code execution, no randomness in decision logic. (Randomness is used only in seed data generation, never in product logic.)
- **NFR3 (Lightweight footprint):** SQLite + a single Express process; no required external services. The whole app must run with `npm install && npm run migrate && npm run seed && npm run dev` from a clean checkout.
- **NFR4 (Accessibility/theming):** light and dark mode with WCAG-reasonable contrast in both.
- **NFR5 (Test coverage of logic, not pixels):** the rule engine and workflow interpreter — the two pieces of logic a user must be able to trust — have automated test coverage; decorative UI does not.
