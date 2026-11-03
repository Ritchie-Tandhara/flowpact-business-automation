import { PrismaClient } from "@prisma/client"
import { WORKFLOW_TEMPLATES } from "../src/data/workflowTemplates.js"

const prisma = new PrismaClient()

const DOMAINS = ["SaaS Subscriptions", "E-commerce", "CRM", "Finance Operations", "Customer Support", "HR Operations"]

function j(arr: unknown) {
  return JSON.stringify(arr)
}

function randomPastDate(daysBack: number) {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
  return d
}

async function main() {
  console.log("Seeding FlowPact...")

  await prisma.auditEvent.deleteMany()
  await prisma.approvalDecision.deleteMany()
  await prisma.outcomeVerification.deleteMany()
  await prisma.nodeExecutionTrace.deleteMany()
  await prisma.executionRecord.deleteMany()
  await prisma.changeSimulation.deleteMany()
  await prisma.testRunResult.deleteMany()
  await prisma.testRun.deleteMany()
  await prisma.testScenario.deleteMany()
  await prisma.businessRule.deleteMany()
  await prisma.businessContract.deleteMany()
  await prisma.workflowVersion.deleteMany()
  await prisma.workflow.deleteMany()
  await prisma.user.deleteMany()

  const ba = await prisma.user.create({
    data: { name: "Akshay Narkhede", email: "akshay.narkhede@geta.ai", role: "BUSINESS_ANALYST" },
  })
  const dev = await prisma.user.create({
    data: { name: "Priya Shah", email: "priya.shah@flowpact.demo", role: "AUTOMATION_DEVELOPER" },
  })
  const approver = await prisma.user.create({
    data: { name: "Marcus Lee", email: "marcus.lee@flowpact.demo", role: "BUSINESS_APPROVER" },
  })

  // ---------- Flagship workflow: Subscription Payment -> Activation ----------
  const flagshipGraphV1 = {
    nodes: [
      { id: "trigger-1", type: "trigger", position: { x: 0, y: 150 }, data: { name: "Payment Webhook Received", config: { event: "payment.completed" } } },
      { id: "cond-1", type: "condition", position: { x: 250, y: 150 }, data: { name: "Payment Succeeded?", config: { field: "payment.status", operator: "EQUALS", value: "SUCCESS" } } },
      { id: "cond-2", type: "condition", position: { x: 500, y: 60 }, data: { name: "Already Activated?", config: { field: "subscription.status", operator: "EQUALS", value: "ACTIVE" } } },
      { id: "action-1", type: "mockApiAction", position: { x: 750, y: 150 }, data: { name: "Activate Subscription", config: { endpoint: "/mock/subscriptions/activate", effect: { field: "subscription.status", value: "ACTIVE" } } } },
      { id: "verify-1", type: "verifyOutcome", position: { x: 1000, y: 150 }, data: { name: "Verify Subscription Active", config: { field: "subscription.status", expected: "ACTIVE" } } },
      { id: "end-1", type: "end", position: { x: 1250, y: 150 }, data: { name: "Complete" } },
      { id: "end-2", type: "end", position: { x: 500, y: 280 }, data: { name: "Reject - Payment Failed" } },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "cond-1" },
      { id: "e2", source: "cond-1", target: "cond-2", sourceHandle: "true" },
      { id: "e3", source: "cond-1", target: "end-2", sourceHandle: "false" },
      { id: "e4", source: "cond-2", target: "action-1", sourceHandle: "false" },
      { id: "e5", source: "cond-2", target: "end-1", sourceHandle: "true" },
      { id: "e6", source: "action-1", target: "verify-1" },
      { id: "e7", source: "verify-1", target: "end-1" },
    ],
  }

  const flagshipWorkflow = await prisma.workflow.create({
    data: {
      name: "Subscription Payment Activation",
      domain: "SaaS Subscriptions",
      description: "Activates a subscription exactly once when a valid payment succeeds; rejects failed/duplicate payments.",
      status: "PUBLISHED",
      versions: {
        create: [
          { versionNum: 1, graph: j(flagshipGraphV1), isPublished: true },
        ],
      },
    },
    include: { versions: true },
  })
  const flagshipV1 = flagshipWorkflow.versions[0]

  const flagshipContract = await prisma.businessContract.create({
    data: {
      name: "Subscription Activation Contract",
      businessObjective: "When a valid, successful payment is received, activate the correct subscription exactly once. Failed payments must never activate a subscription. Duplicate events must not create duplicate activations.",
      domain: "SaaS Subscriptions",
      ownerId: ba.id,
      workflowId: flagshipWorkflow.id,
      trigger: "payment.completed webhook",
      preconditions: j(["Payment event signature is valid", "Customer ID is present", "Subscription record exists"]),
      expectedOutcomes: j(["subscription.status = ACTIVE", "exactly one activation per payment", "confirmation sent exactly once"]),
      prohibitedOutcomes: j(["subscription activated on failed payment", "duplicate activation on repeated webhook", "activation without destination state verification"]),
      exceptions: j(["Already-active subscription on duplicate webhook is a no-op, not a violation"]),
      acceptanceCriteria: j([
        "Given a successful payment, when the webhook is processed, then the subscription becomes ACTIVE within one execution.",
        "Given a failed payment, when the webhook is processed, then the subscription status is unchanged.",
        "Given a duplicate webhook for an already-active subscription, when processed, then no duplicate activation or notification occurs.",
      ]),
      kpis: j(["Verified Business Outcome Rate", "Duplicate Activation Count"]),
      verificationMethod: "Post-execution state check against mock subscription store",
      status: "ACTIVE",
      businessRules: {
        create: [
          { field: "payment.status", operator: "EQUALS", value: "SUCCESS", logicGroup: "AND", order: 0 },
          { field: "subscription.status", operator: "NOT_EQUALS", value: "ACTIVE", logicGroup: "AND", order: 1 },
          { field: "payment.customerId", operator: "IS_NOT_EMPTY", logicGroup: "AND", order: 2 },
        ],
      },
    },
  })

  const flagshipScenarios = [
    { testType: "POSITIVE", description: "Valid successful payment", inputData: { payment: { status: "SUCCESS", customerId: "cust_1" }, subscription: { status: "INACTIVE" } }, expectedDecision: "ACTIVATE", expectedOutcome: "subscription.status=ACTIVE" },
    { testType: "NEGATIVE", description: "Failed payment", inputData: { payment: { status: "FAILED", customerId: "cust_2" }, subscription: { status: "INACTIVE" } }, expectedDecision: "REJECT", expectedOutcome: "subscription.status=INACTIVE" },
    { testType: "REGRESSION", description: "Duplicate payment webhook", inputData: { payment: { status: "SUCCESS", customerId: "cust_1" }, subscription: { status: "ACTIVE" } }, expectedDecision: "NO_OP", expectedOutcome: "subscription.status=ACTIVE" },
    { testType: "EXCEPTION", description: "Invalid signature", inputData: { payment: { status: "SUCCESS", customerId: "cust_3", validSignature: false }, subscription: { status: "INACTIVE" } }, expectedDecision: "REJECT", expectedOutcome: "subscription.status=INACTIVE" },
    { testType: "EXCEPTION", description: "API timeout during activation", inputData: { payment: { status: "SUCCESS", customerId: "cust_4" }, subscription: { status: "INACTIVE" }, simulate: "TIMEOUT" }, expectedDecision: "ACTIVATE", expectedOutcome: "subscription.status=ACTIVE" },
    { testType: "BOUNDARY", description: "Activation API responds success but destination remains inactive", inputData: { payment: { status: "SUCCESS", customerId: "cust_5" }, subscription: { status: "INACTIVE" }, simulate: "SILENT_FAILURE" }, expectedDecision: "ACTIVATE", expectedOutcome: "subscription.status=ACTIVE" },
    { testType: "EXCEPTION", description: "Missing customer ID", inputData: { payment: { status: "SUCCESS", customerId: "" }, subscription: { status: "INACTIVE" } }, expectedDecision: "REJECT", expectedOutcome: "subscription.status=INACTIVE" },
    { testType: "BOUNDARY", description: "Incorrect payment amount", inputData: { payment: { status: "SUCCESS", customerId: "cust_6", amount: 0 }, subscription: { status: "INACTIVE" } }, expectedDecision: "REJECT", expectedOutcome: "subscription.status=INACTIVE" },
    { testType: "REGRESSION", description: "Already active subscription", inputData: { payment: { status: "SUCCESS", customerId: "cust_7" }, subscription: { status: "ACTIVE" } }, expectedDecision: "NO_OP", expectedOutcome: "subscription.status=ACTIVE" },
    { testType: "REGRESSION", description: "Repeated webhook after successful completion", inputData: { payment: { status: "SUCCESS", customerId: "cust_1" }, subscription: { status: "ACTIVE" } }, expectedDecision: "NO_OP", expectedOutcome: "subscription.status=ACTIVE" },
  ]

  for (const s of flagshipScenarios) {
    await prisma.testScenario.create({
      data: {
        contractId: flagshipContract.id,
        workflowId: flagshipWorkflow.id,
        createdById: ba.id,
        testType: s.testType,
        description: s.description,
        inputData: j(s.inputData),
        preconditions: j([]),
        expectedDecision: s.expectedDecision,
        expectedOutcome: s.expectedOutcome,
        prohibitedActions: j(["duplicate activation", "activation without verification"]),
      },
    })
  }

  // ---------- Additional workflows across industries ----------
  const OTHER_WORKFLOWS = [
    { name: "Order Refund Processing", domain: "E-commerce", description: "Processes refund requests and reconciles inventory." },
    { name: "Lead Qualification Routing", domain: "CRM", description: "Routes qualified leads to the correct sales owner." },
    { name: "Invoice Reconciliation", domain: "Finance Operations", description: "Matches incoming payments to open invoices." },
    { name: "Support Ticket Escalation", domain: "Customer Support", description: "Escalates SLA-breaching tickets to senior agents." },
    { name: "Employee Onboarding Provisioning", domain: "HR Operations", description: "Provisions accounts and equipment for new hires." },
    { name: "Chargeback Dispute Handling", domain: "Finance Operations", description: "Routes chargeback disputes with evidence packets." },
    { name: "Cart Abandonment Recovery", domain: "E-commerce", description: "Sends recovery sequence for abandoned carts." },
    { name: "Customer Churn Risk Alert", domain: "CRM", description: "Flags at-risk accounts for retention outreach." },
    { name: "PTO Request Approval", domain: "HR Operations", description: "Routes PTO requests through manager approval." },
    { name: "Ticket Auto-Triage", domain: "Customer Support", description: "Classifies and assigns incoming support tickets." },
  ]

  const genericGraph = {
    nodes: [
      { id: "trigger-1", type: "trigger", position: { x: 0, y: 100 }, data: { name: "Trigger Event" } },
      { id: "cond-1", type: "condition", position: { x: 250, y: 100 }, data: { name: "Evaluate Rule" } },
      { id: "action-1", type: "mockApiAction", position: { x: 500, y: 100 }, data: { name: "Execute Action" } },
      { id: "verify-1", type: "verifyOutcome", position: { x: 750, y: 100 }, data: { name: "Verify Outcome" } },
      { id: "end-1", type: "end", position: { x: 1000, y: 100 }, data: { name: "Complete" } },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "cond-1" },
      { id: "e2", source: "cond-1", target: "action-1" },
      { id: "e3", source: "action-1", target: "verify-1" },
      { id: "e4", source: "verify-1", target: "end-1" },
    ],
  }

  const allWorkflows = [{ workflow: flagshipWorkflow, version: flagshipV1, contract: flagshipContract }]

  const TEMPLATE_RULES_AND_SCENARIOS: Record<
    string,
    {
      rules: { field: string; operator: string; value?: string }[]
      scenarios: { testType: string; description: string; inputData: unknown; expectedDecision: string; expectedOutcome: string }[]
    }
  > = {
    "Order Refund Processing Contract": {
      rules: [
        { field: "order.deliveryStatus", operator: "EQUALS", value: "DELIVERED" },
        { field: "refund.withinWindow", operator: "EQUALS", value: "true" },
      ],
      scenarios: [
        { testType: "POSITIVE", description: "Delivered order, within return window", inputData: { order: { deliveryStatus: "DELIVERED" }, refund: { withinWindow: "true" } }, expectedDecision: "PROCEED", expectedOutcome: "refund.status=PROCESSED" },
        { testType: "NEGATIVE", description: "Delivered order, return window expired", inputData: { order: { deliveryStatus: "DELIVERED" }, refund: { withinWindow: "false" } }, expectedDecision: "REJECT", expectedOutcome: "refund rejected - window expired" },
        { testType: "BOUNDARY", description: "Order still in transit", inputData: { order: { deliveryStatus: "IN_TRANSIT" } }, expectedDecision: "REJECT", expectedOutcome: "on hold pending delivery" },
        { testType: "EXCEPTION", description: "Order cancelled before delivery", inputData: { order: { deliveryStatus: "CANCELLED" } }, expectedDecision: "REJECT", expectedOutcome: "rejected - invalid order state" },
        { testType: "REGRESSION", description: "Repeated refund request on same eligible order", inputData: { order: { deliveryStatus: "DELIVERED" }, refund: { withinWindow: "true" } }, expectedDecision: "PROCEED", expectedOutcome: "refund.status=PROCESSED" },
        { testType: "EXCEPTION", description: "Missing delivery status entirely", inputData: {}, expectedDecision: "REJECT", expectedOutcome: "rejected - invalid order state" },
      ],
    },
    "Lead Qualification Routing Contract": {
      rules: [
        { field: "lead.score", operator: "GREATER_THAN", value: "50" },
        { field: "lead.source", operator: "IS_NOT_EMPTY" },
      ],
      scenarios: [
        { testType: "POSITIVE", description: "High score lead from paid ads", inputData: { lead: { score: 85, source: "ads" } }, expectedDecision: "PROCEED", expectedOutcome: "lead.owner=senior_team" },
        { testType: "POSITIVE", description: "Medium score referral lead", inputData: { lead: { score: 60, source: "referral" } }, expectedDecision: "PROCEED", expectedOutcome: "lead.owner=mid_team" },
        { testType: "NEGATIVE", description: "Low score lead", inputData: { lead: { score: 30, source: "ads" } }, expectedDecision: "REJECT", expectedOutcome: "lead.priority=LOW" },
        { testType: "BOUNDARY", description: "Score exactly at threshold", inputData: { lead: { score: 50, source: "ads" } }, expectedDecision: "REJECT", expectedOutcome: "lead.priority=LOW" },
        { testType: "EXCEPTION", description: "Missing lead source", inputData: { lead: { score: 80 } }, expectedDecision: "REJECT", expectedOutcome: "rejected - missing source" },
        { testType: "REGRESSION", description: "Repeated high-score referral lead", inputData: { lead: { score: 90, source: "referral" } }, expectedDecision: "PROCEED", expectedOutcome: "lead.owner=senior_team" },
      ],
    },
    "Invoice Reconciliation Contract": {
      rules: [{ field: "payment.matchesInvoice", operator: "EQUALS", value: "true" }],
      scenarios: [
        { testType: "POSITIVE", description: "Payment matches open invoice", inputData: { payment: { matchesInvoice: "true", amount: 500 } }, expectedDecision: "PROCEED", expectedOutcome: "invoice.status=PAID" },
        { testType: "NEGATIVE", description: "Unmatched payment, zero amount", inputData: { payment: { matchesInvoice: "false", amount: 0 } }, expectedDecision: "REJECT", expectedOutcome: "rejected - invalid payment" },
        { testType: "BOUNDARY", description: "Unmatched payment, nonzero amount", inputData: { payment: { matchesInvoice: "false", amount: 150 } }, expectedDecision: "REJECT", expectedOutcome: "invoice.status=PARTIAL" },
        { testType: "EXCEPTION", description: "Missing payment data entirely", inputData: {}, expectedDecision: "REJECT", expectedOutcome: "rejected - invalid payment" },
        { testType: "REGRESSION", description: "Duplicate matched payment webhook", inputData: { payment: { matchesInvoice: "true", amount: 500 } }, expectedDecision: "PROCEED", expectedOutcome: "invoice.status=PAID" },
        { testType: "NEGATIVE", description: "Matched flag true but zero amount", inputData: { payment: { matchesInvoice: "true", amount: 0 } }, expectedDecision: "PROCEED", expectedOutcome: "invoice.status=PAID" },
      ],
    },
    "Support Ticket Escalation Contract": {
      rules: [
        { field: "ticket.priority", operator: "IS_NOT_EMPTY" },
        { field: "ticket.priority", operator: "NOT_EQUALS", value: "LOW" },
      ],
      scenarios: [
        { testType: "POSITIVE", description: "Critical priority ticket", inputData: { ticket: { priority: "CRITICAL" } }, expectedDecision: "PROCEED", expectedOutcome: "ticket.assignedTeam=oncall" },
        { testType: "POSITIVE", description: "High priority ticket", inputData: { ticket: { priority: "HIGH" } }, expectedDecision: "PROCEED", expectedOutcome: "ticket.assignedTeam=senior_support" },
        { testType: "NEGATIVE", description: "Low priority ticket", inputData: { ticket: { priority: "LOW" } }, expectedDecision: "REJECT", expectedOutcome: "ticket.assignedTeam=standard_queue" },
        { testType: "BOUNDARY", description: "Medium priority ticket", inputData: { ticket: { priority: "MEDIUM" } }, expectedDecision: "PROCEED", expectedOutcome: "ticket.assignedTeam=standard_queue" },
        { testType: "EXCEPTION", description: "Missing ticket priority", inputData: { ticket: {} }, expectedDecision: "REJECT", expectedOutcome: "rejected - missing priority" },
        { testType: "REGRESSION", description: "Repeated critical ticket breach", inputData: { ticket: { priority: "CRITICAL" } }, expectedDecision: "PROCEED", expectedOutcome: "ticket.assignedTeam=oncall" },
      ],
    },
    "Employee Onboarding Provisioning Contract": {
      rules: [{ field: "employee.department", operator: "IS_NOT_EMPTY" }],
      scenarios: [
        { testType: "POSITIVE", description: "New engineering hire", inputData: { employee: { department: "Engineering" } }, expectedDecision: "PROCEED", expectedOutcome: "employee.accountsProvisioned=true" },
        { testType: "POSITIVE", description: "Remote sales hire", inputData: { employee: { department: "Sales", remote: "true" } }, expectedDecision: "PROCEED", expectedOutcome: "employee.equipmentShipped=true" },
        { testType: "POSITIVE", description: "Office-based sales hire", inputData: { employee: { department: "Sales", remote: "false" } }, expectedDecision: "PROCEED", expectedOutcome: "employee.equipment=office_kit" },
        { testType: "EXCEPTION", description: "Missing department entirely", inputData: { employee: {} }, expectedDecision: "REJECT", expectedOutcome: "rejected - missing department" },
        { testType: "BOUNDARY", description: "Department given as empty string", inputData: { employee: { department: "" } }, expectedDecision: "REJECT", expectedOutcome: "rejected - missing department" },
        { testType: "REGRESSION", description: "Repeated engineering hire record", inputData: { employee: { department: "Engineering" } }, expectedDecision: "PROCEED", expectedOutcome: "employee.accountsProvisioned=true" },
      ],
    },
  }

  for (const w of OTHER_WORKFLOWS) {
    const template = WORKFLOW_TEMPLATES.find((t) => t.name === w.name)
    const workflow = await prisma.workflow.create({
      data: {
        name: w.name,
        domain: w.domain,
        description: w.description,
        status: Math.random() > 0.2 ? "PUBLISHED" : "DRAFT",
        versions: { create: [{ versionNum: 1, graph: j(template?.graph ?? genericGraph), isPublished: true }] },
      },
      include: { versions: true },
    })

    const contractName = `${w.name} Contract`
    const templateData = TEMPLATE_RULES_AND_SCENARIOS[contractName]

    const contract = await prisma.businessContract.create({
      data: {
        name: contractName,
        businessObjective: `Ensure ${w.name.toLowerCase()} completes correctly and the business outcome is verified, not just the technical call.`,
        domain: w.domain,
        ownerId: ba.id,
        workflowId: workflow.id,
        trigger: `${w.name} trigger event`,
        preconditions: j(["Required fields present", "Source record is valid"]),
        expectedOutcomes: j(["Destination state reflects intended change"]),
        prohibitedOutcomes: j(["Duplicate side effects", "Partial state changes"]),
        exceptions: j(["Idempotent replays are treated as no-ops"]),
        acceptanceCriteria: j([`Given a valid trigger, when ${w.name} executes, then the destination state matches expectation.`]),
        kpis: j(["Verified Business Outcome Rate"]),
        verificationMethod: "Post-execution state check",
        status: ["DRAFT", "UNDER_REVIEW", "APPROVED", "ACTIVE"][Math.floor(Math.random() * 4)],
        businessRules: {
          create: templateData
            ? templateData.rules.map((r, i) => ({ field: r.field, operator: r.operator, value: r.value, logicGroup: "AND", order: i }))
            : [{ field: "status", operator: "EQUALS", value: "VALID", logicGroup: "AND", order: 0 }],
        },
      },
    })

    if (templateData) {
      for (const s of templateData.scenarios) {
        await prisma.testScenario.create({
          data: {
            contractId: contract.id,
            workflowId: workflow.id,
            createdById: ba.id,
            testType: s.testType,
            description: s.description,
            inputData: j(s.inputData),
            preconditions: j([]),
            expectedDecision: s.expectedDecision,
            expectedOutcome: s.expectedOutcome,
            prohibitedActions: j(["duplicate side effect"]),
          },
        })
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const types = ["POSITIVE", "NEGATIVE", "BOUNDARY", "EXCEPTION", "REGRESSION"]
        await prisma.testScenario.create({
          data: {
            contractId: contract.id,
            workflowId: workflow.id,
            createdById: ba.id,
            testType: types[i % types.length],
            description: `${types[i % types.length]} case ${i + 1} for ${w.name}`,
            inputData: j({ seed: i }),
            preconditions: j([]),
            expectedDecision: i % 3 === 0 ? "REJECT" : "PROCEED",
            expectedOutcome: "destination state matches",
            prohibitedActions: j(["duplicate side effect"]),
          },
        })
      }
    }

    allWorkflows.push({ workflow, version: workflow.versions[0], contract })
  }

  // ---------- Executions, test runs, outcome verifications ----------
  for (const { workflow, version, contract } of allWorkflows) {
    const scenarios = await prisma.testScenario.findMany({ where: { contractId: contract.id } })

    const testRun = await prisma.testRun.create({
      data: { workflowVersionId: version.id, totalScenarios: scenarios.length, passedCount: 0, failedCount: 0 },
    })

    let passed = 0
    for (const scenario of scenarios) {
      const isPass = Math.random() > 0.15
      if (isPass) passed++
      await prisma.testRunResult.create({
        data: {
          testRunId: testRun.id,
          scenarioId: scenario.id,
          status: isPass ? "PASSED" : "FAILED",
          actualDecision: scenario.expectedDecision,
          actualOutcome: isPass ? scenario.expectedOutcome : "mismatch",
          executionTrace: j([{ node: "trigger-1", status: "SUCCESS" }, { node: "verify-1", status: isPass ? "SUCCESS" : "FAILED" }]),
        },
      })
    }
    await prisma.testRun.update({ where: { id: testRun.id }, data: { passedCount: passed, failedCount: scenarios.length - passed } })

    const executionCount = 4 + Math.floor(Math.random() * 6)
    for (let i = 0; i < executionCount; i++) {
      const technicalSuccess = Math.random() > 0.08
      const outcomeVerified = technicalSuccess && Math.random() > 0.1
      const startedAt = randomPastDate(30)

      const execution = await prisma.executionRecord.create({
        data: {
          workflowId: workflow.id,
          workflowVersionId: version.id,
          trigger: "demo-trigger",
          startedAt,
          completedAt: new Date(startedAt.getTime() + 1200),
          technicalStatus: technicalSuccess ? "SUCCESS" : "FAILED",
          businessOutcomeStatus: technicalSuccess ? (outcomeVerified ? "VERIFIED" : "MISMATCH") : "UNABLE_TO_VERIFY",
          errorCategory: technicalSuccess ? null : ["TIMEOUT", "VALIDATION_ERROR", "DOWNSTREAM_ERROR"][Math.floor(Math.random() * 3)],
          inputSnapshot: j({ demo: true, index: i }),
          outputSnapshot: technicalSuccess ? j({ result: "ok" }) : null,
        },
      })

      await prisma.nodeExecutionTrace.createMany({
        data: [
          { executionId: execution.id, nodeId: "trigger-1", nodeType: "trigger", nodeName: "Trigger", status: "SUCCESS", input: j({}), output: j({}), order: 0 },
          { executionId: execution.id, nodeId: "action-1", nodeType: "mockApiAction", nodeName: "Execute Action", status: technicalSuccess ? "SUCCESS" : "FAILED", input: j({}), output: technicalSuccess ? j({ ok: true }) : null, errorMessage: technicalSuccess ? null : "Mock downstream error", order: 1 },
          { executionId: execution.id, nodeId: "verify-1", nodeType: "verifyOutcome", nodeName: "Verify Outcome", status: outcomeVerified ? "SUCCESS" : "FAILED", input: j({}), output: j({ verified: outcomeVerified }), order: 2 },
        ],
      })

      await prisma.outcomeVerification.create({
        data: {
          executionId: execution.id,
          contractId: contract.id,
          expectedState: j({ status: "ACTIVE_OR_EXPECTED" }),
          observedState: j({ status: outcomeVerified ? "ACTIVE_OR_EXPECTED" : "UNEXPECTED" }),
          status: technicalSuccess ? (outcomeVerified ? "VERIFIED" : "MISMATCH") : "UNABLE_TO_VERIFY",
          mismatchReason: outcomeVerified ? null : "Destination state did not match expected contract outcome.",
          evidence: j({ executionId: execution.id }),
          resolutionStatus: outcomeVerified ? "RESOLVED" : "OPEN",
          ownerId: ba.id,
          verifiedAt: execution.startedAt,
        },
      })
    }
  }

  // ---------- Change Impact Lab demo: a v2 for flagship workflow ----------
  const flagshipGraphV2 = JSON.parse(j(flagshipGraphV1))
  flagshipGraphV2.nodes.push({
    id: "cond-3",
    type: "condition",
    position: { x: 620, y: 220 },
    data: { name: "Amount > 0?", config: { field: "payment.amount", operator: "GREATER_THAN", value: "0" } },
  })

  const flagshipV2 = await prisma.workflowVersion.create({
    data: { workflowId: flagshipWorkflow.id, versionNum: 2, graph: j(flagshipGraphV2), isPublished: false },
  })

  await prisma.changeSimulation.create({
    data: {
      workflowId: flagshipWorkflow.id,
      baselineVersionId: flagshipV1.id,
      proposedVersionId: flagshipV2.id,
      totalScenarios: flagshipScenarios.length,
      unchangedCount: 8,
      improvedCount: 1,
      regressedCount: 0,
      newlyViolatedCount: 0,
      resultDetail: j([
        { scenario: "Incorrect payment amount", baselineDecision: "ACTIVATE", proposedDecision: "REJECT", change: "IMPROVED" },
        { scenario: "Valid successful payment", baselineDecision: "ACTIVATE", proposedDecision: "ACTIVATE", change: "UNCHANGED" },
      ]),
    },
  })

  const approval = await prisma.approvalDecision.create({
    data: {
      workflowId: flagshipWorkflow.id,
      workflowVersionId: flagshipV2.id,
      contractId: flagshipContract.id,
      requesterId: dev.id,
      reviewerId: approver.id,
      status: "SUBMITTED",
      testSummary: j({ passedCount: 9, failedCount: 1, totalScenarios: flagshipScenarios.length }),
      comments: "Adds zero-amount payment guard rail based on Change Impact Lab results.",
    },
  })

  await prisma.auditEvent.create({
    data: { entityType: "ApprovalDecision", entityId: approval.id, action: "SUBMITTED", actorId: dev.id },
  })

  console.log("Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
