# Scenario Testing, Change Impact Methodology & Outcome Verification Logic

## Scenario Testing Matrix

Every scenario carries a `testType` of `POSITIVE`, `NEGATIVE`, `BOUNDARY`, `EXCEPTION`, or `REGRESSION`. The flagship Subscription Activation contract exercises all five:

| Test Type | Scenario | Expected Decision |
|---|---|---|
| POSITIVE | Valid successful payment | ACTIVATE |
| NEGATIVE | Failed payment | REJECT |
| REGRESSION | Duplicate payment webhook (already active) | NO_OP |
| EXCEPTION | Invalid signature | REJECT |
| EXCEPTION | API timeout during activation | ACTIVATE (interpreter stops cleanly at the action node; this is a technical failure, not a business rule rejection) |
| BOUNDARY | Activation API reports success but destination stays inactive | ACTIVATE (rule-level), but the graph trace's `verifyOutcome` node correctly reports `FAILED` — this is the product's core differentiator in action |
| EXCEPTION | Missing customer ID | REJECT |
| BOUNDARY | Incorrect payment amount (0) | REJECT |
| REGRESSION | Already-active subscription | NO_OP |
| REGRESSION | Repeated webhook after completion | NO_OP |

## Two Independent Checks, One Scenario Run

`POST /api/scenarios/run-suite` runs each scenario through **two** independent mechanisms and stores both:

1. **Business Rule Evaluation** (`ruleEngine.ts`) — evaluates the contract's structured business rules against the scenario's input. This is what decides PASS/FAIL for the scenario.
2. **Workflow Graph Trace** (`workflowInterpreter.ts`) — when the linked workflow version's graph is valid, the exact same input is run through the real node graph. This is informational only, shown in the Scenario Intelligence detail view, and is not used for pass/fail.

This split exists because the two can legitimately disagree — the contract's rules might not cover everything the graph actually implements, or vice versa. That disagreement is itself a finding (see `02-business-contract-spec.md`'s decision tables for two concrete examples), not a bug to "fix" by making them artificially agree.

## Business Rule Coverage

```
Rule Coverage % = (business rule fields referenced by at least one scenario's input) / (total business rule fields) × 100
```

Deliberately distinct from scenario count — ten scenarios that never reference a given rule's field contribute nothing to that rule's coverage. Computed in `scenarios.ts`'s `run-suite` handler and again, per-contract, in `analytics.ts`'s `/scenario-coverage`.

## Change Impact Methodology

1. Select a baseline workflow version and a proposed version.
2. Run (or, currently, read a previously-run) comparison of both versions against the same scenario inputs.
3. Classify each scenario's outcome as `UNCHANGED`, `IMPROVED`, or `REGRESSED` relative to the baseline.
4. Surface aggregate counts (unchanged / improved / regressed / newly-violated-contracts) plus the full per-scenario diff table.

**Current limitation:** Change Impact Lab reads a `ChangeSimulation` row seeded ahead of time; it does not yet let a user pick two arbitrary versions and trigger a fresh comparison from the UI. The backend data model fully supports it — `ChangeSimulation` just needs a `POST` endpoint that runs both versions through `workflowInterpreter.runWorkflow()` against a chosen scenario suite and persists the diff. Tracked in `05-traceability-and-roadmap.md`.

## Outcome Verification Logic

```
status = deepEqual(expectedState, observedState) ? VERIFIED : MISMATCH
```

This comparison is the **only** way `OutcomeVerification.status` changes (`POST /outcomes/:id/reverify`). There is deliberately no endpoint that lets a user set `status` directly — only `resolutionStatus` (`OPEN` / `RESOLVED` / `ACCEPTED_RISK`) is user-settable, and only with a required note when closing out a `MISMATCH`. This is the enforcement of the spec's own rule: "Do not let users manually mark a mismatch as verified without the required evidence."

### Where a mismatch comes from, concretely

The interpreter's `mockApiAction` node supports a `simulate: "SILENT_FAILURE"` input flag: the action reports `SUCCESS` (a real API would return `200 OK`) but does not apply its configured `effect` (so the destination field never actually changes). The downstream `verifyOutcome` node then compares the actual field value to the expected one and reports `FAILED`. This is the exact "technical success, business failure" case the Outcome Assurance Ledger exists to catch, reproduced deterministically rather than hardcoded as demo data.
