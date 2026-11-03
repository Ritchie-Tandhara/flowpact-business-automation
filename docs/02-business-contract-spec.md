# Business Outcome Contract Specification & User Stories

## Contract Lifecycle

```
DRAFT --submit--> UNDER_REVIEW --approve--> APPROVED --activate--> ACTIVE --archive--> ARCHIVED
  ^                    |
  └────── send back ───┘
```

Enforced server-side in `server/src/routes/contracts.ts` (`allowedTransitions` map) — an API call attempting an invalid transition (e.g. `ACTIVE → DRAFT`) returns `409`.

## Contract Fields

| Field | Purpose |
|---|---|
| `businessObjective` | Free text: what outcome must this automation guarantee |
| `trigger` | What starts it |
| `preconditions` | Must hold before the automation may act |
| `businessRules` | Structured, evaluable conditions (field / operator / value / AND·OR) |
| `expectedOutcomes` / `prohibitedOutcomes` | What must and must never be true afterward |
| `exceptions` | Named carve-outs (e.g. "already-active is a no-op, not a violation") |
| `acceptanceCriteria` | Gherkin-style sentences, gate contract activation and approval |
| `kpis` | Named metrics this contract cares about |
| `verificationMethod` | How destination state will be checked |

## Business Rule Operators

`EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, `CONTAINS`, `IS_EMPTY`, `IS_NOT_EMPTY` — implemented in `server/src/services/ruleEngine.ts`. Rules combine left-to-right using each rule's own `logicGroup` (`AND`/`OR`) folded against the running result of the rules before it — this is a flat fold, not full parenthesized grouping; documented as a known limitation in `05-traceability-and-roadmap.md`.

## User Stories (Gherkin)

### US-1: Create a business contract
```gherkin
Given I am a Business Analyst
When I create a new contract with a business objective, trigger, and at least one business rule
Then the contract is saved in DRAFT status
And it appears in the Business Contracts list
```

### US-2: Cannot activate an incomplete contract
```gherkin
Given a contract is in DRAFT status
And it is missing a business owner
When I attempt to transition it to UNDER_REVIEW
Then the validation panel lists "Business owner" as missing
And the transition button is disabled
```

### US-3: Scenario pass/fail reflects real rule evaluation
```gherkin
Given a contract with business rules [payment.status EQUALS SUCCESS] AND [subscription.status NOT_EQUALS ACTIVE]
And a scenario with input {payment: {status: SUCCESS}, subscription: {status: ACTIVE}}
When I run the scenario suite
Then the rule evaluation reports "blocked" for this scenario
And if the scenario's expected decision is NO_OP, the scenario PASSES (duplicate activation is correctly prevented)
```

### US-4: A technically successful execution can still violate the contract
```gherkin
Given a workflow executes a mock API action that reports success
But a simulated silent failure means the destination field was never actually set
When the Verify Outcome node checks that field
Then the node is marked FAILED
And the resulting Outcome Verification record is MISMATCH, not VERIFIED
```

### US-5: Approval is blocked on failing tests, unless an authorized exception is recorded
```gherkin
Given a workflow version has a submitted approval
And its latest test run has 1 failing scenario
When a reviewer attempts to approve it without marking it an exception
Then the API returns 409 with the failing-scenario count
When the reviewer instead approves it as an authorized exception with a reason
Then the approval is recorded as APPROVED with isException=true and the reason persisted
```

## Decision Table: Subscription Activation (flagship)

| Payment Status | Already Active? | Signature Valid | Amount | Decision |
|---|---|---|---|---|
| SUCCESS | No | Yes | > 0 | Activate, then verify |
| SUCCESS | Yes | Yes | > 0 | No-op (idempotent) |
| FAILED | — | — | — | Reject |
| SUCCESS | No | No | > 0 | Reject (not enforced by the 3 seeded contract rules — a real, intentional coverage gap Scenario Intelligence surfaces) |
| SUCCESS | No | Yes | 0 | Reject (same coverage gap as above) |

## Decision Table: Order Refund Processing (industry template)

| Delivery Status | Within Return Window | Outcome |
|---|---|---|
| DELIVERED | true | Refund Completed |
| DELIVERED | false | Rejected — window expired |
| IN_TRANSIT | — | On Hold — awaiting delivery |
| anything else (e.g. CANCELLED, missing) | — | Rejected — invalid order state |
